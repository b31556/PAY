from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import ctx
from nacl.public import PrivateKey, PublicKey
from nacl.signing import SigningKey, VerifyKey
import hashlib
import secrets
import base64
import os
import json
import pyotp

from database import db_session

from models import User, OtpSecret, AccessToken, SigKey, Session, UserSrp

from config import *

from encrpt import *

import fastapi
from fastapi import HTTPException
from fastapi import HTTPException, status

import sys
sys.set_int_max_str_digits(0)  # Allow large integers in hex conversion

app = fastapi.APIRouter()


def get_user_by_username(username: str) -> User:
    """Get a user by username."""
    user = db_session.query(User).filter_by(username=username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

def auth_totp(user: User, otp_code: str):
    """Authenticate a user with TOTP code.
    """
    otp_secret = db_session.query(OtpSecret).filter_by(user_id=user.id).first()
    if not otp_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOTP not set up for this user",
        )
    totp = pyotp.TOTP(otp_secret.secret)
    if not totp.verify(otp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )
    return user



@app.post('/login-start')
async def start(request: fastapi.Request):
    data = await request.json()
    username = data['username']
    user = get_user_by_username(username)
    if not user or not user.user_srps:
        return fastapi.responses.JSONResponse(
            content={"error": "User not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    salt = user.user_srps[0].salt
    v = user.user_srps[0].v
    v = int(v)  # Convert hex string to integer (arbitrary precision)
    salt = bytes.fromhex(salt)
    b = secrets.randbelow(N - 1)
    B = (k * v + pow(g, b, N)) % N
    session_id = secrets.token_hex(16)
    b_hex = hex(b)[2:]  # Convert to hex string without '0x' prefix
    B_hex = hex(B)[2:]  # Convert to hex string without '0x' prefix
    session = Session(
        session_id=session_id,
        b=b_hex,
        B_capital=B_hex,
        created_at=datetime.now().isoformat(),
        expires_at=(datetime.now() + timedelta(hours=SESSION_TIMEOUT)).isoformat(),
        username=username,
        user_id=user.id
    )
    db_session.add(session)
    db_session.commit()
    return fastapi.responses.JSONResponse(
        content={
            'salt': salt.hex(),
            'B': hex(B),
            'session_id': session_id
        }
    )


@app.post('/login-verify')
async def verify(request: fastapi.Request):
    data = await request.json()
    session_id = data['session_id']
    A = int(data['A'], 16)
    M1_client = bytes.fromhex(data['M1'])

    session = db_session.query(Session).filter_by(session_id=session_id).first()
    if not session:
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid session"},
            status_code=400
        )
    
    v = session.user.user_srps[0].v
    salt = session.user.user_srps[0].salt
    v = int(v)  # Convert hex string to integer (arbitrary precision)
    salt = bytes.fromhex(salt)

    b = int(session.b, 16)
    B = int(session.B_capital, 16)
    username = session.username

    if A % N == 0:
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid A"},
            status_code=400
        )

    u = H_int(long_to_bytes(A), long_to_bytes(B))
    S = pow((A * pow(v, u, N)) % N, b, N)
    K = H(long_to_bytes(S))

    # Compute expected M1 = H(H(N) xor H(g) | H(username) | salt | A | B | K)
    H_N = H(long_to_bytes(N))
    H_g = H(long_to_bytes(g))
    H_xor = bytes(x ^ y for x, y in zip(H_N, H_g))
    H_user = hashlib.sha256(username.encode()).digest()

    expected_M1 = H(H_xor, H_user, salt, long_to_bytes(A), long_to_bytes(B), K)
    #print(expected_M1.hex())
    if expected_M1 != M1_client:
        return fastapi.responses.JSONResponse(
            content={"error": "Bad proof"},
            status_code=400
        )

    M2 = H(long_to_bytes(A), expected_M1, K)

    info = b"srp secure tunnel key derivation"

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=info,
    )
    tunnel_key = hkdf.derive(K.hex().encode("utf-8"))  # Ensure K is in bytes
    aesgcm = AESGCM(tunnel_key)

    # === Server Keypairs ===
    server_enc_private = PrivateKey.generate()
    server_enc_public = server_enc_private.public_key
    server_sign_private = SigningKey.generate()
    server_sign_public = server_sign_private.verify_key

    session.A = A
    session.S = S
    session.K = K.hex()
    session.M1 = expected_M1
    session.updated_at = datetime.now().isoformat()
    session.state = "step1"
    session.expires_at = (datetime.now() + timedelta(hours=SESSION_TIMEOUT)).isoformat()
    session.server_enc_private = base64.b64encode(bytes(server_enc_private)).decode()
    session.server_enc_public = base64.b64encode(bytes(server_enc_public)).decode()
    session.server_sign_private = base64.b64encode(bytes(server_sign_private)).decode()
    session.server_sign_public = base64.b64encode(bytes(server_sign_public)).decode()
    session.tunnel_key = tunnel_key.hex()
    db_session.add(session)
    db_session.commit()

    return fastapi.responses.JSONResponse(
        content={'M2': M2.hex()}
    )

@app.post("/keyexchange")
async def keyexchange(request: fastapi.Request):
    data = await request.json()
    session_id = data.get("session_id")
    nonce_hex = data.get("nonce")
    encrypted_hex = data.get("encrypted")
    if not session_id or not nonce_hex or not encrypted_hex:
        return fastapi.responses.JSONResponse(
            content={"error": "Missing session_id, nonce or encrypted payload"},
            status_code=400
        )
    session = db_session.query(Session).filter_by(session_id=session_id).first()
    if not session:
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid session"},
            status_code=400
        )
    
    salt = bytes.fromhex(session.user.user_srps[0].salt)
    K = bytes.fromhex(session.K)
    
    info = b"srp secure tunnel key derivation"

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=info,
    )
    tunnel_key = hkdf.derive(K)

    aesgcm = AESGCM(tunnel_key)


    try:
        nonce = bytes.fromhex(nonce_hex)
        encrypted = bytes.fromhex(encrypted_hex)
        payload = aesgcm.decrypt(nonce, encrypted, None)
        payload = json.loads(payload)
        ts = int(payload.get("timestamp", 0))
        now = datetime.now().timestamp()
        if not ts or ts <= 0:
            return fastapi.responses.JSONResponse(
                content={"error": "Invalid timestamp"},
                status_code=400
            )
        if abs(now - ts) > 10:
            return fastapi.responses.JSONResponse(
                content={"error": "Timestamp too old or in the future"},
                status_code=400
            )
        client_enc_public = PublicKey(bytes.fromhex(payload["enc_pubkey"]))
        client_sign_public = VerifyKey(bytes.fromhex(payload["sign_pubkey"]))
    except Exception as e:
        return fastapi.responses.JSONResponse(
            content={"error": f"Failed to process client pubkeys"},
            status_code=400
        )

    session.client_enc_public = base64.b64encode(bytes(client_enc_public)).decode()
    session.client_sign_public = base64.b64encode(bytes(client_sign_public)).decode()
    session.updated_at = datetime.now().isoformat()
    db_session.add(session)
    db_session.commit()

    # -----------------------

    # load base64 encoded keys from session
    server_enc_private = base64.b64decode(session.server_enc_private)
    server_enc_public = base64.b64decode(session.server_enc_public)
    server_sign_private = base64.b64decode(session.server_sign_private)
    server_sign_public = base64.b64decode(session.server_sign_public)

    my_nonce = os.urandom(12)
    payload = {
        "enc_pubkey": server_enc_public.hex(),
        "sign_pubkey": server_sign_public.hex(),
        "timestamp": int(datetime.now().timestamp()),
        "username": f"{session.username}; {(random.randint(1, 20)*9)-1}",
    }
    serialized = json.dumps(payload).encode()
    encrypted = aesgcm.encrypt(my_nonce, serialized, None)

    return fastapi.responses.JSONResponse(
        content={
            "nonce": my_nonce.hex(),
            "encrypted": encrypted.hex()
        }
    )

@app.post("/message")
async def message(ctx: RequestContext = Depends(process_request)):
    message = {
        "message": f"Hi from the server, your data is: {ctx.data}"
    }
    return process_response(message, ctx)



@app.post("/step2")
async def step2(ctx: RequestContext = Depends(process_request)):
    """Step 2 of the login process, where user provides TOTP.
    """
    
    session = db_session.query(Session).filter_by(session_id=ctx.session_id).first()
    user = session.user if session else None

    if session.state != "step1":
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid session state"},
            status_code=400
        )

    data = ctx.data
    otp_code = data.get("password")

    if not otp_code:
        return fastapi.responses.JSONResponse(
            content={"error": "Missing OTP code"},
            status_code=400
        )
    
    auth_totp(user, otp_code)
    session.state = "verified"
    session.updated_at = datetime.now().isoformat()
    db_session.add(session)
    db_session.commit()
    return process_response(
        {"message": "TOTP verified successfully", "code": 200, "url": "/app/dashboard"},
        ctx
    )
    