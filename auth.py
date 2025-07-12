from database import session
from models import User, OtpSecret, AccessToken, Transaction, Card, SigKey
from fastapi import HTTPException, status
import pyotp
import qrcode
from datetime import datetime, timedelta
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import hashlib
import os
import json
import random
import string
from config import *

import fastapi
from fastapi.responses import StreamingResponse
from io import BytesIO
from typing import Dict

INUSE_KEYS = {} # uuid: str -> private key: str


app = fastapi.APIRouter()

with open("keys/private_key.pem", "rb") as key_file:
    private_key = serialization.load_pem_private_key(
        key_file.read(),
        password=None,
    )

def auth_sessiontoken(token: str, type: str = "session_cookie"):
    """
    Authenticate a session token.
    """
    access_token = session.query(AccessToken).filter_by(token=token, type=type).first()
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token",
        )
    if access_token.expires_at < datetime.now().isoformat():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token expired",
        )
    return access_token.user

def valid_sessiontoken(token: str, type: str = "session_cookie"):
    """
    Check if a session token is valid.
    """
    access_token = session.query(AccessToken).filter_by(token=token, type=type).first()
    if not access_token:
        return False
    if access_token.expires_at < datetime.now().isoformat():
        return False
    return access_token.user

def delete_sessiontoken(token: str, type: str = "session_cookie"):
    """
    Delete a session token.
    """
    access_token = session.query(AccessToken).filter_by(token=token, type=type).first()
    if access_token:
        session.delete(access_token)
        session.commit()

def generate_access_token(user: User, token_type: str = "session_cookie", timeout_hours: int = 24, len=64, numeric: bool = False):
    """    Generate a new access token for the user.
    """
    if numeric:
        token = pyotp.random_base32(length=len, characters='0123456789')
    else:
        token = pyotp.random_base32(length=len)
    expires_at = (datetime.now().replace(microsecond=0) + timedelta(hours=timeout_hours)).isoformat()
    access_token = AccessToken(
        type=token_type,
        token=token,
        expires_at=expires_at,
        created_at=datetime.now().isoformat(),
        user_id=user.id
    )
    session.add(access_token)
    session.commit()
    return access_token

def remove_access_token(token: str):
    """Remove an access token from the database.
    """
    access_token = session.query(AccessToken).filter_by(token=token).first()
    if access_token:
        session.delete(access_token)
        session.commit()
    

def auth_user_passw(username: str, password: str):
    """Authenticate a user with username and password.
    """
    user = session.query(User).filter_by(username=username, password=password).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return user

def auth_totp(user: User, otp_code: str):
    """Authenticate a user with TOTP code.
    """
    otp_secret = session.query(OtpSecret).filter_by(user_id=user.id).first()
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


@app.post("/login")
async def login(request: fastapi.Request):
    """Login endpoint to authenticate user and return access token.
    """
    data = await request.json()
    username = data.get("login")
    uuid = data.get("uuid")
    if not uuid or uuid not in INUSE_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or missing UUID",
        )
    private_key = INUSE_KEYS[uuid]
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required",
        )
    try:
        encrypted_b64 = data.get("password")
        encrypted_bytes = base64.b64decode(encrypted_b64)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid encrypted password format",
        )
    try:
        decrypted = private_key.decrypt(
        encrypted_bytes,
        padding.PKCS1v15()  # Instead of OAEP padding
        )
        password = decrypted.decode()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid encrypted password"
        )
    
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    password, her_publickey_fingerprint = password.split("---")

    her_publickey = data.get("publicKey")
    if not her_publickey:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public key is required",
        )
    if not her_publickey_fingerprint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Errror",
        )
    
    raw = json.dumps(json.loads(her_publickey), separators=(',', ':'), sort_keys=True)  # match JS stringify behavior
    digest = hashlib.sha256(raw.encode()).digest()
    correct_fp = base64.b64encode(digest).decode()

    if correct_fp != her_publickey_fingerprint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public key fingerprint does not match",
        )
    
    user = auth_user_passw(username, password)
    access_token = generate_access_token(user, token_type="session_step1", timeout_hours=STEP1_TIMEOUT , len=32)
    pubdbin = SigKey(
        public_key=her_publickey,
        created_at=datetime.now().isoformat(),
        expires_at=(datetime.now() + timedelta(hours=STEP1_TIMEOUT)).isoformat()
    )
    pubdbin.session_id = access_token.id
    session.add(pubdbin)
    session.add(access_token)
    session.commit()

    response = fastapi.responses.JSONResponse(
        content={
            "url": "/auth/step2",
            "message": "Please complete the security step",
        },
        status_code=status.HTTP_200_OK
    )
    INUSE_KEYS.pop(uuid, None)  # Remove the used key from the in-use keys
    # Set the session_step1 cookie with the access token
    response.set_cookie(key="session_step1", value=access_token.token, httponly=True, max_age=STEP1_TIMEOUT / 60 / 60, samesite="Lax")
    return response

@app.post("/step2")
async def step2(request: fastapi.Request):
    """Step 2 of the login process, where user provides TOTP.
    """
    pyl = await request.json()
    data = pyl.get("data")
    signature = pyl.get("signature")
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="no data provided",
        )
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="no signature provided",
        )
    if not request.cookies.get("session_step1"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No session_step1 cookie found"
        )
    
    sestoken = session.query(AccessToken).filter_by(token=request.cookies.get("session_step1"), type="session_step1").first()

    if not sestoken:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_step1 token")
    if sestoken.expires_at < datetime.now().isoformat():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session_step1 token expired")
    user = sestoken.user

    public_key_dob = session.query(SigKey).filter_by(session_id=sestoken.id).first()
    if not public_key_dob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No public key found for user"
        )
    
    signature = base64.b64decode(signature)
    data_bytes = data.encode()

    #load the public key from the database as a json
    public_key_jwk = json.loads(public_key_dob.public_key)
    public_key_numbers = rsa.RSAPublicNumbers(
        e=int.from_bytes(base64.urlsafe_b64decode(public_key_jwk['e'] + '=='), 'big'),
        n=int.from_bytes(base64.urlsafe_b64decode(public_key_jwk['n'] + '=='), 'big')
    )
    public_key = public_key_numbers.public_key(default_backend())

    try:
        public_key.verify(
            signature,
            data_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        totp = json.loads(data).get("password")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature verification failed"
        )

    user = auth_totp(user, totp)
    access_token = generate_access_token(user, token_type="session_cookie", timeout_hours=SESSION_TIMEOUT, len=128)
    public_key_dob.session_id = access_token.id
    public_key_dob.expires_at = (datetime.now() + timedelta(hours=SESSION_TIMEOUT)).isoformat()
    session.commit()
    response = fastapi.responses.JSONResponse(
        content={
            "url": "/app/dashboard"
            })
    remove_access_token(request.cookies.get("session_step1"))
    response.set_cookie(key="session_token", value=access_token.token, httponly=True, max_age=SESSION_TIMEOUT/60/60, samesite="Lax")
    response.set_cookie(key="session_step1", value="", httponly=True, max_age=0, samesite="Lax")  # Clear the session_step1 cookie
    return response

