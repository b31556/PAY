from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

import fastapi
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
app = FastAPI()
import random
import qrcode
# SQLite in-memory DB (use 'sqlite:///users.db' to persist)
engine = create_engine('sqlite:///user.db', echo=True)
Base = declarative_base()
Session = sessionmaker(bind=engine)
session = Session()

# User model
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    code = Column(String, nullable=False)

    def __repr__(self):
        return f"<User(username='{self.username}')>"

# Create tables
Base.metadata.create_all(engine)

def make_code():
    # Generate a random 6-digit code
    code = str(random.randint(10000000000, 99999999999))

    # Create QR code
    qr = qrcode.QRCode(
        version=1,  # 1–40 (size of the code); 1 = smallest
        error_correction=qrcode.constants.ERROR_CORRECT_L,  # Error tolerance
        box_size=10,  # Size of each box
        border=4,  # Thickness of border (minimum is 4)
    )

    qr.add_data(code)
    qr.make(fit=True)

    # Generate image
    img = qr.make_image(fill_color="black", back_color="white")

    img.show()
    # Save it
    img.save("qrcode.png")

    return code



@app.post("/scanned")
async def read_item(request: fastapi.Request):
    code = await request.body()
    code = code.decode("utf-8")
    if code:
        user = session.query(User).filter_by(code=code).first()
        if user:
            return {"username": user.username}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        raise HTTPException(status_code=400, detail="Code parameter is required")


def create_user(username):
    if session.query(User).filter_by(username=username).first():
        print("That user already exists. Try again, genius.")
        return
    user = User(username=username, code=make_code())
    session.add(user)
    session.commit()
    print(f"User '{username}' created successfully.")

def get_user(code):
    user = session.query(User).filter_by(code=code).first()
    if user:
        return user.username
    else:
        return "not found"

def delete_user(username):
    user = session.query(User).filter_by(username=username).first()
    if user:
        session.delete(user)
        session.commit()
        print(f"User '{username}' deleted.")
    else:
        print("No such user to delete. Maybe they deleted themselves.")

def list_users():
    users = session.query(User).all()
    print("All users:")
    for user in users:
        print(f"- {user.username}")

# --- Test Section ---
import threading

if __name__ == "__main__":
    # Start FastAPI server in a separate thread
    import uvicorn
    threading.Thread(target=lambda: uvicorn.run(app,host='0.0.0.0',port=8000)).start()
    command=""
    while command!="exit":
        command = input("Enter a command (create, get, delete, list, exit): ")
        if command == "create":
            username = input("Enter a username: ")
            
            create_user(username)
        elif command == "get":
            code = input("Enter a code: ")
            print(get_user(code))
        elif command == "delete":
            username = input("Enter a username: ")
            delete_user(username)
        elif command == "list":
            list_users()
        elif command == "exit":
            print("Exiting...")
            break
    