from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

from models import Base, User, Transaction, Card, AccessToken, OtpSecret

from config import DATABASE

engine = create_engine(DATABASE, echo=True)
Session = sessionmaker(bind=engine)
session = Session()

Base.metadata.create_all(engine)