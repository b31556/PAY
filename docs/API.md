
# 💳 Payment Integration Guide

This guide will walk you through integrating the payment system using your merchant credentials and the provided APIs.

---

### ✅ Step 0 – Get Your Merchant Secret

1. Log into your account using your browser.
2. Navigate to `/dev/api`.
3. Copy your **merchant secret token**. You will need it for all API interactions. It will not expire but with this ppl can steal your money so keep it safe all cost

---

### 💼 Step 1 – Start a Payment

Send a **POST** request to:

```
POST /api/start_payment
```

**Request Body (JSON)** – *from your server backend*:

```json
{
  "merchant_secret": "your_token_here",
  "amount": 1000  // replace with the desired amount to charge
}
```

**Successful Response (HTTP 200):**

```json
{
  "code": "payment_code_here",
  "message": "Payment started",
  "watch_code": "watch_code_here"
}
```

---

### 🔗 Step 2 – Redirect the User to the Payment Page

Once you receive the `payment_code`, redirect the user to the following URL:

```
http://100.104.43.55:8081/pay/{payment_code}?redirect={your_redirect_url}
```

Replace:

* `{payment_code}` with the code from Step 1
* `{your_redirect_url}` with the full URL where you want the user redirected after payment

---

### 🔁 Step 3 – Monitor Payment Status

Periodically, and when the user returns to your redirect URL, send a **GET** request to:

```
GET /watch/{watch_code}
```

**Successful Response (HTTP 200):**

```json
{
  "status": "created" | "completed",
  "amount": 1000,
  "merchant": "your_merchant_name",
  "created_at": "YYYY-MM-DD HH:mm:ss",
  "completed_at": "YYYY-MM-DD HH:mm:ss" // or null if still pending
}
```

* `status = "created"` → payment is pending
* `status = "completed"` → payment was successful

---

### 🎉 Step 4 – You're Done!

Once the payment status is **"completed"**, the transaction is successful and will appear in your merchant portal.

---

### ⚠️ Notes & Best Practices

* **Always handle payments from the server side** to protect your `merchant_secret`.
* Implement retry/backoff logic for polling the watch API.
* Secure your redirect URLs to prevent misuse.
* Use HTTPS in production environments.

---

### Error handling and etc

Please test yourself but it should work 100% of the time