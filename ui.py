import json
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
import fastapi.staticfiles
from typing import Dict
import os
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
    user: User = db_session.query(Session).filter_by(id=ctx.session_id).first().user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse(content={"username": user.username, "email": user.email, "full_name": user.full_name})


@app.post("/balances")
def get_balances(ctx: RequestContext = Depends(process_request)):
    user: User = db_session.query(Session).filter_by(id=ctx.session_id).first().user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    print(f"time taken: {datetime.now() - time_now}")
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

    time_now = datetime.now()
    recent_incomes = db_session.query(Transaction).filter_by(receiver_id=user.id).order_by(Transaction.created_at.desc()).limit(10).all()
    recent_spendings = db_session.query(Transaction).filter_by(sender_id=user.id).order_by(Transaction.created_at.desc()).limit(10).all()
    print(f"time taken: {datetime.now() - time_now}")
    time_now = datetime.now()
    recent = recent_incomes + recent_spendings
    recent.sort(key=lambda x: x.created_at, reverse=True)
    recent = recent[:10]
    for tx in recent:
        response["recent_transactions"].append({
            "type": "income" if tx in recent_incomes else "spending",
            "amount": tx.amount,
            "created_at": str(tx.created_at),
            "title": make_transaction_title(tx),
        })

    last_month_balances = [json.loads(x.last_balances)[-1] for x in user.accounts if len(json.loads(x.last_balances)) > 1]
    print(f"time taken: {datetime.now() - time_now}")
    response["total"] = total
    response["percent_compared_to_last_month"] = (sum(x.balance for x in user.accounts) - sum(last_month_balances)) / sum(last_month_balances) * 100 if sum(last_month_balances) != 0 else 0
    print(f"final time taken: {datetime.now() - final_time}")
    return JSONResponse(content=response)


@app.post("/accounts")
def get_accounts(ctx: RequestContext = Depends(process_request)):
    user: User = db_session.query(Session).filter_by(id=ctx.session_id).first().user
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
            "card_number": card.card_number,
            "card_holder": card.card_holder,
            "expiration_date": str(card.expiration_date),
            "cvv": card.ccv,
            "card_type": card.card_type,
            "account_uuid": card.account.uuid
        })

    return JSONResponse(content=response)



@app.post("/create-account")
def create_account(ctx: RequestContext = Depends(process_request)):
    user: User = ctx.session.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    account_data = ctx.data
    new_account = make_account(db_session, user, account_data["account_type"], account_data["account_title"])

    return JSONResponse(content={"message": "Account created successfully", "account": new_account.to_dict()})