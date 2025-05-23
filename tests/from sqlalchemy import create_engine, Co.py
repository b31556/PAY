from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
import random
import fastapi
from fastapi import FastAPI, Response, Request, status

app = FastAPI()

engine = create_engine('sqlite:///C:/Users/Dell/KÖZÖD/user2.db', echo=True)
Base = declarative_base()
Session = sessionmaker(bind=engine)
session = Session()

# User model  b
class User(Base):
    __tablename__ = 'cards'

    id = Column(Integer, primary_key=True)
    login = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    card = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    amaunt = Column(Integer, nullable=False, default=10)

    def __repr__(self):
        return f"<User(username='{self.login}')>"

on_goind_payments = {}

# Create tables
Base.metadata.create_all(engine)

@app.post("/pay/{merchant}/{amount}/{pincode}")
async def pay_with_pincode(merchant: str, amount: int, pincode: str, request: Request):
    idet = await request.body()
    idet = idet.decode("utf-8")

    if amount <= 0:
        return Response(content="Invalid amount", status_code=401)

    if idet not in on_goind_payments:
        return Response(content="Payment isnt in progress", status_code=401)

    amount2 = on_goind_payments[idet]["amount"]
    card = on_goind_payments[idet]["card"]
    merchant2 = on_goind_payments[idet]["merchant"]

    if amount2 != amount:
        return Response(content="Invalid amount", status_code=401)
    if merchant2 != merchant:
        return Response(content="Invalid merchant", status_code=401)

    user = session.query(User).filter_by(card=card).first()
    merchant_user = session.query(User).filter_by(login=merchant).first()

    if user:
        if user.pincode == pincode:
            if user.amaunt < amount:
                return Response(content="Insufficient funds", status_code=401)
            user.amaunt -= amount
            merchant_user.amaunt += amount
            session.commit()
            del on_goind_payments[idet]
            return Response(content="Payment successful", status_code=200)
        else:
            return Response(content="Invalid pincode", status_code=401)
    else:
        return Response(content="User not found", status_code=401)


@app.post("/pay/{merchant}/{amount}")
async def pay(merchant: str, amount: int, request: Request):
    card = await request.body()
    card = card.decode("utf-8")

    if amount <= 0:
        return Response(content="Amount must be positive", status_code=401)

    if amount > 5:
        idet = str(random.randint(1000000, 9999999))
        on_goind_payments[idet] = {"merchant": merchant, "amount": amount, "card": card}
        return Response(content=idet, status_code=403)
    else:
        user = session.query(User).filter_by(card=card).first()
        merchant_user = session.query(User).filter_by(login=merchant).first()
        if user:
            if user.amaunt >= amount:
                user.amaunt -= amount
                merchant_user.amaunt += amount
                session.commit()
                return Response(content="Payment successful", status_code=200)
            else:
                return Response(content="Insufficient funds", status_code=401)
        else:
            return Response(content="Card not found", status_code=401)


def create_user():
    username = input("Enter username: ")
    password = input("Enter password: ")
    card = input("Enter card number: ")
    amaunt = int(input("Enter amount: "))
    pincode = input("Enter pincode: ")

    user = User(login=username, password=password, card=card, amaunt=amaunt, pincode=pincode)
    session.add(user)
    session.commit()
    print(f"User '{username}' created successfully.")


def get_user_balance():
    username = input("Enter username: ")
    user = session.query(User).filter_by(login=username).first()
    if user:
        print(f"User '{username}' has a balance of {user.amaunt}.")
    else:
        print("No such user found.")


def delete_user():
    username = input("Enter username to delete: ")
    user = session.query(User).filter_by(login=username).first()
    if user:
        session.delete(user)
        session.commit()
        print(f"User '{username}' deleted successfully.")
    else:
        print("No such user found.")


def list_users():
    users = session.query(User).all()
    for user in users:
        print(f"Username: {user.login}, Card: {user.card}, Amount: {user.amaunt}")


# --- Test Section ---
import threading

if __name__ == "__main__":
    # Start FastAPI server in a separate thread
    import uvicorn
    threading.Thread(target=lambda: uvicorn.run(app, host='0.0.0.0', port=8080)).start()
    # Command line interface
    while True:
        print("\n1. Create user")
        print("2. Get user balance")
        print("3. Delete user")
        print("4. List all users")
        print("5. Exit")
        choice = input("Enter your choice: ")
        if choice == "1":
            create_user()
        elif choice == "2":
            get_user_balance()
        elif choice == "3":
            delete_user()
        elif choice == "4":
            list_users()
        elif choice == "5":
            break
        else:
            print("Invalid choice. Please try again.")
