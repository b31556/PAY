## POST /balances

**Description:**  
Returns the total balance, list of user accounts, recent transactions, and percent change compared to last month. good for the dashboard

**Request:**  
- No body required  
- Depends on authentication via Header: Bearer: token

**Response:**  
```json
{
  "total": 1234.56,
  "accounts": [
    {
      "id": "uuid-1234",
      "bank_account_number": "123456789",
      "holder_name": "John Doe",
      "balance": 500.00,
      "currency": "USD",
      "account_type": "checking"
    }
  ],
  "recent_transactions": [
    {
      "id": "tx-5678",
      "type": "buy", // or "sell"
      "amount": 100.00,
      "created_at": "2025-08-11T12:34:56Z"
    }
  ],
  "percent_compared_to_last_month": 12.34
}


## POST /me

**Description:**
Returns the current user's details including username, email, and full name.

**Request:**
- No body required
- Depends on authentication via Header: Bearer: token

**Response:**
```json
{
  "username": "johndoe",
  "email": "johndoe@example.com",
  "full_name": "John Doe"
}


## POST /accounts

**Description:**
Returns a list of the user's bank accounts and cards.

**Request:**
- No body required
- Depends on authentication via Header: Bearer: token

**Response:**
```json
{
  "accounts": [
    {
      "uuid": "account-uuid-1234",
      "bank_account_number": "123456789",
      "holder_name": "John Doe",
      "balance": 500.00,
      "currency": "USD",
      "account_type": "checking",
      "available_balance": 500.00,
      "thm": "0%",
      "fillup_timeline": "2025-08-11T12:34:56Z",
      "kamat": "0%",
      "kamet_this_year": "0%"
    }
  ],
  "cards": [
    {
      "card_number": "********1111",
      "card_holder": "John Doe",
      "expiration_date": "12/25",
      "cvv": "123",
      "card_type": "credit",
      "account_uuid": "account-uuid-1234"
    }
  ]
}