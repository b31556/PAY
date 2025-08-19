import json
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
import fastapi.staticfiles
from typing import Dict
import os
import uuid
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, constr
import fastapi
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.encoders import jsonable_encoder
from requests_cache import datetime
import auth
import core
from database import get_db_session
from models import Account, User, Transaction, Card, AccessToken, OtpSecret, Session
from config import URL, PORT, DATABASE, SESSION_TIMEOUT, STEP1_TIMEOUT

from encrpt import process_response, process_request, RequestContext
from utils import make_transaction_title

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
            "kamet_this_year": "0%" #TODO: Implement kamet calculation
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
            ctx.db_session, user, amount, from_account_uuid, to_account_uuid, to_account_number, transaction_type, memo
        )
    elif transaction_type == "between_accounts":
        tx = core.start_transaction(
            ctx.db_session, user, amount, from_account_uuid, to_account_uuid, to_account_number, transaction_type, memo
        )
    elif transaction_type == "external":
        raise HTTPException(status_code=400, detail="External transactions are not supported yet")
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