from datetime import datetime
import os
from models import Transaction, Account
import base64
import qrcode
from config import FRONTEND_URL,CONTACTS_ADD_PAGE

METHOD_DISPLAY = {
    "pos": "POS",
    "manual": "Wire transfer",
    "qr_code": "QR code",
    "link": "Payment link",
    # add more if needed
}

def make_transaction_title(tx: Transaction) -> str:
    """
    Generate a realistic bank-style transaction title:
    - Business recipients show merchant name + method
    - Individuals show sender to receiver + method (pretty named)
    """

    sender = tx.sender
    for contact in sender.contacts:
        # If the receiver account is in sender's contacts, use contact name
        if contact.bank_account_id == tx.receiver_account_id:
            receiver = contact.name
            return f"Transfer to {receiver}"
        
    receiver = getattr(tx, 'receiver', None)

    receiver_account = getattr(tx, 'receiver_account', None)
    method_key = (tx.completed_via or "").lower()

    method_display = METHOD_DISPLAY.get(method_key, tx.completed_via)

    if sender == receiver:
        # If sender and receiver are the same, it's a self-transfer
        return f"Transfer to self: {tx.sender_account.bank_account_number} to {tx.receiver_account.bank_account_number}"

    # Determine receiver info
    if receiver:
        receiver_name = receiver.full_name
        receiver_is_business = (getattr(receiver, "account_type", "").lower() == "business")
    elif receiver_account:
        receiver_name = receiver_account.holder_name
        receiver_is_business = False
    else:
        receiver_name = None
        receiver_is_business = False

    sender_name = sender.full_name

    if receiver_name is None:
        return f"{sender_name} to unknown recipient"

    if receiver_is_business:
        # Business: Merchant name + method if exists
        if method_display:
            return f"{receiver_name} via {method_display}"
        else:
            return receiver_name

    # Individual to individual or account
    if method_display:
        return f"{sender_name} to {receiver_name} via {method_display}"
    else:
        return f"{sender_name} to {receiver_name}"
    


def generate_transaction_code() -> str:
    """
    Generate a unique transaction code for the given transaction.
    """
    return f"TX-IUT-{datetime.now().strftime('%Y%m%d%H%M%S')}{datetime.now().microsecond}-{os.urandom(12).hex().upper()}"


def generate_transaction_secret() -> str:
    """
    Generate a unique transaction secret for the given transaction.
    """
    return f"{os.urandom(36).hex().upper()}"


def generate_contact_qr(bank_account: Account, name: str, email: str) -> str:
    """
    Generate a QR code for the given bank account.
    """
    data = f"{FRONTEND_URL}{CONTACTS_ADD_PAGE}?bak={bank_account.bank_account_number}&name={name}&email={email}"
    return generate_qr_code(data)


def generate_qr_code(data: str):
    """
    Generate a QR code for the given data.
    """
    qr_code = qrcode.make(data)
    return qr_code
