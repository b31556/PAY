// Custom Banking API methods
// These replace standard fetch and navigation methods

// Mock authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Custom SendRequest method
async function SendRequest(url, data = {}) {
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            console.log(`SendRequest to ${url}:`, data);
            
            try {
                const response = handleMockRequest(url, data);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        }, 500);
    });
}

// Custom Redirect method
function Redirect(url) {
    console.log(`Redirecting to: ${url}`);
    window.location.href = url;
}

// Check authentication status
function isAuthenticated() {
    return !!authToken;
}

// Persist user changes
function saveCurrentUser() {
    if (currentUser) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (e) {
            console.warn('Failed to persist user to localStorage');
        }
    }
}

// Get current user (with localStorage persistence)
function getCurrentUser() {
    if (authToken && !currentUser) {
        // Try loading from localStorage first
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) currentUser = JSON.parse(stored);
        } catch (e) {
            currentUser = null;
        }

        // Fallback to default user if nothing stored
        if (!currentUser) {
            currentUser = {
                id: "user_123",
                name: "John Doe",
                email: "john.doe@example.com",
                phone: "+1 (555) 123-4567",
                accounts: [
                    {
                        id: "acc_checking",
                        type: "Checking",
                        accountNumber: "****1234",
                        balance: 5420.50,
                        status: "active"
                    },
                    {
                        id: "acc_savings",
                        type: "Savings",
                        accountNumber: "****5678",
                        balance: 12850.75,
                        status: "active"
                    },
                    {
                        id: "acc_credit",
                        type: "Credit Card",
                        accountNumber: "****9012",
                        balance: -1250.00,
                        status: "active",
                        creditLimit: 5000
                    }
                ],
                cards: [
                    {
                        id: 'card_001',
                        accountId: 'acc_checking',
                        brand: 'Visa',
                        holderName: 'John Doe',
                        last4: '1234',
                        expiry: '12/27',
                        status: 'active',
                        type: 'physical'
                    },
                    {
                        id: 'card_002',
                        accountId: 'acc_credit',
                        brand: 'Mastercard',
                        holderName: 'John Doe',
                        last4: '9012',
                        expiry: '05/26',
                        status: 'active',
                        type: 'physical'
                    }
                ]
            };
            saveCurrentUser();
        }
    }
    return currentUser;
}

// Get transactions
function getTransactions(accountId = null) {
    const allTransactions = [
        {
            id: "txn_001",
            accountId: "acc_checking",
            description: "Direct Deposit - Salary",
            amount: 3200.00,
            type: "credit",
            date: "2024-01-15",
            category: "Income"
        },
        {
            id: "txn_002",
            accountId: "acc_checking",
            description: "Coffee Shop Purchase",
            amount: -4.50,
            type: "debit",
            date: "2024-01-14",
            category: "Food & Dining"
        },
        {
            id: "txn_003",
            accountId: "acc_savings",
            description: "Interest Payment",
            amount: 15.25,
            type: "credit",
            date: "2024-01-13",
            category: "Interest"
        },
        {
            id: "txn_004",
            accountId: "acc_credit",
            description: "Online Shopping",
            amount: -125.99,
            type: "debit",
            date: "2024-01-12",
            category: "Shopping"
        },
        {
            id: "txn_005",
            accountId: "acc_checking",
            description: "ATM Withdrawal",
            amount: -100.00,
            type: "debit",
            date: "2024-01-11",
            category: "Cash"
        }
    ];

    if (accountId) {
        return allTransactions.filter(t => t.accountId === accountId);
    }
    return allTransactions;
}

// Mock request handler
function handleMockRequest(url, data) {
    switch (url) {
        case '/login':
            if (data.email === 'demo@example.com' && data.password === 'demo123') {
                authToken = 'mock_auth_token_' + Date.now();
                localStorage.setItem('authToken', authToken);
                return { success: true, token: authToken };
            } else {
                throw new Error('Invalid credentials');
            }

        case '/signup':
            if (data.email && data.password && data.name) {
                authToken = 'mock_auth_token_' + Date.now();
                localStorage.setItem('authToken', authToken);
                return { success: true, token: authToken };
            } else {
                throw new Error('Invalid signup data');
            }

        case '/logout':
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            return { success: true };

        case '/dashboard':
            if (!authToken) throw new Error('Not authenticated');
            return {
                user: getCurrentUser(),
                recentTransactions: getTransactions().slice(0, 5),
                summary: {
                    totalBalance: 16020.25,
                    monthlyIncome: 3200.00,
                    monthlyExpenses: 1150.75
                }
            };

        case '/accounts':
            if (!authToken) throw new Error('Not authenticated');
            return {
                accounts: getCurrentUser().accounts
            };

        case '/transactions':
            if (!authToken) throw new Error('Not authenticated');
            return {
                transactions: getTransactions(data.accountId)
            };

        case '/transfer':
            if (!authToken) throw new Error('Not authenticated');
            if (!data.fromAccount || !data.toAccount || !data.amount) {
                throw new Error('Missing transfer data');
            }
            return {
                success: true,
                transactionId: 'txn_' + Date.now(),
                message: 'Transfer completed successfully'
            };

        case '/bills/pay':
            if (!authToken) throw new Error('Not authenticated');
            if (!data.billerId || !data.amount) {
                throw new Error('Missing bill payment data');
            }
            return {
                success: true,
                confirmationNumber: 'CONF_' + Date.now(),
                message: 'Bill payment scheduled successfully'
            };

        case '/bills':
            if (!authToken) throw new Error('Not authenticated');
            return {
                billers: [
                    { id: '1', name: 'Electric Company', accountNumber: '****1234', nextDue: '2024-02-01', amount: 120.50 },
                    { id: '2', name: 'Internet Provider', accountNumber: '****5678', nextDue: '2024-02-05', amount: 79.99 },
                    { id: '3', name: 'Credit Card', accountNumber: '****9012', nextDue: '2024-02-10', amount: 250.00 }
                ],
                recentPayments: [
                    { id: 'p1', biller: 'Electric Company', amount: 115.25, date: '2024-01-01', status: 'completed' },
                    { id: 'p2', biller: 'Internet Provider', amount: 79.99, date: '2023-12-30', status: 'completed' }
                ]
            };

        case '/profile/update':
            if (!authToken) throw new Error('Not authenticated');
            return {
                success: true,
                message: 'Profile updated successfully'
            };

case '/settings/update':
    if (!authToken) throw new Error('Not authenticated');
    return {
        success: true,
        message: 'Settings updated successfully'
    };

case '/accounts/create':
    if (!authToken) throw new Error('Not authenticated');
    if (!data.type) throw new Error('Missing account type');
    const userForCreate = getCurrentUser();
    const newId = 'acc_' + Date.now();
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const baseAccount = {
        id: newId,
        type: data.type,
        accountNumber: '****' + last4,
        balance: Number(data.type === 'Credit Card' ? -(Number(data.balance || 0)) : (Number(data.balance || 0))),
        status: 'active'
    };
    if (data.type === 'Credit Card') {
        baseAccount.creditLimit = Number(data.creditLimit || 0);
    }
    userForCreate.accounts.push(baseAccount);
    saveCurrentUser();
    return { success: true, account: baseAccount };

case '/cards':
    if (!authToken) throw new Error('Not authenticated');
    return { cards: (getCurrentUser().cards || []) };

case '/cards/create':
    if (!authToken) throw new Error('Not authenticated');
    const userCards = getCurrentUser();
    if (!data.accountId) throw new Error('Missing linked account');
    const linked = (userCards.accounts || []).find(a => a.id === data.accountId);
    if (!linked) throw new Error('Linked account not found');
    const brand = (data.brand || 'Visa');
    const holderName = data.holderName || (userCards.name || 'Cardholder');
    const last4 = (linked.accountNumber && linked.accountNumber.slice(-4)) || String(Math.floor(1000 + Math.random() * 9000));
    const expYear = new Date().getFullYear() + 3;
    const expMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const newCard = {
        id: 'card_' + Date.now(),
        accountId: linked.id,
        brand: brand,
        holderName,
        last4,
        expiry: `${expMonth}/${String(expYear).slice(-2)}`,
        status: 'active',
        type: data.type || 'physical'
    };
    userCards.cards = userCards.cards || [];
    userCards.cards.push(newCard);
    saveCurrentUser();
    return { success: true, card: newCard };

case '/cards/toggle':
    if (!authToken) throw new Error('Not authenticated');
    if (!data.cardId) throw new Error('Missing card id');
    const u = getCurrentUser();
    const card = (u.cards || []).find(c => c.id === data.cardId);
    if (!card) throw new Error('Card not found');
    card.status = card.status === 'frozen' ? 'active' : 'frozen';
    saveCurrentUser();
    return { success: true, status: card.status, message: `Card ${card.status}` };

default:
    throw new Error('Unknown endpoint');
    }
}

// Logout function
function logout() {
    SendRequest('/logout').then(() => {
        try { localStorage.removeItem('currentUser'); } catch {}
        Redirect('login.html');
    });
}

// Toast notification system
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.25rem;">
            ${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning'}
        </div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}