import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Date
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import BigInteger

Base = declarative_base()

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    transaction_secret = Column(String(255), nullable=False)
    transaction_code = Column(String(255), unique=True, nullable=False)
    amount = Column(Integer, nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    sender_card_id = Column(Integer, ForeignKey('cards.id'), nullable=True)
    sender_account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    receiver_account_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    state = Column(String(50), nullable=False, default="created")
    watch_code = Column(String(255), nullable=True)
    completed_via = Column(String(50), nullable=True)  # "link" "qrcode" "manual" "pos" "atm"
    memo = Column(String(255), nullable=True)

    sender = relationship("User", back_populates="sells", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="buys", foreign_keys=[receiver_id])
    sender_account = relationship("Account", back_populates="sells", foreign_keys=[sender_account_id])
    receiver_account = relationship("Account", back_populates="buys", foreign_keys=[receiver_account_id])

    def __repr__(self):
        return f"<Transaction(amount='{self.amount}', sender='{self.sender}')>"

class InterBankTransaction(Base):
    __tablename__ = 'inter_bank_transactions'
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, nullable=False)
    transaction_direction = Column(String(50), nullable=False)  # "inbound" or "outbound"
    amount = Column(Integer, nullable=False)
    exchange_bank_name = Column(String(255), nullable=False)
    exchange_bank_code = Column(String(50), nullable=False)
    # TODO: Add relationships for exchange_bank, implement

    def __repr__(self):
        return f"<InterBankTransaction(amount='{self.amount}', exchange_bank_name='{self.exchange_bank_name}')>"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # "individual" or "business"

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    user_srps = relationship("UserSrp", back_populates="user", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    access_tokens = relationship("AccessToken", back_populates="user", cascade="all, delete-orphan")
    sells = relationship("Transaction", back_populates="sender", foreign_keys='Transaction.sender_id', cascade="all, delete-orphan")
    buys = relationship("Transaction", back_populates="receiver", foreign_keys='Transaction.receiver_id', cascade="all, delete-orphan")
    otp_secrets = relationship("OtpSecret", back_populates="user", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(username='{self.username}')>"

class Account(Base):
    __tablename__ = 'accounts'
    id = Column(Integer, primary_key=True)
    uuid = Column(String(255), unique=True, nullable=False, default=str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    balance = Column(Integer, nullable=False, default=0)
    holder_name = Column(String(255), nullable=False)
    bank_account_number = Column(String(255), unique=True, nullable=False)
    iban = Column(String(255), unique=True, nullable=False)
    currency = Column(String(50), nullable=False)
    account_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False)
    memo = Column(Text, nullable=True)
    last_balances = Column(Text, nullable=True)

    cards = relationship("Card", back_populates="account", cascade="all, delete-orphan")
    user = relationship("User", back_populates="accounts")
    sells = relationship("Transaction", back_populates="sender_account", foreign_keys='Transaction.sender_account_id', cascade="all, delete-orphan")
    buys = relationship("Transaction", back_populates="receiver_account", foreign_keys='Transaction.receiver_account_id', cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="bank_account", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = 'cards'
    id = Column(Integer, primary_key=True)
    uuid = Column(String(255), unique=True, nullable=False, default=str(uuid.uuid4()))
    card_number = Column(String(255), unique=True, nullable=False)
    card_holder = Column(String(255), nullable=False)
    expiration_date = Column(Date, nullable=False)
    ccv = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    card_type = Column(String(50), nullable=False)
    pincode = Column(String(50), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False)

    account = relationship("Account", back_populates="cards")
    user = relationship("User", back_populates="cards")

class Contact(Base):
    __tablename__ = 'contacts'
    id = Column(Integer, primary_key=True)
    uuid = Column(String(255), unique=True, nullable=False, default=str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    bank_account_number = Column(String(255), nullable=False)
    bank_account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="contacts")
    bank_account = relationship("Account", back_populates="contacts")

# ----

class AccessToken(Base):
    __tablename__ = 'access_tokens'
    id = Column(Integer, primary_key=True)
    type = Column(String(50), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    sigkey = relationship("SigKey", back_populates="session", uselist=False, cascade="all, delete-orphan")
    user = relationship("User", back_populates="access_tokens")

class OtpSecret(Base):
    __tablename__ = 'otp_secrets'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    secret = Column(String(255), unique=True, nullable=False)

    user = relationship("User", back_populates="otp_secrets")

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(Integer, primary_key=True)
    session_id = Column(String(255), unique=True, nullable=False)
    token = Column(String(255), unique=True, nullable=True)
    b = Column(Text, nullable=False)
    B_capital = Column(Text, nullable=False)
    username = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    state = Column(String(50), nullable=False, default="created")
    K = Column(Text, nullable=True)
    tunnel_key = Column(Text, nullable=True)
    server_enc_private = Column(Text, nullable=True)
    server_enc_public = Column(Text, nullable=True)
    server_sign_private = Column(Text, nullable=True)
    server_sign_public = Column(Text, nullable=True)
    client_enc_public = Column(Text, nullable=True)
    client_sign_public = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<Session(session_id='{self.session_id}', username='{self.username}')>"

class UserSrp(Base):
    __tablename__ = 'user_srps'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    salt = Column(String(255), nullable=False)
    v = Column(String(255), nullable=False)

    user = relationship("User", back_populates="user_srps")

class SigKey(Base):
    __tablename__ = 'sig_keys'
    id = Column(Integer, primary_key=True)
    public_key = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    session_id = Column(Integer, ForeignKey('access_tokens.id'), nullable=False)

    session = relationship("AccessToken", back_populates="sigkey")
