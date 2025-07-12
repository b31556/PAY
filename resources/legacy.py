@app.get("/generate_qr/{login}")
def generate_qr_code(login: str):

    login= f"{URL}/pay/{login}"
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
    if not merchant_secret:
        merchant_secret = data.get("merchant_secret")

    if not merchant_secret:
        raise HTTPException(status_code=401, detail="Merchant secret is required")
    
    amount = data.get("amount")

    if not amount or not merchant_secret:
        raise HTTPException(status_code=400, detail="Amount is required")

    merchant = auth.auth_sessiontoken(merchant_secret)

    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid merchant credentials")

    try:
        amount = float(amount)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid amount format (must be a number)")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount (must be positive)")

    
    transaction = core.make_transaction(amount, merchant)
    code = transaction.transaction_code
    watch_code = transaction.watch_code

    return {"code": code, "message": "Payment started", "watch_code": watch_code}

@app.get("/watch/{watch_code}")
def watch_page(request: fastapi.Request, watch_code: str):
    transaction = core.session.query(Transaction).filter_by(watch_code=watch_code).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": transaction.state, "amount": transaction.amount, "merchant": transaction.merchant, "created_at": transaction.created_at, "completed_at": transaction.completed_at}    


@app.get("/pay/{code}", response_class=HTMLResponse)
def pay_page(request: fastapi.Request, code: str):
    redirecto = request.query_params.get("redirect")
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    logged_in = False
    if not acess_token:
        logged_in = False
        user = None
    else:
        user= core.session.query(User).filter_by(acess_token=acess_token).first()
        if user:
            logged_in = True
    transaction = core.session.query(Transaction).filter_by(code=code).first()
    if not transaction:
        return templates.TemplateResponse("payment_invalid.html", {"request": request, "code": code, "redirect": redirecto})

    if transaction.state == "completed":
        return templates.TemplateResponse("payment_already_completed.html", {"request": request, "code": code, "redirect": redirecto})
    
    if transaction.state == "failed":
        return templates.TemplateResponse("payment_failed.html", {"request": request, "code": code, "redirect": redirecto})
    
    return templates.TemplateResponse("payment.html", {"request": request, "code": code, "payment_secret": transaction.transaction_secret, "amount": transaction.amount, "is_already_logged_in": logged_in, "created_at": transaction.created_at, "redirect": redirecto, "user": user})

@app.get("/dev/api")
async def dev_api(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        raise HTTPException(status_code=401, detail="Unauthorized, please log in")
    
    user = auth.auth_sessiontoken(acess_token)
    
    return f"Your dev api key is: {user.acess_token}. You can use this key to access the API endpoints. Please keep it secret and do not share it with anyone."

@app.post("/api/pay/{code}")
async def pay(request: fastapi.Request, code: str):
    redirecto = request.query_params.get("redirect")
    data = await request.json()
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    transaction_secret = data.get("transaction_secret")

    if not transaction_secret:
        raise HTTPException(status_code=400, detail="Transaction secret is required")
    transaction = core.session.query(Transaction).filter_by(code=code).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.state != "created" or transaction.state != "pending":
        raise HTTPException(status_code=400, detail="Transaction already processed, failed or completed")
    if transaction.transaction_secret != transaction_secret:
        raise HTTPException(status_code=400, detail="Invalid transaction secret")
    
    # Validate user
    user = auth.auth_sessiontoken(acess_token)
    
    if user < transaction.amount:
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
    return templates.TemplateResponse("payment_completed.html", {"request": request, "code": code, "amount": transaction.amount, "merchant": transaction.merchant, "created_at": transaction.created_at, "completed_at": transaction.completed_at, "redirect": redirecto})

@app.post("/api/transaction/revoke")
async def revoke_transaction(request: fastapi.Request):
    data = await request.json()
    code = data.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Transaction code required")
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    transaction = session.query(Transaction).filter_by(code=code).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.state != "created":
        raise HTTPException(status_code=400, detail="Only active transactions can be revoked")
    if transaction.merchant != user.login:
        raise HTTPException(status_code=403, detail="You do not have permission to revoke this transaction")
    transaction.state = "revoked"
    session.commit()
    return {"message": "Transaction revoked"}

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
        return fastapi.responses.RedirectResponse(url="/login?redirect=/portal", status_code=303)
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        return fastapi.responses.RedirectResponse(url="/login?redirect=/portal", status_code=303)
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

@app.get("/dashboard", response_class=HTMLResponse)
async def user_dashboard(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        return fastapi.responses.RedirectResponse(url="/login?redirect=/dashboard", status_code=303)
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        return fastapi.responses.RedirectResponse(url="/login?redirect=/dashboard", status_code=303)
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})

@app.get("/api/user/transactions")
async def get_user_transactions(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    transactions = session.query(Transaction).filter_by(card=user.card).all()
    transaction_list = []
    for transaction in transactions:
        transaction_list.append({
            "id": transaction.id,
            "amount": transaction.amount,
            "date": transaction.created_at,
            "state": transaction.state,
            "merchant": transaction.merchant
        })
    return {"transactions": transaction_list, "balance": user.amaunt}


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


@app.get("/logout")
async def logout(request: fastapi.Request):
    redirecto = request.query_params.get("redirect", "/")
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    if not acess_token:
        return fastapi.responses.RedirectResponse(url="/login", status_code=303)

    user = session.query(User).filter_by(acess_token=acess_token).first()
    if not user:
        return fastapi.responses.RedirectResponse(url="/login", status_code=303)
    user.acess_token = None
    session.commit()
    response = fastapi.responses.RedirectResponse(url=redirecto, status_code=303)
    response.delete_cookie("acess_token")
    return response

@app.get("/", response_class=HTMLResponse)
def index(request: fastapi.Request):
    cookies = request.cookies
    acess_token = cookies.get("acess_token")
    user = None
    if acess_token:
        user = session.query(User).filter_by(acess_token=acess_token).first()
    return templates.TemplateResponse("index.html", {"request": request, "user": user})