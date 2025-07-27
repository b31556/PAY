from models import Transaction, User
from database import db_session
from sqlalchemy import func
import os
from fastapi import APIRouter
import datetime
from typing import Dict
from sqlalchemy.orm import Session


app = APIRouter()

@app.get("/balance/{user_id}")


def recalculate_balance(user_id: int):
    total = db_session.query(func.sum(Transaction.amount)).filter_by(user_id=user_id).scalar() or 0.0
    last_id = db_session.query(func.max(Transaction.id)).filter_by(user_id=user_id).scalar() or 0

    user_balance = db_session.query(UserBalance).filter_by(user_id=user_id).first()
    if not user_balance:
        user_balance = UserBalance(user_id=user_id)
        db_session.add(user_balance)

    user_balance.balance = total
    user_balance.last_transaction_id = last_id
    db_session.commit()



def make_transaction(amount: float, merchant: User):
    watch_code = os.urandom(16).hex()  # Generate a random watch code
    secret = os.urandom(32).hex()  # Generate a random transaction secret
    transaction_code = os.urandom(8).hex()

    transaction = Transaction(        
        amount=amount,
        merchant_id=merchant.id,
        state="created",
        watch_code=watch_code,
        transaction_secret=secret,
        transaction_code=transaction_code
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction
    