
# 💳 FastAPI QR Payment System

*Still is development!*

This is a simple FastAPI-based web application that allows merchants to initiate payments, users to complete payments via QR code, and transactions to be monitored in real-time via WebSockets.

## 🚀 Features

* Merchant login & token-based authentication
* Transaction creation via API
* QR code generation for payments
* User login with card and PIN-based pseudo-authentication
* Real-time transaction updates via WebSockets
* HTML payment portals (Jinja2 templates)
* SQLite database via SQLAlchemy

---

## 🛠️ Tech Stack

* **FastAPI** – API backend
* **SQLite + SQLAlchemy** – Database
* **Jinja2** – HTML templating
* **qrcode** – QR code generation
* **WebSockets** – Real-time merchant notifications

---

## 📁 Project Structure

```
.
├── main.py                    # FastAPI app entry point
├── templates/                # HTML templates for login, payment, etc.
├── db.db                     # SQLite DB file
├── static/                   # Static assets (if any)
└── README.md                 # You're reading it
```

---

## 🧠 Core Concepts

### 🏦 User Table (aka Cards)

* Represents both merchants and regular users
* Fields: `login`, `password`, `card`, `pincode`, `amaunt`, `pin_limit`, `acess_token`

### 💰 Transaction Table

* Each payment attempt is recorded as a `Transaction`
* Tracks:

  * Amount
  * Merchant info
  * Unique payment code
  * QR watch code
  * Transaction state: `created`, `completed`, `failed`

### 🔒 Authentication

* Token (`acess_token`) is issued on login and stored in cookies
* Used to identify users during transactions and merchant actions

### 📡 Real-Time Payments

* Merchants are connected via WebSocket to `/api/merchant/ws`
* On successful payment, merchants receive a `payment_completed` JSON message

---

## 🧪 API Endpoints

| Method      | Endpoint               | Description                                   |
| ----------- | ---------------------- | --------------------------------------------- |
| `GET`       | `/generate_qr/{login}` | Generates and returns a QR image for payment  |
| `POST`      | `/api/start_payment`   | Initiates a new transaction (merchant only)   |
| `GET`       | `/pay/{code}`          | Displays payment page for a transaction       |
| `POST`      | `/api/pay/{code}`      | Completes a payment by a user                 |
| `GET`       | `/login`               | Returns login page                            |
| `POST`      | `/api/login`           | Authenticates user and sets auth cookie       |
| `GET`       | `/portal`              | Merchant dashboard                            |
| `GET`       | `/api/transactions`    | Fetch all transactions for logged-in merchant |
| `GET`       | `/watch/{watch_code}`  | Polling transaction status                    |
| `WEBSOCKET` | `/api/merchant/ws`     | Real-time merchant notification channel       |

---

## 🧪 Running the App

### ⚙️ Requirements

```bash
pip install fastapi uvicorn sqlalchemy qrcode jinja2
```

### ▶️ Start the Server

```bash
uvicorn main:app --reload
```

Then visit `http://127.0.0.1:8000`.

---

## ❗ Notes

* This system is **not production-ready**. Do **NOT** use it with real money.
* Cookie security and CSRF protections are minimal for demo purposes.
* Passwords are stored as plain text. Yes, go ahead and scream. In production: use hashing (bcrypt or argon2).
* WebSocket reconnection & error handling is minimal – feel free to fix it.

---

## 🔐 Future Improvements

* Password hashing
* Proper session handling
* CSRF protection
* Logging & rate limiting
* Admin dashboard
* Tests... y'know, like a real app has
