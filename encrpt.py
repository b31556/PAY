import dataclasses
from database import db_session
from models import User, OtpSecret, AccessToken, Transaction, Card, SigKey, Session, UserSrp
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
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from nacl.public import PrivateKey, PublicKey, Box
from nacl.signing import SigningKey, VerifyKey
import hashlib
import secrets
import os
import json
import random
import string
from dataclasses import dataclass
from typing import Dict, Union
from config import *

import fastapi
from fastapi.responses import StreamingResponse
from io import BytesIO
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware
import pyotp
from fastapi import FastAPI, HTTPException, Request, Depends
import sys
sys.set_int_max_str_digits(0)  # Allow large integers in hex conversion




N_hex = (
    "E93E6836D33110E240374917FE95AFEE44CA70E68360AC123D0BE1A821F11668"
    "08D64F19AE7266A2F94F9B6F24E19BCE5527C37585E1339168C6A00505CA3473"
    "4B3296A0343A955D06B012E47B2955CB0A754059D3E01D355EF2AEA6943EC2980"
    "29359675ADC15DA6AA973DDEAAB7745240860BAD2843FEDA017541C08F53E4A26"
    "4B517BF649B8497C41B5B43E8D208E686A323F1456742551A8D4456ECC384E7CC"
    "289996769D4991F76FBD67035B131F34936549857FD96F51147331E051CC25288"
    "AA4924DD959ACC4A6E6742B7DC41E7FA799F8215A60EDC3367575F57BDF2C5D79"
    "0AC664E2E091DC38A2D3C5E0E81A5A404723DB5F8FF7C8C60588C2CA1B0EA1A9"
    "9887D952CC8908F5952BF979D6C8C4077D8378826C6BAA860C934D51E03382865"
    "530786EF9F2876DA007A5363C31D10AAFE6F4578FFD15D6EB3D6095E6CD21C12"
    "1A111DA9021730251BA0D5C563BA84EA5D2D14E7C13431E2573C082090844920"
    "954117CD3C266A7A1DDF077660E94DB2E3B81194484A1A368D75F5F06B6E1DEC"
    "9D9EB2401EC2E0C4642CB28FD48298354E07B4FACF1E3991F2D2503987DE54C4"
    "99D08C40C6B1E501A04172DA92C5B2AA54A790324B17B1F168E028ACFB005A27"
    "A0653A4E0015CEC8172D083CD2037C591A171E0EE1A517D72A49D1FBC19141E6"
    "FA46957E90F6643571AD6CDD321355DAA8233F9C83483728192DBCC844B9A701E"
    "7ED1D81F97E5F6614389492A87808B089AA0A802357C16A46166ED7142660E88D"
    "B70DB75E0B13F16F00E6146B5290EDAD9CC6C9136F757D5FD64AB5058F63321F"
    "931F4E6E75796670BFB80A01DFFF4CC070BEA10C92055FEEFD879FABD9180DA2"
    "0FF8910ADE467E03276CFD6BF739D6E927BF92F9BD71A965385DB69A9E498342"
    "AA88C403F147953CDF128C873855DA1900F88124E0B59BC016B060A92B369AE2"
    "64D5DDBDB52FE8C3A98D90859308EAA833C3B225D80FFDF8918A8DFF1E07F4D3"
    "9CB56AD5A69E383DA6A72E644636A07CD23DD47A34ECE161D731AEAC5BAD6E921"
    "1E21D213B2E6DCBD52BED48A94D8198C20525EBFDDA3B4BF424C51FE319B15E9"
    "2CA1358C878A6FB75EF28BB24232E160A251E3F8FA0708B14AEF693BDBA072C3"
    "A7C3B3DBF58E39B5AF77B10F2C5E98726914F9EF80DF4C50E84F883DCE22BF4E"
    "D238839BC69ACA9CDBCC9E4779E9798D090ACDA4E879074213B9905FC86F761B"
    "E7F26EAC471622DCAD1A3E54781AF59BD48721D4A129CB1FA17428E633F70F40"
    "8291354B827BF09A973B73BB93E976964D41467AC13D2665773DD2130805E3A38"
    "C4C565BCE57E301447838022FE0269D2E6E71B108B7FEA58F8CBAF436EB33F9A"
    "73371E48133DF41E868AA90E805F35303CE4CC1479C13649A93F47D42E5DE7CF"
    "8E1F8F91386897B9BAEC36268BD442596BAE490311B36846146DB3"
)

N = int(N_hex, 16)  # Convert hex string to integer (arbitrary precision)
g = 2
k = 3

def verify_signature(sessin_id, data: str, signature: str):
    public_key_dob = db_session.query(SigKey).filter_by(session_id=sessin_id).first()
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signature verification failed"
        )
    
def H(*args):
    a = b''.join(args)
    return hashlib.sha256(a).digest()

def H_int(*args):
    return int.from_bytes(H(*args), 'big')

def long_to_bytes(val):
    length = (val.bit_length() + 7) // 8
    return val.to_bytes(length, 'big')


def encrypt_with_box(data: bytes, client_enc_public, server_enc_private) -> bytes:
    if client_enc_public is None:
        raise ValueError("Client encryption public key not set")
    box = Box(server_enc_private, client_enc_public)
    nonce = os.urandom(24)
    encrypted = box.encrypt(data, nonce)
    return encrypted

def decrypt_with_box(data: bytes, server_enc_private, client_enc_public) -> bytes:
    box = Box(server_enc_private, client_enc_public)
    decrypted = box.decrypt(data)
    return decrypted



@dataclass
class RequestContext:
    data: Union[dict, str]
    url: str
    session_id: str
    client_enc_public: PublicKey
    server_enc_private: PrivateKey
    server_sign_private: SigningKey
    client_sign_public: VerifyKey


async def process_request(request: Request) -> Dict:
    data = await request.json()
    encrypted = bytes.fromhex(data["encrypted"])
    signature = bytes.fromhex(data["signature"])
    session_id = data.get("session_id")

    if not session_id:
        return fastapi.responses.JSONResponse(
            content={"error": "Missing session_id"},
            status_code=400
        )
    session = db_session.query(Session).filter_by(session_id=session_id).first()
    if not session:
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid session"},
            status_code=400
        )
    
    # load base64 encoded keys from session
    server_enc_private = base64.b64decode(session.server_enc_private)
    client_enc_public = base64.b64decode(session.client_enc_public)
    server_sign_private = base64.b64decode(session.server_sign_private)
    client_sign_public = base64.b64decode(session.client_sign_public)

    # load keys
    server_enc_private = PrivateKey(server_enc_private)
    client_enc_public = PublicKey(client_enc_public)
    server_sign_private = SigningKey(server_sign_private)
    client_sign_public = VerifyKey(client_sign_public)

    try:
        decrypted = decrypt_with_box(encrypted, server_enc_private, client_enc_public)
    except Exception as e:
        return fastapi.responses.JSONResponse(
            content={"error": f"Failed to decrypt message"},
            status_code=400
        )

    # Ellenőrizzük a szignatúrát
    try:
        client_sign_public.verify(decrypted, signature)
    except Exception as e:
        return fastapi.responses.JSONResponse(
            content={"error": f"Invalid signature"},
            status_code=400
        )
    
    try:
        payload = json.loads(decrypted.decode())
        real_session_id = payload.get("session_id")
        if not real_session_id or real_session_id != session_id:
            return fastapi.responses.JSONResponse(
                content={"error": "Session ID manipulation detected"},
                status_code=400
            )
        data = payload.get("data")
        if not data:
            return fastapi.responses.JSONResponse(
                content={"error": "Missing data in payload"},
                status_code=400
            )
        url = payload.get("url")
        if not url:
            return fastapi.responses.JSONResponse(
                content={"error": "Missing URL in payload"},
                status_code=400
            )
    except json.JSONDecodeError:
        return fastapi.responses.JSONResponse(
            content={"error": "Invalid payload"},
            status_code=400
        )

    return RequestContext(
        data=data,
        url=url,
        session_id=session_id,
        client_enc_public=client_enc_public,
        server_enc_private=server_enc_private,
        server_sign_private=server_sign_private,
        client_sign_public=client_sign_public
    )


def process_response(data: dict, context: RequestContext) -> fastapi.responses.JSONResponse:
    try:
        response_message = json.dumps(data)
    except TypeError as e:
        response_message = str(data)
    encrypted_response = encrypt_with_box(
        response_message.encode(),
        context.client_enc_public,
        context.server_enc_private
    )
    response_signature = context.server_sign_private.sign(response_message.encode()).signature
    return fastapi.responses.JSONResponse(
        content={
            "response": encrypted_response.hex(),
            "signature": response_signature.hex()
        }
    )