import pyotp
secret = input("Enter your TOTP ")
print(secret)

import pyotp, qrcode

totp = pyotp.TOTP(secret)
uri = totp.provisioning_uri(name="user@example.com", issuer_name="YourAppName")

# Create QR code
img = qrcode.make(uri)
img.save("totp_qr.png")

# Assume you have user's secret from DB
totp = pyotp.TOTP(secret)
user_input_code = input("Enter 6-digit code: ")

if totp.verify(user_input_code):
    print("✅ Code is valid!")
else:
    print("❌ Invalid code")
