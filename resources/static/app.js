async function register() {
  const username = document.getElementById("username").value;

  const res = await fetch('/register/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  const options = await res.json();
  options.challenge = bufferDecode(options.challenge);
  options.user.id = bufferDecode(options.user.id);

  const credential = await navigator.credentials.create({ publicKey: options });

  const attestationObject = bufferEncode(credential.response.attestationObject);
  const clientDataJSON = bufferEncode(credential.response.clientDataJSON);

  await fetch('/register/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attestationObject,
      clientDataJSON
    })
  });

  alert('Registered!');
}

async function login() {
  const username = document.getElementById("username").value;

  const res = await fetch('/login/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  const options = await res.json();
  options.challenge = bufferDecode(options.challenge);
  options.allowCredentials = options.allowCredentials.map(cred => ({
    ...cred,
    id: bufferDecode(cred.id)
  }));

  const assertion = await navigator.credentials.get({ publicKey: options });

  const response = {
    authenticatorData: bufferEncode(assertion.response.authenticatorData),
    clientDataJSON: bufferEncode(assertion.response.clientDataJSON),
    signature: bufferEncode(assertion.response.signature),
    userHandle: bufferEncode(assertion.response.userHandle)
  };

  const loginRes = await fetch('/login/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  });

  const result = await loginRes.json();
  alert('Logged in as ' + result.user);
}

// Base64url utils
function bufferEncode(value) {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bufferDecode(value) {
  value = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
