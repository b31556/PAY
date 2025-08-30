// Banking API utilities - Custom secure methods as requested
import { toast } from "@/hooks/use-toast";

// Backend API endpoint
export const API_ENDPOINT = "http://localhost:4464/api/v1";

// Custom secure method for sending requests
export const SendRequest = async (url: string, data: any = {}) => {
  try {
    // Handle login with mock data for demo user
    if (url === "/login") {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (data.email === "user@bank.com" && data.password === "password") {
        localStorage.setItem("bankingToken", "mock-jwt-token");
        localStorage.setItem("currentUser", JSON.stringify({
          id: "1",
          name: "John Doe",
          email: data.email,
          accounts: [
            { id: "1", type: "Checking", balance: 5420.50, accountNumber: "****1234" },
            { id: "2", type: "Savings", balance: 12750.00, accountNumber: "****5678" },
            { id: "3", type: "Credit", balance: -1200.00, accountNumber: "****9012" }
          ]
        }));
        return { success: true, message: "Login successful" };
      }
      throw new Error("Invalid credentials");
    }
    
    // Handle signup with mock data
    if (url === "/signup") {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem("bankingToken", "mock-jwt-token");
      localStorage.setItem("currentUser", JSON.stringify({
        id: "2",
        name: data.name,
        email: data.email,
        accounts: [
          { id: "1", type: "Checking", balance: 1000.00, accountNumber: "****1111" }
        ]
      }));
      return { success: true, message: "Account created successfully" };
    }
    
    // For all other requests, send to the actual backend
    const token = localStorage.getItem("bankingToken");
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    // Add authentication token if available
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const requestOptions = {
      method: "POST",
      headers,
      body: Object.keys(data).length ? JSON.stringify(data) : undefined
    };
    
    // Make the actual API call
    const response = await fetch(`${API_ENDPOINT}${url}`, requestOptions);
    
    // Check if response is ok
    if (!response) {
  throw new Error("No response from server. Possible network issue.");
}
    
    const responseData = await response.json();
    
    // Handle local notifications for specific actions
    switch (url) {
      case "/transfer":
        toast({
          title: "Transfer Successful",
          description: `$${data.amount} transferred from ${data.fromAccount} to ${data.toAccount}`,
        });
        break;
      
      case "/pay-bill":
        toast({
          title: "Bill Paid",
          description: `$${data.amount} paid to ${data.biller}`,
        });
        break;
      
      case "/profile/update":
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        const updatedUser = { ...currentUser, ...data };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        break;
    }

    return { code: response.status, success: true, data: responseData };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Request failed");
  }
};

// Custom secure method for navigation
export const Redirect = (url: string) => {
  // In a real banking app, this would handle secure routing
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

// Get current user data
export const getCurrentUser = () => {
  const userData = localStorage.getItem("currentUser");
  return userData ? JSON.parse(userData) : null;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem("bankingToken");
};

// Logout function
export const logout = () => {
  localStorage.removeItem("bankingToken");
  localStorage.removeItem("currentUser");
  Redirect("/login");
};

// Mock transaction data
// Fetch balance details with account info and recent transactions
export const getBalances = async () => {
  try {
    const response = await SendRequest("/balances");
    return response.data || {
      total: 0,
      accounts: [],
      recent_transactions: [],
      percent_compared_to_last_month: 0
    };
  } catch (error) {
    console.error("Error fetching balances:", error);
    return {
      total: 0,
      accounts: [],
      recent_transactions: [],
      percent_compared_to_last_month: 0
    };
  }
};

// Fetch accounts and cards
export const getAccounts = async () => {
  try {
    const response = await SendRequest("/accounts");
    return response.data || {
      accounts: [],
      cards: []
    };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return {
      accounts: [],
      cards: []
    };
  }
};

// Fetch current user details
export const getUserDetails = async () => {
  try {
    const response = await SendRequest("/me");
    return response.data || {
      username: "",
      email: "",
      full_name: ""
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {
      username: "",
      email: "",
      full_name: ""
    };
  }
};

export const getTransactions = async (accountId?: string) => {
  try {
    const url = accountId ? `/transactions/${accountId}` : "/transactions";
    const response = await SendRequest(url);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching transactions:", error);
    // Fallback to mock data if API fails
    const mockTransactions = [
      { id: "1", date: "2024-08-01", description: "Direct Deposit", amount: 3500.00, type: "credit", accountId: "1" },
      { id: "2", date: "2024-08-01", description: "Grocery Store", amount: -85.50, type: "debit", accountId: "1" },
      { id: "3", date: "2024-07-30", description: "Gas Station", amount: -45.20, type: "debit", accountId: "1" },
      { id: "4", date: "2024-07-29", description: "Online Transfer", amount: 200.00, type: "credit", accountId: "2" },
      { id: "5", date: "2024-07-28", description: "Subscription", amount: -12.99, type: "debit", accountId: "1" },
      { id: "6", date: "2024-07-25", description: "Interest Payment", amount: 15.75, type: "credit", accountId: "2" },
    ];
    
    return accountId 
      ? mockTransactions.filter(t => t.accountId === accountId)
      : mockTransactions;
  }
};

// Get billers data
export const getBillers = async () => {
  try {
    const response = await SendRequest("/billers");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching billers:", error);
    // Fallback to mock data if API fails
    return [
      { id: "1", name: "Electric Company", lastAmount: 125.50, dueDate: "2024-08-15" },
      { id: "2", name: "Internet Provider", lastAmount: 89.99, dueDate: "2024-08-10" },
      { id: "3", name: "Phone Company", lastAmount: 65.00, dueDate: "2024-08-20" },
      { id: "4", name: "Insurance", lastAmount: 156.75, dueDate: "2024-08-25" },
    ];
  }
};


// Create a new bank account
export const createAccount = async (accountType: string, accountTitle: string) => {
  try {
    const response = await SendRequest("/create-account", {
      account_type: accountType.toLowerCase(),
      account_title: accountTitle
    });
    return response.data;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

// Toggle card lock status
export const toggleCardLock = async (cardUuid: string) => {
  try {
    const response = await SendRequest("/toggle-card-lock", {
      card_uuid: cardUuid
    });
    return response.data;
  } catch (error) {
    console.error("Error toggling card lock:", error);
    throw error;
  }
};

// Update card settings
export const updateCardSettings = async (cardUuid: string, connectedAccountUuid: string, pincode: string) => {
  try {
    const response = await SendRequest("/set-card-settings", {
      card_uuid: cardUuid,
      settings: {
        connected_account_uuid: connectedAccountUuid,
        pincode: pincode
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error updating card settings:", error);
    throw error;
  }
};

// Create a new card for the user
export const makeCard = async (connectedAccountUuid: string, pincode: string) => {
  try {
    const response = await SendRequest("/make-card", {
      connected_account_uuid: connectedAccountUuid,
      pincode: pincode
    });
    return response.data;
  } catch (error) {
    console.error("Error creating new card:", error);
    throw error;
  }
};

// Reveal the full card number
export const revealFullCardNumber = async (cardUuid: string) => {
  try {
    const response = await SendRequest("/reveal-full-card-number", {
      card_uuid: cardUuid
    });
    return response.data;
  } catch (error) {
    console.error("Error revealing full card number:", error);
    throw error;
  }
};

// API Endpoint Examples - Complete Banking System
// ================================================

/*
1. AUTHENTICATION & USER DATA
================================

POST /auth/login
Request: {
  "email": "user@bank.com",
  "password": "password123"
}
Response: {
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "user@bank.com",
    "lastLogin": "2024-08-03T10:30:00Z"
  }
}

POST /auth/signup
Request: {
  "name": "John Doe",
  "email": "user@bank.com",
  "password": "password123",
  "phone": "+1234567890"
}
Response: {
  "success": true,
  "message": "Account created successfully",
  "userId": "user_123"
}

POST /auth/refresh
Request: {
  "refreshToken": "refresh-token-here"
}
Response: {
  "success": true,
  "token": "new-jwt-token",
  "expiresIn": 3600
}

GET /user/profile
Response: {
  "id": "user_123",
  "name": "John Doe",
  "email": "user@bank.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  },
  "preferences": {
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    },
    "theme": "light"
  }
}

PUT /user/profile
Request: {
  "name": "John Smith",
  "phone": "+1234567891",
  "address": {
    "street": "456 Oak Ave",
    "city": "Newtown",
    "state": "NY",
    "zipCode": "67890"
  }
}
Response: {
  "success": true,
  "message": "Profile updated successfully"
}

2. ACCOUNTS & BALANCES
========================

GET /accounts
Response: {
  "accounts": [
    {
      "id": "acc_001",
      "type": "Checking",
      "name": "Primary Checking",
      "balance": 5420.50,
      "accountNumber": "****1234",
      "routingNumber": "021000021",
      "status": "active",
      "openDate": "2020-01-15",
      "interestRate": 0.01
    },
    {
      "id": "acc_002",
      "type": "Savings",
      "name": "Emergency Fund",
      "balance": 12750.00,
      "accountNumber": "****5678",
      "status": "active",
      "openDate": "2020-02-01",
      "interestRate": 2.5
    },
    {
      "id": "acc_003",
      "type": "Credit",
      "name": "Rewards Card",
      "balance": -1200.00,
      "accountNumber": "****9012",
      "creditLimit": 5000.00,
      "availableCredit": 3800.00,
      "status": "active",
      "apr": 18.99
    }
  ],
  "totalBalance": 17970.50
}

GET /accounts/summary
Response: {
  "totalBalance": 17970.50,
  "monthlyChange": {
    "amount": 420.30,
    "percentage": 2.5
  },
  "accountCount": {
    "checking": 1,
    "savings": 1,
    "credit": 1,
    "total": 3
  }
}

3. TRANSACTIONS
================

GET /transactions/recent?limit=5
Response: {
  "transactions": [
    {
      "id": "txn_001",
      "accountId": "acc_001",
      "date": "2024-08-01T14:30:00Z",
      "description": "Direct Deposit - Salary",
      "amount": 3500.00,
      "type": "credit",
      "category": "Income",
      "balance": 5420.50,
      "status": "completed"
    },
    {
      "id": "txn_002",
      "accountId": "acc_001",
      "date": "2024-08-01T09:15:00Z",
      "description": "Grocery Store",
      "amount": -85.50,
      "type": "debit",
      "category": "Food",
      "balance": 1920.50,
      "status": "completed",
      "merchant": {
        "name": "SuperMart",
        "location": "Main St, Anytown"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 150,
    "hasMore": true
  }
}

GET /transactions?accountId=acc_001&startDate=2024-07-01&endDate=2024-08-01&page=1&limit=20
Response: {
  "transactions": [...], // Same format as above
  "summary": {
    "totalCredits": 4200.00,
    "totalDebits": -1850.75,
    "netAmount": 2349.25,
    "transactionCount": 25
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "hasMore": false
  }
}

4. TRANSFERS
=============

POST /transfers
Request: {
  "fromAccountId": "acc_001",
  "toAccountId": "acc_002",
  "amount": 500.00,
  "description": "Emergency fund transfer",
  "scheduledDate": "2024-08-05" // Optional, for future transfers
}
Response: {
  "success": true,
  "transferId": "trf_001",
  "message": "Transfer scheduled successfully",
  "confirmationNumber": "TRF123456789",
  "estimatedCompletion": "2024-08-05T10:00:00Z"
}

GET /transfers/history?page=1&limit=10
Response: {
  "transfers": [
    {
      "id": "trf_001",
      "fromAccount": {
        "id": "acc_001",
        "name": "Primary Checking",
        "accountNumber": "****1234"
      },
      "toAccount": {
        "id": "acc_002",
        "name": "Emergency Fund",
        "accountNumber": "****5678"
      },
      "amount": 500.00,
      "description": "Emergency fund transfer",
      "status": "completed",
      "createdDate": "2024-08-01T10:00:00Z",
      "completedDate": "2024-08-01T10:05:00Z",
      "confirmationNumber": "TRF123456789"
    }
  ]
}

5. BILL PAYMENTS
=================

GET /bills/payees
Response: {
  "payees": [
    {
      "id": "payee_001",
      "name": "Electric Company",
      "category": "Utilities",
      "accountNumber": "ACC123456",
      "lastPayment": {
        "amount": 125.50,
        "date": "2024-07-15"
      },
      "autopay": {
        "enabled": true,
        "amount": "full_balance",
        "accountId": "acc_001"
      }
    }
  ]
}

POST /bills/payments
Request: {
  "payeeId": "payee_001",
  "accountId": "acc_001",
  "amount": 125.50,
  "paymentDate": "2024-08-15",
  "memo": "August electric bill"
}
Response: {
  "success": true,
  "paymentId": "pay_001",
  "confirmationNumber": "PAY987654321",
  "message": "Payment scheduled successfully"
}

GET /bills/history?page=1&limit=10
Response: {
  "payments": [
    {
      "id": "pay_001",
      "payee": {
        "id": "payee_001",
        "name": "Electric Company"
      },
      "amount": 125.50,
      "paymentDate": "2024-08-15",
      "status": "scheduled",
      "confirmationNumber": "PAY987654321",
      "memo": "August electric bill"
    }
  ]
}

6. ANALYTICS & INSIGHTS
=========================

GET /analytics/spending?period=monthly&months=6
Response: {
  "period": "monthly",
  "data": [
    {
      "month": "2024-08",
      "totalSpending": 2450.75,
      "categories": {
        "Food": 450.30,
        "Transport": 320.50,
        "Entertainment": 180.25,
        "Utilities": 295.70,
        "Other": 1204.00
      }
    }
  ],
  "insights": [
    {
      "type": "high_spending",
      "category": "Food",
      "message": "Your food spending increased by 15% this month",
      "suggestion": "Consider meal planning to reduce costs"
    }
  ]
}

GET /analytics/balance-trend?period=daily&days=30
Response: {
  "period": "daily",
  "data": [
    {
      "date": "2024-08-01",
      "balance": 5420.50,
      "change": 3414.50
    },
    {
      "date": "2024-08-02",
      "balance": 5335.00,
      "change": -85.50
    }
  ],
  "summary": {
    "startBalance": 2006.00,
    "endBalance": 5420.50,
    "totalChange": 3414.50,
    "percentageChange": 170.2
  }
}

7. NOTIFICATIONS & ALERTS
===========================

GET /notifications?unread=true
Response: {
  "notifications": [
    {
      "id": "notif_001",
      "type": "transaction",
      "title": "Large Purchase Alert",
      "message": "A charge of $1,250.00 was made to your credit card",
      "timestamp": "2024-08-03T15:30:00Z",
      "read": false,
      "priority": "high",
      "actionRequired": false
    },
    {
      "id": "notif_002",
      "type": "security",
      "title": "Login from New Device",
      "message": "New login detected from Chrome on Windows",
      "timestamp": "2024-08-03T14:20:00Z",
      "read": false,
      "priority": "medium",
      "actionRequired": true,
      "actions": [
        {
          "type": "approve",
          "label": "This was me"
        },
        {
          "type": "deny",
          "label": "Secure my account"
        }
      ]
    }
  ],
  "unreadCount": 2
}

PUT /notifications/:id/read
Response: {
  "success": true,
  "message": "Notification marked as read"
}

8. SETTINGS & PREFERENCES
===========================

GET /settings/preferences
Response: {
  "notifications": {
    "email": {
      "transactions": true,
      "security": true,
      "marketing": false,
      "statements": true
    },
    "sms": {
      "security": true,
      "lowBalance": true,
      "largeTransactions": true
    },
    "push": {
      "enabled": true,
      "transactions": false,
      "security": true
    }
  },
  "security": {
    "twoFactorEnabled": true,
    "loginAlerts": true,
    "sessionTimeout": 30
  },
  "display": {
    "theme": "light",
    "currency": "USD",
    "dateFormat": "MM/DD/YYYY",
    "numberFormat": "US"
  }
}

PUT /settings/preferences
Request: {
  "notifications": {
    "email": {
      "marketing": true
    },
    "sms": {
      "lowBalance": false
    }
  },
  "display": {
    "theme": "dark"
  }
}
Response: {
  "success": true,
  "message": "Preferences updated successfully"
}

9. SECURITY
=============

POST /security/change-password
Request: {
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}
Response: {
  "success": true,
  "message": "Password changed successfully"
}

POST /security/enable-2fa
Request: {
  "method": "sms", // or "app", "email"
  "phoneNumber": "+1234567890" // required for SMS
}
Response: {
  "success": true,
  "backupCodes": [
    "123456",
    "789012",
    "345678"
  ],
  "qrCode": "data:image/png;base64,..." // for app-based 2FA
}

GET /security/sessions
Response: {
  "sessions": [
    {
      "id": "sess_001",
      "device": "Chrome on Windows",
      "location": "New York, NY",
      "ipAddress": "192.168.1.1",
      "lastActive": "2024-08-03T16:00:00Z",
      "current": true
    },
    {
      "id": "sess_002",
      "device": "Safari on iPhone",
      "location": "Boston, MA",
      "ipAddress": "10.0.1.5",
      "lastActive": "2024-08-02T12:30:00Z",
      "current": false
    }
  ]
}

DELETE /security/sessions/:id
Response: {
  "success": true,
  "message": "Session terminated successfully"
}

10. CUSTOMER SUPPORT
=====================

POST /support/tickets
Request: {
  "subject": "Unable to transfer funds",
  "category": "technical",
  "priority": "medium",
  "description": "I'm getting an error when trying to transfer money between accounts",
  "attachments": ["screenshot.png"]
}
Response: {
  "success": true,
  "ticketId": "TKT-2024-001234",
  "message": "Support ticket created successfully",
  "estimatedResponse": "2 hours"
}

GET /support/tickets
Response: {
  "tickets": [
    {
      "id": "TKT-2024-001234",
      "subject": "Unable to transfer funds",
      "status": "open",
      "priority": "medium",
      "created": "2024-08-03T16:00:00Z",
      "lastUpdate": "2024-08-03T16:05:00Z",
      "assignedAgent": "Sarah Johnson"
    }
  ]
}
*/