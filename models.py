from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import BigInteger

Base = declarative_base()

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True)
    created_at = Column(String, nullable=False)
    completed_at = Column(String, nullable=True)
    transaction_secret = Column(String, nullable=False)
    transaction_code = Column(String, unique=True, nullable=False)
    amount = Column(Integer, nullable=False)
    merchant_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    merchant_card_id = Column(Integer, ForeignKey('cards.id'), nullable=False)
    consumer_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    consumer_card_id = Column(Integer, ForeignKey('cards.id'), nullable=True)
    state = Column(String, nullable=False, default="created")
    watch_code = Column(String, nullable=False)

    merchant = relationship("User", back_populates="sells", foreign_keys=[merchant_id])
    consumer = relationship("User", back_populates="buys", foreign_keys=[consumer_id])
    merchant_card = relationship("Card", back_populates="sells", foreign_keys=[merchant_card_id])
    consumer_card = relationship("Card", back_populates="buys", foreign_keys=[consumer_card_id])

    def __repr__(self):
        return f"<Transaction(amount='{self.amount}', merchant='{self.merchant}')>"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    user_srps = relationship("UserSrp", back_populates="user", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    access_tokens = relationship("AccessToken", back_populates="user", cascade="all, delete-orphan")
    sells = relationship("Transaction", back_populates="merchant", foreign_keys='Transaction.merchant_id', cascade="all, delete-orphan")
    buys = relationship("Transaction", back_populates="consumer", foreign_keys='Transaction.consumer_id', cascade="all, delete-orphan")
    otp_secrets = relationship("OtpSecret", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(username='{self.username}')>"

class Card(Base):
    __tablename__ = 'cards'
    id = Column(Integer, primary_key=True)
    card_number = Column(String, unique=True, nullable=False)
    card_holder = Column(String, nullable=False)
    expiration_date = Column(String, nullable=False)
    ccv = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    card_type = Column(String, nullable=False)
    pincode = Column(String, nullable=False)

    user = relationship("User", back_populates="cards")
    sells = relationship("Transaction", back_populates="merchant_card", foreign_keys='Transaction.merchant_card_id')
    buys = relationship("Transaction", back_populates="consumer_card", foreign_keys='Transaction.consumer_card_id')

# ----

class AccessToken(Base):
    __tablename__ = 'access_tokens'
    id = Column(Integer, primary_key=True)
    type = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    sigkey= relationship("SigKey", back_populates="session", uselist=False, cascade="all, delete-orphan")
    user = relationship("User", back_populates="access_tokens")

class OtpSecret(Base):
    __tablename__ = 'otp_secrets'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    secret = Column(String, unique=True, nullable=False)

    user = relationship("User", back_populates="otp_secrets")

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(Integer, primary_key=True)
    session_id = Column(String, unique=True, nullable=False)
    b = Column(Text, nullable=False)
    B_capital = Column(Text, nullable=False)
    username = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False)
    expires_at = Column(Text, nullable=False)
    updated_at = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    state = Column(Text, nullable=False, default="created")
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
    salt = Column(String, nullable=False)
    v = Column(String, nullable=False)

    user = relationship("User", back_populates="user_srps")

class SigKey(Base):
    __tablename__ = 'sig_keys'
    id = Column(Integer, primary_key=True)
    public_key = Column(String, unique=True, nullable=False)
    created_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    session_id = Column(Integer, ForeignKey('access_tokens.id'), nullable=False)

    session = relationship("AccessToken", back_populates="sigkey")