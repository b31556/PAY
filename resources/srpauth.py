from flask import Flask, request, jsonify
import hashlib
import os
import secrets
import flask
app = Flask(__name__)

# Parameters - 1024-bit N and g from RFC 5054
N_hex = (
    "CB6CA63D51DED2B0D9BD257FBD1109D31341F8DD6A0D431AEB72AD0DC5579DBBE4990B2377466D0E5E74B68E72CF8E12B"
    "1CCEEF836C69CC48E8EFF1934404EE0652D43F635962C2459397722E5273424EBEB7D60011B939C6EB79E43EC1343449A"
    "2F4CA550F5F108764470E53B87B3F8B8F7A338153E200AE8B9D252ADF002BBEB9F30FA97CB297A1B412780D291634301D"
    "CE712442A79A637792A0B730A0447E9B5F961A4074BE672E9AED66C49E1225FCF242B49491964E6B0FEAEBCF2FF859EAF"
    "E80E2FB801F375CD20E9395629DA9ADACFB00DA33930C07ADE24C823FE06C9F668356C0E999761FC3A827D9F1698B6ED7"
    "A49572292C2A20E0EFA1A2E946E6F3A420C64FFF6FF6482B9FE6E4AD859899B8A7845C24C76D29BF7D7FE1CB81723B092"
    "26D70DF332D85E57EF8A5F18AC5366D43B01D25F6240B83BF820A868AEBFDCE1BA73875083474F9A2AE6DD54475702104"
    "3E197B1E238D46DD0536B2A29796DE0478B5ADCD71792F7F82D2BA9EE79643E9136D09E19A65E4144F622215FDBADA3D1"
    "C2312295DB3645E6A31146FEBD93FFBE3E7F8F35CD8143910BFB3F86CA282EBE87CF50A494F7E47620B4C6DE655B9145F"
    "95DCF518C4399B6E28AA353BD23392F2F6167675261C18041D933EC1098BAD295251F369D1A703F28D10D2023E2930297"
    "C5C8ED37729AFAD617EB7B306D8539C5C906B1FA8A2152A9B85383"
)

N = int(N_hex, 16)
g = 2
k = 3


users = {}  # store salt, verifier for each user
sessions = {}  # ephemeral b, B, A, S, K, M1 for each session

def H(*args):
    a = b''.join(args)
    return hashlib.sha256(a).digest()

def H_int(*args):
    return int.from_bytes(H(*args), 'big')

def long_to_bytes(val):
    length = (val.bit_length() + 7) // 8
    return val.to_bytes(length, 'big')

@app.route('/')
def i():
    return flask.render_template("d.html")

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = data['password']
    salt = os.urandom(16)
    xH = H(salt, hashlib.sha256(f"{username}:{password}".encode()).digest())
    x = int.from_bytes(xH, 'big')
    v = pow(g, x, N)
    users[username] = {'salt': salt, 'v': v}
    return jsonify({"status": "registered"})

@app.route('/start', methods=['POST'])
def start():
    data = request.json
    username = data['username']
    if username not in users:
        return jsonify({"error": "User not found"}), 404
    salt = users[username]['salt']
    v = users[username]['v']
    b = secrets.randbelow(N - 1)
    B = (k * v + pow(g, b, N)) % N
    session_id = secrets.token_hex(16)
    sessions[session_id] = {'b': b, 'B': B, 'v': v, 'salt': salt, 'username': username}
    return jsonify({
        'salt': salt.hex(),
        'B': hex(B),
        'session_id': session_id
    })

@app.route('/verify', methods=['POST'])
def verify():
    data = request.json
    session_id = data['session_id']
    A = int(data['A'], 16)
    M1_client = bytes.fromhex(data['M1'])

    if session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    session = sessions[session_id]
    b = session['b']
    B = session['B']
    v = session['v']
    salt = session['salt']
    username = session['username']

    if A % N == 0:
        return jsonify({"error": "Invalid A"}), 400

    u = H_int(long_to_bytes(A), long_to_bytes(B))
    S = pow((A * pow(v, u, N)) % N, b, N)
    K = H(long_to_bytes(S))

    # Compute expected M1 = H(H(N) xor H(g) | H(username) | salt | A | B | K)
    H_N = H(long_to_bytes(N))
    H_g = H(long_to_bytes(g))
    H_xor = bytes(x ^ y for x, y in zip(H_N, H_g))
    H_user = hashlib.sha256(username.encode()).digest()

    expected_M1 = H(H_xor, H_user, salt, long_to_bytes(A), long_to_bytes(B), K)
    print(expected_M1.hex())
    if expected_M1 != M1_client:
        return jsonify({"error": "Bad proof"}), 400

    M2 = H(long_to_bytes(A), expected_M1, K)

    # Save session keys etc if needed
    session.update({'A': A, 'S': S, 'K': K, 'M1': expected_M1})
    print(K.hex())
    return jsonify({'M2': M2.hex()})


if __name__ == '__main__':
    app.run(debug=True,port=8989,host='0.0.0.0')
