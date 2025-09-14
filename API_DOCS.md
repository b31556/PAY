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
      "kamet_this_year": "0%",
      "memo": "Checking account" // you use it as the title of account
    }
  ],
  "cards": [
    {
      "card_number": "********1111",
      "card_holder": "John Doe",
      "expiration_date": "12/25",
      "cvv": "123",
      "card_type": "credit",
      "account_uuid": "account-uuid-1234",
      "is_locked": false // IF TRUE YOU SHOW SOME KIND OF ANIMATION OR ART IN THE CARD LIKE FREEZE ETC, you also change the kártya zárolása gomb to kártya feloldása
    }
  ]
}
```


## POST /create-account

**Description:**
Creates a new bank account for the user.

**Request:**
```json
{
  "account_type": "checking", // or "savings" or "credit"
  "account_title": "My Checking Account"
}
```

**Response:**
```json
{
  "code" : 10,
  "message": "done"
}  // IF THE ACCOUNT IS CREATED, YOU RELOAD THE ACCOUNTS PAGE
```

OR

```json
{
  "code": 56,
  "message": "awaiting-approval"
}  // YOU DISPLAY A MESSAGE TO THE USER INDICATING THAT THE ACCOUNT CREATION IS AWAITING APPROVAL AND IT WILL BE CREATED AS SOON AS ITS APPROVED
```


## POST /toggle-card-lock

**Description:**
Toggles the lock status of a user's card.

**Request:**
```json
{
  "card_uuid": "card-uuid-1234"
}
```

**Response:**
```json
{
  "message": "Card lock status updated successfully",
  "card_uuid": "card-uuid-1234",
  "new_status": "unlocked"
}
```


## POST /set-card-settings

**Description:**
Updates the settings of a user's card.

**Request:**
```json
{
  "card_uuid": "card-uuid-1234",
  "settings": {
    "connected_account_uuid": "account-uuid-5678",
    "pincode": "1234"
  }
}
```

**Response:**
```json
{
  "message": "Card settings updated successfully",
  "card_uuid": "card-uuid-1234"
}
```


## POST /make-card

**Description:**
Creates a new card for the user.

**Request:**
```json
{
  "connected_account_uuid": "account-uuid-1234",
  "pincode": "1234" // 4-digit PIN code for the card

}
```

**Response:**
```json
{
  "message": "Card created successfully"
}

OR

HTTP ERROR 400: Maximum card limit reached


## POST /reveal-full-card-number

**Description:**
Reveals the full card number for a user's card.

**Request:**
```json
{
  "card_uuid": "card-uuid-1234"
}
```

**Response:**
```json
{
  "full_card_number": "1234 5678 9012 3456"
}


## POST /start-transaction

**Description:**
Starts a new transaction.

**Request:**
```json
{
  "from_account": "account-uuid-1234",
  "to_account": "account-uuid-5678",
  "amount": 100.00,
  "memo": "memo",
  "transfer_type": "between_accounts"
}  // IF transfer_type IS "between my accounts"

OR 

{
  "from_account": "account-uuid-1234",
  "to_account_number": "123456789",
  "amount": 100.00,
  "memo": "memo",
  "transfer_type": "wire"
}  // IF transfer_type IS "wire" or "external"

OR 

{
  "from_account": "account-uuid-1234",
  "to_contact_uuid": "contact-uuid-5678",
  "amount": 100.00,
  "memo": "memo",
  "transfer_type": "to_contact"
}  // IF transfer_type IS "to_contact"
```

**Response:**
```json
{
  "message": "Transaction created successfully",
  "transaction_id": "tx-1234",
  "from_account": "account-uuid-1234",
  "to_account": "account-uuid-5678",
  "amount": 100.00,
  "memo": "memo",
  "transfer_type": "between_accounts"
}

OR 

HTTP ERROR 400: something that should be shown to the user


## POST /confirm-transaction

**Description:**
Confirms a pending transaction.

**Request:**
```json
{
  "transaction_id": "tx-1234",
  "confirmation_code": "123456"   // not needed for between accounts
}
```

**Response:**
```json
{
  "message": "Transaction completed successfully",
  "transaction_id": "tx-1234"
}


## POST /contacts/list

**Description:**
Lists all contacts for the authenticated user.

**Request:**
```json
{}
```

**Response:**
```json
{
  "contacts": [
    {
      "uuid": "contact-uuid-1234",
      "name": "John Doe",
      "bank_account_number": "123456789",
      "email": "john.doe@example.com"
    },
    {
      "uuid": "contact-uuid-5678",
      "name": "Jane Smith",
      "bank_account_number": "987654321",
      "email": "jane.smith@example.com"
    }
  ]
}



## POST /contacts/add

**Description:**
Adds a new contact for the authenticated user.

**Request:**
```json
{
  "name": "John Doe",
  "bank_account_number": "123456789",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "message": "Contact added successfully",
  "contact": {
    "uuid": "contact-uuid-1234",
    "name": "John Doe",
    "bank_account_number": "123456789",
    "email": "john.doe@example.com"
  }
}


## POST /contacts/rm

**Description:**
Removes a contact for the authenticated user.

**Request:**
```json
{
  "contact_uuid": "contact-uuid-1234"
}
```

**Response:**
```json
{
  "message": "Contact removed successfully",
  "contact_uuid": "contact-uuid-1234"
}


## POST /contacts/me/qr

**Description:**
Generates a QR code with the user's contact information.

**Request:**
```json
{}
```

**Response:**
file response


## POST /transactions

**Description:**
Returns a paginated list of transactions for the authenticated user.

**Request:**
```json
{
  "page": 1
}
```

**Response:**
```json
{
  "total_expenses": 500.00,
  "total_income": 1000.00,
  "transactions": [
    {
      "id": "tx-1234",
      "state": "pending", // or "completed", "failed" should determine the color of the transaction item
      "type": "expense", // or "income" should determine the icon of the transaction item
      "amount": 100.00,
      "memo": "memo",
      "title": "Between my accounts transfer", // you can use this title to show in the transaction list
      "created_at": "2025-08-11T12:34:56Z" // you can use this to show when the transaction happened, already in desc order
    },
    {
      "id": "tx-1235",
      "state": "completed", // or "pending", "failed" should determine the color of the transaction item
      "type": "income", // or "expense" should determine the icon of the transaction item
      "amount": 200.00,
      "memo": "memo",
      "title": "Between my accounts transfer", // you can use this title to show in the transaction list
      "created_at": "2025-08-10T11:22:33Z" // you can use this to show when the transaction happened, already in desc order
    }
  ],
  "total": 2,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}


## POST /transactions/details

**Description:**
Retrieves detailed information about a specific transaction.

**Request:**
```json
{
  "transaction_id": "tx-1234"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx-1234",
    "state": "pending",
    "type": "expense",
    "amount": 100.00,
    "memo": "memo",
    "title": "Between my accounts transfer",
    "created_at": "2025-08-11T12:34:56Z",
    "from_account": "account-uuid-1234",
    "to_account": "account-uuid-5678"
  }
}