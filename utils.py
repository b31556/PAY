from models import Transaction


def make_transaction_title(tx: Transaction) -> str:
    if tx.receiver.account_type == "business":
        return f"{tx.receiver.full_name} via {tx.completed_via}"
    if tx.receiver:
        return f"{tx.sender.full_name} to {tx.receiver.full_name}, in bank transaction"
    elif tx.receiver_account:
        return f"{tx.sender.full_name} to {tx.receiver_account.holder_name}, in bank transaction"
    else:
        return f"{tx.sender.full_name} to unknown recipient"
