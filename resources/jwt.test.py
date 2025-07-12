from flask import Flask, request, jsonify
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
import base64
import json

app = Flask(__name__)

# Simulált adatbázis: user_id -> public_key objektum
USER_PUBLIC_KEYS = {}

@app.route('/api/register-key', methods=['POST'])
def register_key():
    content = request.json
    public_key_jwk = content.get("publicKey")

    # JWK -> PEM konvertálás egyszerűsített példa (csak RS256 kulcsokra)
    e = int.from_bytes(base64.urlsafe_b64decode(public_key_jwk['e'] + '=='), 'big')
    n = int.from_bytes(base64.urlsafe_b64decode(public_key_jwk['n'] + '=='), 'big')

    public_numbers = rsa.RSAPublicNumbers(e, n)
    public_key = public_numbers.public_key()

    # Mentjük a public keyt userhez (itt fixed user id)
    USER_PUBLIC_KEYS['benedek'] = public_key

    return jsonify({"status": "public key saved"}), 200

@app.route('/api/verify-request', methods=['POST'])
def verify_request():
    content = request.json
    data = content.get("data")
    signature_b64 = content.get("signature")

    if 'benedek' not in USER_PUBLIC_KEYS:
        return jsonify({"error": "No public key for user"}), 400

    public_key = USER_PUBLIC_KEYS['benedek']

    signature = base64.b64decode(signature_b64)
    data_bytes = data.encode()

    try:
        public_key.verify(
            signature,
            data_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        print("Signature verified successfully.")
        print("Data:", data)
        print("Signature:", signature_b64)
        return jsonify({"status": "Signature verified"}), 200
    except Exception as e:
        return jsonify({"error": "Signature verification failed", "details": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=8087)
    
