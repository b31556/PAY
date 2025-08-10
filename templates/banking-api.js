// Custom Banking API methods
// These replace standard fetch and navigation methods

// Mock authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

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
async function Redirect(url) {
    console.log(`Redirecting to ${url}`);
    // show loading overlay
    

                // 5. Üzenet titkosítása NaCl Box-szal és aláírása
              const message_payload = JSON.stringify({ data: {}, session_id: window.session_id, url: `/app${url}` });
              const message_payload_bytes = new TextEncoder().encode(message_payload); // Convert to Uint8Array
              const nonceBox = nacl.randomBytes(24);
              const encryptedMessage = nacl.box(
                message_payload_bytes,
                nonceBox,
                serverEncPubKeyBytes,
                clientPrivateKey
              );
              // Aláírás (titkosítatlan üzenet!)
              const signature = nacl.sign.detached(message_payload_bytes, clientSignPrivateKey);

              redirectRes = await fetch(`/app${url}`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                  encrypted: bytesToHex(new Uint8Array([...nonceBox, ...encryptedMessage])),
                  signature: bytesToHex(signature),
                  session_id: session_id // Include session ID for server tracking
                })
              }).then(async resp => {
                  
                  if (resp.status !== 200) {
                    alert("Login failed.");
                    window.location.reload();
                    return;
                  }

                  const data = await resp.json();
                  if (data.response && data.signature) {
                    // Válasz dekódolása
                    const encryptedResp = hexToBytes(data.response);
                    const respNonce = encryptedResp.slice(0, 24);
                    const respCipher = encryptedResp.slice(24);
                    const decrypted = nacl.box.open(
                      respCipher,
                      respNonce,
                      serverEncPubKeyBytes,
                      clientPrivateKey
                    );
                    if (decrypted) {
                      // Ellenőrizzük a szerver szignatúráját
                      const serverValid = nacl.sign.detached.verify(
                        decrypted,
                        hexToBytes(data.signature),
                        serverSignPubKeyBytes
                      );
                      if (serverValid) {
                        // write the page url
                        const payload = JSON.parse(new TextDecoder().decode(decrypted));

                        document.body.innerHTML = payload.html || 'sorry error, please reload the page';

                        window.scrollTo(0, 0);

                        const scripts = payload.scripts || [];  // Notice: 'scripts', not 'script'

                        for (const code of scripts) {
                            const scriptTag = document.createElement('script');
                            scriptTag.textContent = code || '';
                            document.body.appendChild(scriptTag);
                        }

                        const styleTag = document.createElement('style');
                        styleTag.id = 'dynamic-style';
                        document.body.appendChild(styleTag);
                        styleTag.textContent = payload.style || 'text { color: #000; }';
                        document.title = payload.title || 'Payment Portal';
                    }
                    }
                }
            });
        }

// Check authentication status
function isAuthenticated() {
    return !!authToken;
}

// Get current user
function getCurrentUser() {
    
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
            ]
        };
    
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
            
            return {
                accounts: getCurrentUser().accounts
            };

        case '/transactions':
            
            return {
                transactions: getTransactions(data.accountId)
            };

        case '/transfer':
            
            if (!data.fromAccount || !data.toAccount || !data.amount) {
                throw new Error('Missing transfer data');
            }
            return {
                success: true,
                transactionId: 'txn_' + Date.now(),
                message: 'Transfer completed successfully'
            };

        case '/bills/pay':
            
            if (!data.billerId || !data.amount) {
                throw new Error('Missing bill payment data');
            }
            return {
                success: true,
                confirmationNumber: 'CONF_' + Date.now(),
                message: 'Bill payment scheduled successfully'
            };

        case '/bills':
            
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
            
            return {
                success: true,
                message: 'Profile updated successfully'
            };

        case '/settings/update':
            
            return {
                success: true,
                message: 'Settings updated successfully'
            };

        default:
            throw new Error('Unknown endpoint');
    }
}

// Logout function
function logout() {
    SendRequest('/logout').then(() => {
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