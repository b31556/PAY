from flask import Flask, jsonify, request
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
)
import secrets
import json
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# In-memory storage for demo purposes (replace with database in production)
users_db = {}
challenges_db = {}

# WebAuthn configuration
RP_ID = "localhost"  # Replace with your domain in production
RP_NAME = "Passkey Demo"
ORIGIN = "http://localhost:5000"  # Update for production

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/register/start', methods=['POST'])
def register_start():
    username = request.json.get('username')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    if username in users_db:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create a new user
    user_id = secrets.token_bytes(32)
    user = {
        'id': user_id,
        'name': username,
        'display_name': username,
    }
    
    # Generate registration options
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user_id,
        user_name=user['name'],
        user_display_name=user['display_name'],
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED
        ),
    )
    
    # Store challenge and user data temporarily
    challenges_db[options.challenge] = {
        'user': user,
        'username': username
    }
    
    return jsonify(json.loads(options_to_json(options)))

@app.route('/register/finish', methods=['POST'])
def register_finish():
    data = request.json
    challenge = data.get('challenge')
    
    if challenge not in challenges_db:
        return jsonify({'error': 'Invalid challenge'}), 400
    
    stored_data = challenges_db[challenge]
    user = stored_data['user']
    username = stored_data['username']
    
    try:
        registration_verification = verify_registration_response(
            credential=RegistrationCredential.parse_raw(json.dumps(data)),
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
        )
        
        # Store the user and credential
        users_db[username] = {
            'user': user,
            'credential': {
                'id': registration_verification.credential_id,
                'public_key': registration_verification.credential_public_key,
                'sign_count': registration_verification.sign_count,
            }
        }
        
        del challenges_db[challenge]
        
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/login/start', methods=['POST'])
def login_start():
    username = request.json.get('username')
    
    if not username or username not in users_db:
        return jsonify({'error': 'User not found'}), 404
    
    user_data = users_db[username]
    credential_id = user_data['credential']['id']
    
    # Generate authentication options
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=[{
            'id': credential_id,
            'type': 'public-key',
        }],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    
    # Store challenge temporarily
    challenges_db[options.challenge] = {
        'username': username,
        'credential_id': credential_id,
        'sign_count': user_data['credential']['sign_count'],
    }
    
    return jsonify(json.loads(options_to_json(options)))

@app.route('/login/finish', methods=['POST'])
def login_finish():
    data = request.json
    challenge = data.get('challenge')
    
    if challenge not in challenges_db:
        return jsonify({'error': 'Invalid challenge'}), 400
    
    stored_data = challenges_db[challenge]
    username = stored_data['username']
    user_data = users_db[username]
    
    try:
        authentication_verification = verify_authentication_response(
            credential=AuthenticationCredential.parse_raw(json.dumps(data)),
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            credential_public_key=user_data['credential']['public_key'],
            credential_current_sign_count=user_data['credential']['sign_count'],
            require_user_verification=False,
        )
        
        # Update sign count
        users_db[username]['credential']['sign_count'] = authentication_verification.new_sign_count
        
        del challenges_db[challenge]
        
        return jsonify({
            'status': 'ok',
            'username': username
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(ssl_context='adhoc')  # HTTPS is required for WebAuthn