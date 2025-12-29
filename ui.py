import json
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
import fastapi.staticfiles
from typing import Dict
import os
import uuid
from io import BytesIO
import base64
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, constr
import fastapi
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.encoders import jsonable_encoder
from datetime import datetime
from sqlalchemy import func
import auth
import core
from database import get_db_session
from models import Account, Contact, User, Transaction, Card, AccessToken, OtpSecret, Session
from config import URL, PORT, DATABASE, SESSION_TIMEOUT, STEP1_TIMEOUT

from encrpt import process_response, process_request, RequestContext
from utils import make_transaction_title, generate_contact_qr


app = APIRouter()

templates = Jinja2Templates(directory="templates")
app.mount("/static", fastapi.staticfiles.StaticFiles(directory="static"), name="static")

@app.get("/")
async def index():
    return JSONResponse(content={"health": "ok"})


@app.get("/health")
async def health_check():
    return JSONResponse(content={"health": "ok"})


@app.post("/me")
def get_me(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse(content={"username": user.username, "email": user.email, "full_name": user.full_name})


@app.post("/balances")
def get_balances(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    response = {"total": 0, "accounts": [], "recent_transactions": [], "percent_compared_to_last_month": 0}
    accounts = user.accounts
    total=0
    for account in accounts:
        total += account.balance
        response["accounts"].append({
            "bank_account_number": account.bank_account_number,
            "holder_name": account.holder_name,
            "balance": account.balance,
            "currency": account.currency,
            "account_type": account.account_type,
            "memo": account.memo
        })

    
    recent_incomes = ctx.db_session.query(Transaction).filter_by(receiver_id=user.id).order_by(Transaction.created_at.desc()).limit(10).all()
    recent_spendings = ctx.db_session.query(Transaction).filter_by(sender_id=user.id).order_by(Transaction.created_at.desc()).limit(10).all()
    
    
    recent = recent_incomes + recent_spendings
    recent.sort(key=lambda x: x.created_at, reverse=True)
    recent = recent[:10]
    for tx in recent:
        if not tx:
            continue
        if tx.state == "completed":
            response["recent_transactions"].append({
                "type": "income" if tx in recent_incomes else "spending",
                "amount": tx.amount,
                "created_at": str(tx.created_at),
                "title": make_transaction_title(tx),
            })
            if tx in recent_spendings and tx in recent_incomes:
                recent_spendings[recent_spendings.index(tx)] = None
                recent_incomes[recent_incomes.index(tx)] = None

    try:
        last_month_balances = [json.loads(x.last_balances)[-1] for x in user.accounts if len(json.loads(x.last_balances)) > 1]
    except:
        last_month_balances = [0] * len(user.accounts)

    response["total"] = total
    response["percent_compared_to_last_month"] = (sum(x.balance for x in user.accounts) - sum(last_month_balances)) / sum(last_month_balances) * 100 if sum(last_month_balances) != 0 else 0
    return JSONResponse(content=response)


@app.post("/accounts")
def get_accounts(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    accounts = user.accounts
    response = {"accounts": [], "cards": []}
    for account in accounts:
        response["accounts"].append({
            "uuid": account.uuid,
            "bank_account_number": account.bank_account_number,
            "holder_name": account.holder_name,
            "balance": account.balance,
            "currency": account.currency,
            "account_type": account.account_type,
            "available_balance": account.balance, #TODO: Implement available balance calculation for credit accounts
            "thm": "0%", #TODO: Implement THM calculation
            "fillup_timeline": str(datetime.now().isoformat()), #TODO: Implement fillup timeline calculation
            "kamat": "0%", #TODO: Implement kamat calculation
            "kamet_this_year": "0%", #TODO: Implement kamet calculation,
            "memo": account.memo
        })

    cards = user.cards
    for card in cards:
        response["cards"].append({
            "uuid": card.uuid,
            "card_number": f"**** **** **** {card.card_number[-4:]}",  # Mask all but last 4 digits
            "card_holder": card.card_holder,
            "expiration_date": card.expiration_date.strftime("%Y/%m"),
            "cvv": card.ccv,
            "card_type": card.card_type,
            "account_uuid": card.account.uuid,
            "is_locked": True if card.status == "locked" else False
        })

    return JSONResponse(content=response)



@app.post("/create-account")
def create_account(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    account_data = ctx.data
    new_account = core.request_bank_account(ctx.db_session, user, account_data["account_type"], account_data["account_title"])

    return JSONResponse(content=new_account)


@app.post("/toggle-card-lock")
def toggle_card_lock(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card_data = ctx.data
    card = ctx.db_session.query(Card).filter_by(uuid=card_data["card_uuid"], user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card.status = "unlocked" if card.status == "locked" else "locked"
    ctx.db_session.commit()

    return JSONResponse(content={"message": "Card lock status updated successfully", "card_uuid": card.uuid, "new_status": card.status})


@app.post("/set-card-settings")
def set_card_settings(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card_data = ctx.data
    card = ctx.db_session.query(Card).filter_by(uuid=card_data["card_uuid"], user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card_data = card_data.get("settings", {})
    connected_account_uuid = card_data.get("connected_account_uuid")
    if connected_account_uuid:
        connected_account = ctx.db_session.query(Account).filter_by(uuid=connected_account_uuid, user_id=user.id).first()
        if connected_account:
            card.account_id = connected_account.id
        else:
            raise HTTPException(status_code=404, detail="Connected account not found")
    
    pincode = card_data.get("pincode")
    if pincode:
        card.pincode = pincode
    
    ctx.db_session.commit()

    return JSONResponse(content={"message": "Card settings updated successfully", "card_uuid": card.uuid})


@app.post("/make-card")
def make_card(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card_data = ctx.data
    pincode = card_data.get("pincode")
    connected_account_uuid = card_data.get("connected_account_uuid")

    new_card = core.request_bank_card(ctx.db_session, user, pincode, connected_account_uuid)

    return JSONResponse(content={"message": "Card created successfully"})



@app.post("/reveal-full-card-number")
def reveal_full_card_number(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card_data = ctx.data
    card = ctx.db_session.query(Card).filter_by(uuid=card_data["card_uuid"], user_id=user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    formatted = " ".join(card.card_number[i:i+4] for i in range(0, len(card.card_number), 4))

    return JSONResponse(content={"full_card_number": formatted})


@app.post("/start-transaction")
def start_transaction(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    transaction_data = ctx.data
    transaction_type = transaction_data.get("transfer_type") # wire or between_accounts or external
    amount = transaction_data.get("amount")
    from_account_uuid = transaction_data.get("from_account")
    to_account_uuid = transaction_data.get("to_account") # optional
    to_account_number = transaction_data.get("to_account_number") # optional
    memo = transaction_data.get("memo") # optional

    if transaction_type == "wire":
        tx = core.start_transaction(
            ctx.db_session, user, amount, from_account_uuid, transaction_type, memo, to_account_number=to_account_number
        )
    elif transaction_type == "between_accounts":
        tx = core.start_transaction(
            ctx.db_session, user, amount, from_account_uuid, transaction_type, memo, to_account_uuid=to_account_uuid
        )
    elif transaction_type == "external":
        raise HTTPException(status_code=400, detail="External transactions are not supported yet")

    elif transaction_type == "to_contact":
        to_contact_uuid = transaction_data.get("to_contact_uuid")
        if not to_contact_uuid:
            raise HTTPException(status_code=400, detail="to_contact_uuid is required for to_contact transactions")
        tx = core.start_transaction(
            ctx.db_session, user, amount, from_account_uuid, transaction_type, memo, to_contact_uuid=to_contact_uuid
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")
    
    from_account = tx.sender_account
    to_account = tx.receiver_account
    amount = tx.amount
    memo = tx.memo
    transfer_type = transaction_type                   

    return JSONResponse(content={"message": "Transaction created successfully", "transaction_id": tx.transaction_code, "from_account": from_account.uuid, "to_account": to_account.uuid, "amount": amount, "memo": memo, "transfer_type": transfer_type})



@app.post("/confirm-transaction")
def confirm_transaction(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    confirmation_data = ctx.data
    transaction_id = confirmation_data.get("transaction_id")
    confirmation_code = confirmation_data.get("confirmation_code")

    tx: Transaction = ctx.db_session.query(Transaction).filter_by(transaction_code=transaction_id, sender_id=user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.state != "created":
        raise HTTPException(status_code=400, detail="Transaction is not waiting for confirmation")

    if tx.sender_id == tx.receiver_id:
        pass  # between my accounts, no confirmation needed
    else:
        if not core.verify_confirmation_code(tx, confirmation_code):
            raise HTTPException(status_code=400, detail="Invalid confirmation code") 

    core.finalize_transaction(tx, ctx.db_session)
    ctx.db_session.commit()

    return JSONResponse(content={"message": "Completed the transaction successfully", "transaction_id": tx.transaction_code})


@app.post("/contacts/list")
def create_contact(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contacts = ctx.db_session.query(Contact).filter_by(user_id=user.id).all()
    contacts = [{"uuid": c.uuid, "name": c.name, "bank_account_number": c.bank_account_number, "email": c.email} for c in contacts]
    return JSONResponse(content={"contacts": contacts})


@app.post("/contacts/rm")
def remove_contact(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contact_data = ctx.data
    contact_uuid = contact_data.get("contact_uuid")
    if not contact_uuid:
        raise HTTPException(status_code=400, detail="Contact UUID is required")

    contact = ctx.db_session.query(Contact).filter_by(uuid=contact_uuid, user_id=user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    ctx.db_session.delete(contact)
    ctx.db_session.commit()

    return JSONResponse(content={"message": "Contact removed successfully"})


@app.post("/contacts/add")
def start_add_contact(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contact_data = ctx.data
    name = contact_data.get("name")
    bank_account_number = contact_data.get("bank_account_number")
    email = contact_data.get("email")

    if not name or not bank_account_number or not email:
        raise HTTPException(status_code=400, detail="Name, bank account number, and email are required")

    if ctx.db_session.query(Contact).filter_by(user_id=user.id, bank_account_number=bank_account_number).first():
        raise HTTPException(status_code=400, detail="Contact with this bank account number already exists")

    fba=ctx.db_session.query(Account).filter_by(bank_account_number=bank_account_number).first()
    if not fba:
        raise HTTPException(status_code=400, detail="Bank account not found")

    new_contact = Contact(
        user_id=user.id,
        uuid=str(uuid.uuid4()),
        name=name,
        bank_account_number=bank_account_number,
            bank_account_id=fba.id,
        email=email,
        created_at=datetime.now()
    )
    ctx.db_session.add(new_contact)
    ctx.db_session.commit()
    return JSONResponse(content={"message": "Contact added successfully", "contact_uuid": new_contact.uuid})


@app.post("/contacts/me/qrcode")
def get_my_qr_code(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")


    account = ctx.db_session.query(Account).filter_by(user_id=user.id, uuid=ctx.data.get("bank_account_uuid")).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    qr_code = generate_contact_qr(account, ctx.data.get("name"), ctx.data.get("email"))

    image_stream = BytesIO()
    qr_code.get_image().save(image_stream, format="PNG")
    image_stream.seek(0)
    image_data = image_stream.read()
    encoded_image = base64.b64encode(image_data).decode("utf-8")
    return JSONResponse(content={"qr_code": encoded_image})




@app.post("/transactions")
def create_transaction(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    page = ctx.data.get("page", 1)

    amount_transactions = ctx.db_session.query(Transaction.id).filter(
        (Transaction.sender_id == user.id) | (Transaction.receiver_id == user.id),
        Transaction.state == "completed"
    ).count()

    if page < 1 or (page - 1) * 20 >= amount_transactions:
        raise HTTPException(status_code=400, detail="Invalid page number")

    transactions = ctx.db_session.query(Transaction).filter(
        (Transaction.sender_id == user.id) | (Transaction.receiver_id == user.id),
        Transaction.state == "completed"
    ).order_by(Transaction.created_at.desc()).limit(20).offset((page - 1) * 20).all()

    this_month = datetime.now().month

    total_income = ctx.db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.receiver_id == user.id,
        Transaction.state == "completed",
        func.extract("month", Transaction.created_at) == this_month
    ).scalar()

    total_expenses = ctx.db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.sender_id == user.id,
        Transaction.state == "completed",
        func.extract("month", Transaction.created_at) == this_month
    ).scalar()
    total_income = float(total_income) if total_income else 0
    total_expenses = float(total_expenses) if total_expenses else 0
    response = {"total": amount_transactions, "transactions": [], "total_expenses": total_expenses, "total_income": total_income, "page": page, "per_page": 20, "total_pages": (amount_transactions + 19) // 20}
    for tx in transactions:
        if not tx:
            continue
        response["transactions"].append({
            "transaction_id": tx.transaction_code,
            "from_account": tx.sender_account.uuid if tx.sender_account else None,
            "to_account": tx.receiver_account.uuid if tx.receiver_account else None,
            "amount": tx.amount,
            "state": tx.state,
            "created_at": str(tx.created_at),
            "title": make_transaction_title(tx),
            "memo": tx.memo
        })

    return JSONResponse(content=response)


@app.post("/transactions/details")
def get_transaction_details(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    transaction_id = ctx.data.get("transaction_id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="Transaction ID is required")

    tx: Transaction = ctx.db_session.query(Transaction).filter_by(transaction_code=transaction_id).first()
    if not tx or (tx.sender_id != user.id and tx.receiver_id != user.id):
        raise HTTPException(status_code=404, detail="Transaction not found")

    response = {
        "transaction_id": tx.transaction_code,
        "from_account": tx.sender_account.uuid if tx.sender_account else None,
        "to_account": tx.receiver_account.uuid if tx.receiver_account else None,
        "amount": tx.amount,
        "state": tx.state,
        "created_at": str(tx.created_at),
        "title": make_transaction_title(tx),
        "memo": tx.memo,
        "completed_via": tx.completed_via
    }

    return JSONResponse(content=response)