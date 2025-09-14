from fastapi import HTTPException
from models import Account, Card, Contact, Transaction, User
import uuid as uuuid
from sqlalchemy import func
import os
import datetime
from typing import Dict
import random
import config
from utils import generate_transaction_code, generate_transaction_secret


def recalculate_balance(account_id, db_session):
    outgoing = db_session.query(func.sum(Transaction.amount)).filter(Transaction.sender_account_id == account_id).scalar() or 0.0
    incoming = db_session.query(func.sum(Transaction.amount)).filter(Transaction.receiver_account_id == account_id).scalar() or 0.0

    total = incoming - outgoing

    account = db_session.query(Account).filter_by(id=account_id).first()
    if account:
        account.balance = total
    db_session.commit()
    return total



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
    
def generate_iban():
    country_code = config.CC_CODE

    # HU IBAN: HUkk BBBB BBBB BBBB BBBB BBBB BBBB (28 chars total)
    # Bank code: 4 digits
    bank_code = config.BANK_CODE

    # Rest of account: 20 digits
    account_number = ''.join(str(random.randint(0, 9)) for _ in range(20))
    
    # Placeholder for check digits
    iban_no_check = country_code + "00" + bank_code + account_number
    
    # Move country code and check digits to the end for calculation
    rearranged = iban_no_check[4:] + iban_no_check[:4]
    
    # Replace letters with numbers (A=10, B=11, ..., Z=35)
    numeric_iban = ""
    for ch in rearranged:
        if ch.isalpha():
            numeric_iban += str(ord(ch.upper()) - 55)
        else:
            numeric_iban += ch
    
    # Calculate check digits
    check_digits = 98 - (int(numeric_iban) % 97)
    check_digits_str = str(check_digits).zfill(2)
    
    # Final IBAN
    iban = country_code + check_digits_str + bank_code + account_number
    return iban


def generate_bban():
    bank_branch = str(random.randint(10000000, 99999999))
    account_num = str(random.randint(10000000, 99999999))
    control = str(random.randint(0, 99)).zfill(2)
    return f"{bank_branch}-{account_num}-{control}"



def request_bank_account(db_session, user, account_type, account_title):

    num_accounts = db_session.query(Account).filter_by(user_id=user.id).count()

    if num_accounts <= 1:
        account = make_account(db_session, user, account_type, account_title)
    else:
        return {"message": "awaiting-approval", "code": 56}

    return {"message": "done", "code": 10}


def make_account(db_session, user, account_type, account_title):
    account_number = generate_bban()
    uuiid = str(uuuid.uuid4())
    iban = generate_iban()
    new_account = Account(
        uuid=uuiid,
        user_id=user.id,
        balance=0,
        holder_name=user.full_name,
        bank_account_number=account_number,
        iban=iban,
        account_type=account_type,
        memo=account_title,
        currency="HUF",  # Assuming Hungarian Forint as default
        created_at=datetime.datetime.now(),
        status="active",

    )
    db_session.add(new_account)
    db_session.commit()
    return new_account


def request_bank_card(db_session, user, pincode, connected_account_uuid):

    cards = db_session.query(Card).filter_by(user_id=user.id).all()
    if len(cards) >= 2:
        raise HTTPException(status_code=400, detail="Maximum card limit reached")

    ccv = str(random.randint(100, 999))
    account = db_session.query(Account).filter_by(uuid=connected_account_uuid, user_id=user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Connected account not found")
    card_holder = user.full_name
    card_number = str(random.randint(1000000000000000, 9999999999999999))  # 16-digit card number
    expiration_date = (datetime.datetime.now() + datetime.timedelta(days=config.BANK_CARD_EXPIRE_DAYS)).isoformat()
    card = Card(
        uuid=str(uuuid.uuid4()),
        card_number=card_number,
        card_holder=card_holder,
        expiration_date=expiration_date,
        user_id=user.id,
        pincode=pincode,
        account_id=account.id,
        card_type="debit",  # Assuming debit card, can be changed
        ccv=ccv,
        created_at=datetime.datetime.now(),
        status="active",
    )
    db_session.add(card)
    db_session.commit()
    return card




def start_transaction(db_session, user, amount, from_account_uuid, transaction_type, memo, to_account_uuid=None, to_account_number=None, to_contact_uuid=None):
    if transaction_type == "wire":
        from_account = db_session.query(Account).filter_by(uuid=from_account_uuid, user_id=user.id).first()
        if not from_account:
            raise HTTPException(status_code=404, detail="From account not found")

        to_account = db_session.query(Account).filter_by(bank_account_number=to_account_number).first()
        if not to_account:
            raise HTTPException(status_code=404, detail="Bank number not found")
        
        transaction_code = generate_transaction_code()
        transaction_secret = generate_transaction_secret()

        transaction = Transaction(
            sender_id=user.id,
            receiver_id=to_account.user_id,  # Assuming the receiver is the account holder
            sender_account_id=from_account.id,
            receiver_account_id=to_account.id,
            amount=amount,
            memo=memo,
            created_at=datetime.datetime.now(),
            state="created",
            transaction_code=transaction_code,
            transaction_secret=transaction_secret
        )
        db_session.add(transaction)
        db_session.commit()
        return transaction

    elif transaction_type == "between_accounts":
        from_account = db_session.query(Account).filter_by(uuid=from_account_uuid, user_id=user.id).first()
        if not from_account:
            raise HTTPException(status_code=404, detail="From account not found")

        to_account = db_session.query(Account).filter_by(uuid=to_account_uuid, user_id=user.id).first()
        if not to_account:
            raise HTTPException(status_code=404, detail="To account not found")

        transaction_code = generate_transaction_code()
        transaction_secret = generate_transaction_secret()

        transaction = Transaction(
            sender_id=user.id,
            receiver_id=user.id,  # Assuming self-transfer
            sender_account_id=from_account.id,
            receiver_account_id=to_account.id,
            amount=amount,
            memo=memo,
            created_at=datetime.datetime.now(),
            state="created",
            transaction_code=transaction_code,
            transaction_secret=transaction_secret
        )
        db_session.add(transaction)
        db_session.commit()
        return transaction
    elif transaction_type == "external":
        raise HTTPException(status_code=400, detail="External transactions are not supported yet")
    
    elif transaction_type == "to_contact":
        to_contact = db_session.query(Contact).filter_by(uuid=to_contact_uuid, user_id=user.id).first()
        if not to_contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        from_account = db_session.query(Account).filter_by(uuid=from_account_uuid, user_id=user.id).first()
        if not from_account:
            raise HTTPException(status_code=404, detail="From account not found")

        if to_contact.created_at > datetime.datetime.now() - datetime.timedelta(hours=config.NEW_CONTACT_WAIT_TIME):
            raise HTTPException(status_code=400, detail=f"You cannot send money to this contact yet wait {config.NEW_CONTACT_WAIT_TIME} hours after creation")

        transaction_code = generate_transaction_code()
        transaction_secret = generate_transaction_secret()

        transaction = Transaction(
            sender_id=user.id,
            receiver_id=to_contact.bank_account.user_id,
            sender_account_id=from_account.id,
            receiver_account_id=to_contact.bank_account.id,
            amount=amount,
            memo=memo,
            created_at=datetime.datetime.now(),
            state="created",
            transaction_code=transaction_code,
            transaction_secret=transaction_secret
        )
        db_session.add(transaction)
        db_session.commit()
        return transaction

def verify_confirmation_code(confirmation_code: str, transaction: Transaction | None = None) -> bool:
    return True #TODO: Implement confirmation code verification


def finalize_transaction(transaction: Transaction, db_session) -> Transaction:
    
    sender_account = transaction.sender_account
    receiver_account = transaction.receiver_account
    amount = transaction.amount

    if sender_account.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    if receiver_account.status != "active":
        raise HTTPException(status_code=400, detail="Receiver account is not active")
    
    if sender_account.status != "active":
        raise HTTPException(status_code=400, detail="Sender account is not active")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid transaction amount")
    
    if transaction.state != "created":
        raise HTTPException(status_code=400, detail="Transaction is not in created state")

    if amount > config.BIG_TRANSACTION_LIMIT:
        # we need to recalculate the balance
        said_balance = sender_account.balance
        real_balance = recalculate_balance(sender_account.id, db_session)

        if said_balance != real_balance:
            with open("manipulation.log", "a") as f:
                f.write(f"Balance manipulation detected for user {sender_account.user_id}, said: {said_balance}, real: {real_balance}\n")

        if said_balance != real_balance:
            with open("manipulation.log", "a") as f:
                f.write(f"Balance manipulation detected for user {sender_account.user_id}, said: {said_balance}, real: {real_balance}\n")
            raise HTTPException(status_code=400, detail="Balance manipulation detected, try again")

    sender_account.balance -= amount
    receiver_account.balance += amount
    transaction.completed_at = datetime.datetime.now()
    transaction.state = "completed"

    db_session.commit()
    return transaction
