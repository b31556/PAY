from models import Transaction

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
    receiver = getattr(tx, 'receiver', None)
    receiver_account = getattr(tx, 'receiver_account', None)
    method_key = (tx.completed_via or "").lower()

    method_display = METHOD_DISPLAY.get(method_key, tx.completed_via)

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