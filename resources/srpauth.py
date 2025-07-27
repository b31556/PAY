
from flask import Flask, request, jsonify
import hashlib
import os
import secrets
import flask
app = Flask(__name__)

# Parameters - 1024-bit N and g from RFC 5054
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
    return flask.send_from_directory('.', 'srpauth.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = data['password']
    salt = os.urandom(16)
    xH = H(salt, hashlib.sha256(f"{username}:{password}".encode()).digest())
    x = int.from_bytes(xH, 'big')
    v = pow(g, x, N)
    print(f"Registering user {username} with salt {salt.hex()} and verifier {v}")
    users[username] = {'salt': salt, 'v': v}
    return jsonify({"message": "User registered successfully"}), 201


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
    #print(expected_M1.hex())
    if expected_M1 != M1_client:
        return jsonify({"error": "Bad proof"}), 400

    M2 = H(long_to_bytes(A), expected_M1, K)

    # Save session keys etc if needed
    session.update({'A': A, 'S': S, 'K': K, 'M1': expected_M1})
    print(K.hex())
    return jsonify({'M2': M2.hex()})


if __name__ == '__main__':
    app.run(debug=True,port=8980,host='0.0.0.0')
