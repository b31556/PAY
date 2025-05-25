from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
import random
from datetime import datetime
import qrcode
import os
from io import BytesIO
from fastapi import FastAPI, HTTPException
import fastapi
from fastapi.responses import StreamingResponse
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.encoders import jsonable_encoder
from typing import Dict
from fastapi import WebSocketDisconnect

connected_merchants: Dict[str, fastapi.WebSocket] = {}


templates = Jinja2Templates(directory="templates")
app = FastAPI()
 
# Database setup
engine = create_engine('sqlite:///db.db', echo=True)
Base = declarative_base()
Session = sessionmaker(bind=engine)
session = Session()

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True)
    created_at = Column(String, nullable=False)
    completed_at = Column(String, nullable=True)
    transaction_secret = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    amount = Column(Integer, nullable=False)
    merchant = Column(String, nullable=False)
    merchant_id = Column(Integer, nullable=False)
    card = Column(String, nullable=False)
    state = Column(String, nullable=False, default="created")
    watch_code = Column(String, nullable=False)

    def __repr__(self):
        return f"<Transaction(amount='{self.amount}', merchant='{self.merchant}')>"

class User(Base):
    __tablename__ = 'cards'
    id = Column(Integer, primary_key=True)
    login = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    card = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    amaunt = Column(Integer, nullable=False, default=0)
    pin_limit = Column(Integer, nullable=False, default=10)
    acess_token = Column(String, nullable=True)

    def __repr__(self):
        return f"<User(username='{self.login}')>"

# Create tables
Base.metadata.create_all(engine)





@app.get("/generate_qr/{login}")
def generate_qr_code(login: str):

    login= f"http://100.104.43.55:8080/pay/{login}"
    # QR-kód generálása
    qr = qrcode.make(login)
    # PNG kép beágyazása egy streambe
    img_io = BytesIO()
    qr.save(img_io, format='PNG')
    img_io.seek(0)  # Visszatekerjük az elejére

    return StreamingResponse(
        content=img_io,
        media_type="image/png",
        headers={"Content-Disposition": "inline; filename=qr.png"}
    )


@app.post("/api/start_payment")
async def start_payment(request: fastapi.Request):
    data= await request.json()
    merchant_secret = request.cookies.get("acess_token")
    amount = data.get("amount")

    
    if not amount or not merchant_secret:
        raise HTTPException(status_code=400, detail="Merchant and amount are required")

    # Validate merchant secret
    merchant = session.query(User).filter_by(acess_token=merchant_secret).first()
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid merchant credentials")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount (must be positive)")

    code = os.urandom(16).hex()
    secret = os.urandom(64).hex()
    watch_code = os.urandom(16).hex()
    transaction = Transaction(
        code=code,
        amount=amount,
        merchant=merchant.login,
        merchant_id=merchant.id,
        state="created",
        card="",
        transaction_secret=secret,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        watch_code=watch_code
    )

    session.add(transaction)
    session.commit()

    return {"code": code, "message": "Payment started", "watch_code": watch_code}

@app.get("/watch/{watch_code}")
def watch_page(request: fastapi.Request, watch_code: str):
    transaction = session.query(Transaction).filter_by(watch_code=watch_code).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": transaction.state, "amount": transaction.amount, "merchant": transaction.merchant, "created_at": transaction.created_at, "completed_at": transaction.completed_at}    


@app.get("/pay/{code}", response_class=HTMLResponse)
def pay_page(request: fastapi.Request, code: str):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    logged_in = False
    if not acess_token:
        logged_in = False
    else:
        user= session.query(User).filter_by(acess_token=acess_token).first()
        if user:
            logged_in = True
    transaction = session.query(Transaction).filter_by(code=code).first()
    if not transaction:
        return templates.TemplateResponse("payment_invalid.html", {"request": request, "code": code})

    if transaction.state == "completed":
        return templates.TemplateResponse("payment_already_completed.html", {"request": request, "code": code})
    
    if transaction.state == "failed":
        return templates.TemplateResponse("payment_failed.html", {"request": request, "code": code})
    
    return templates.TemplateResponse("payment.html", {"request": request, "code": code, "payment_secret": transaction.transaction_secret, "amount": transaction.amount, "merchant": transaction.merchant, "is_already_logged_in": logged_in is not None, "created_at": transaction.created_at})


@app.post("/api/pay/{code}")
async def pay(request: fastapi.Request, code: str):
    data = await request.json()
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    transaction_secret = data.get("transaction_secret")

    if not transaction_secret:
        raise HTTPException(status_code=400, detail="Transaction secret is required")
    transaction = session.query(Transaction).filter_by(code=code).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.state != "created":
        raise HTTPException(status_code=400, detail="Transaction already processed, failed or completed")
    if transaction.transaction_secret != transaction_secret:
        raise HTTPException(status_code=400, detail="Invalid transaction secret")
    
    # Validate user
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if user.amaunt < transaction.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    # Validate merchant
    merchant_user = session.query(User).filter_by(id=transaction.merchant_id).first()
    if not merchant_user:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if merchant_user.login != transaction.merchant:
        raise HTTPException(status_code=400, detail="Merchant mismatch")

    

    if merchant_user.login in connected_merchants:
        ws = connected_merchants[merchant_user.login]
        try:
            await ws.send_json({
                "type": "payment_completed",
                "code": transaction.code,
                "amount": transaction.amount,
                "completed_at": transaction.completed_at
            })
        except Exception as e:
            print("WebSocket error:", e)


    # Process payment
    merchant_user.amaunt += transaction.amount
    user.amaunt -= transaction.amount
    transaction.state = "completed"
    transaction.card = user.card
    transaction.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    session.commit()
    return templates.TemplateResponse("payment_completed.html", {"request": request, "code": code, "amount": transaction.amount, "merchant": transaction.merchant, "created_at": transaction.created_at, "completed_at": transaction.completed_at})

@app.get("/login")
async def login(request: fastapi.Request):
    return templates.TemplateResponse("login.html", {"request": request})
@app.post("/api/login")
async def login(request: fastapi.Request, response: fastapi.Response):
    data = await request.json()
    login = data.get("login")
    password = data.get("password")
    user = session.query(User).filter_by(login=login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.password != password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Generate access token
    acess_token = os.urandom(32).hex()
    user.acess_token = acess_token

    session.commit()

    response.set_cookie(
        "acess_token",
        value=acess_token,
        httponly=True,
        max_age=3600,  # 1 hour
        expires=3600,
        samesite="Lax", # CSRF protection
        secure=False  #! Use secure cookies in production
    )

@app.get("/portal", response_class=HTMLResponse)
async def create_transaction(request: fastapi.Request, response: fastapi.Response):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        return templates.TemplateResponse("login.html", {"request": request})
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        return templates.TemplateResponse("login.html", {"request": request})
    return templates.TemplateResponse("portal.html", {"request": request, "user": user, "acess_token": acess_token})

@app.get("/api/transactions")
async def get_transactions(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    transactions = session.query(Transaction).filter_by(merchant=user.login).all()
    transaction_list = []
    for transaction in transactions:
        transaction_list.append({"id": transaction.id, "amount": transaction.amount, "date": transaction
.created_at, "state": transaction.state})
    return {"transactions": transaction_list}


@app.websocket("/api/merchant/ws")
async def websocket_endpoint(websocket: fastapi.WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    print("Token:", token)
    if not token:
        await websocket.close(code=1008)
        return
    
    merchant = session.query(User).filter_by(acess_token=token).first()
    if not merchant:
        await websocket.close(code=1008)  # Policy Violation
        return

    connected_merchants[merchant.login] = websocket
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        connected_merchants.pop(merchant.login, None)


@app.post("/api/logout")
async def logout(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user.acess_token = None
    session.commit()
    response = fastapi.Response()
    response.delete_cookie("acess_token")




import threading

if __name__ == "__main__":
    # Start FastAPI server in a separate thread
    import uvicorn
    threading.Thread(target=lambda: uvicorn.run(app, host='0.0.0.0', port=8080)).start()