# server.py
from flask import Flask, request, jsonify, send_from_directory
import os
import json
import time
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from nacl.public import PrivateKey, PublicKey, Box
from nacl.signing import SigningKey, VerifyKey

app = Flask(__name__)

K = b"my_super_secret_srp_shared_secret"
salt = b"srp_salt_example_1234"
info = b"srp secure tunnel key derivation"

hkdf = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=salt,
    info=info,
)
tunnel_key = hkdf.derive(K)
aesgcm = AESGCM(tunnel_key)


# === Server Keypairs ===
server_enc_private = PrivateKey.generate()
server_enc_public = server_enc_private.public_key
server_sign_private = SigningKey.generate()
server_sign_public = server_sign_private.verify_key

client_enc_public = None  # Will be filled when client sends it
client_sign_public = None

def encrypt_with_box(data: bytes) -> bytes:
    if client_enc_public is None:
        raise ValueError("Client encryption public key not set")
    box = Box(server_enc_private, client_enc_public)
    nonce = os.urandom(24)
    encrypted = box.encrypt(data, nonce)
    return encrypted

def decrypt_with_box(data: bytes) -> bytes:
    if client_enc_public is None:
        raise ValueError("Client encryption public key not set")
    box = Box(server_enc_private, client_enc_public)
    decrypted = box.decrypt(data)
    return decrypted

@app.route("/server-pubkeys", methods=["GET"])
def send_server_pubkeys():
    nonce = os.urandom(12)
    payload = {
        "enc_pubkey": server_enc_public.encode().hex(),
        "sign_pubkey": server_sign_public.encode().hex(),
        "timestamp": int(time.time())
    }
    serialized = json.dumps(payload).encode()
    encrypted = aesgcm.encrypt(nonce, serialized, None)
    return jsonify({
        "nonce": nonce.hex(),
        "encrypted": encrypted.hex()
    })

@app.route("/client-pubkeys", methods=["POST"])
def receive_client_pubkeys():
    global client_enc_public, client_sign_public
    nonce_hex = request.json.get("nonce")
    encrypted_hex = request.json.get("encrypted")
    if not nonce_hex or not encrypted_hex:
        return jsonify({"error": "Missing nonce or encrypted payload"}), 400
    try:
        nonce = bytes.fromhex(nonce_hex)
        encrypted = bytes.fromhex(encrypted_hex)
        payload = aesgcm.decrypt(nonce, encrypted, None)
        payload = json.loads(payload)
        ts = int(payload.get("timestamp", 0))
        now = int(time.time())
        if abs(now - ts) > 10:
            return jsonify({"error": "Timestamp too old or in the future"}), 400
        client_enc_public = PublicKey(bytes.fromhex(payload["enc_pubkey"]))
        client_sign_public = VerifyKey(bytes.fromhex(payload["sign_pubkey"]))
    except Exception as e:
        return jsonify({"error": f"Failed to process client pubkeys: {str(e)}"}), 400
    return jsonify({"status": "Client pubkeys received"})

@app.route("/message", methods=["POST"])
def receive_message():
    data = request.json
    encrypted = bytes.fromhex(data["encrypted"])
    signature = bytes.fromhex(data["signature"])

    try:
        decrypted = decrypt_with_box(encrypted)
    except Exception as e:
        return jsonify({"error": f"Failed to decrypt message: {str(e)}"}), 400

    # Ellenőrizzük a szignatúrát
    try:
        client_sign_public.verify(decrypted, signature)
    except Exception as e:
        return jsonify({"error": f"Invalid signature: {str(e)}"}), 400

    response_message = f"Hi from the server! I received: {decrypted.decode()}"
    # Szerver is aláírja a választ
    encrypted_response = encrypt_with_box(response_message.encode())
    response_signature = server_sign_private.sign(response_message.encode()).signature
    return jsonify({
        "encrypted_response": encrypted_response.hex(),
        "signature": response_signature.hex()
    })

@app.route("/")
def index():
    return send_from_directory('.', 'srptoexchange.html')

if __name__ == "__main__":
    app.run(port=5000)
