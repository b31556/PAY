

        // Load dashboard data
        async function loadDashboard() {
            try {
                const response = await SendRequest('/dashboard');
                const user = response.user;
                
                // Update user name
                document.getElementById('userName').textContent = user.name;

                // Populate account summary
                const accountSummary = document.getElementById('accountSummary');
                accountSummary.innerHTML = user.accounts.map(account => `
                    <div class="card">
                        <div class="card-content" style="padding: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <span>💳</span>
                                <h3 class="font-bold">${account.type}</h3>
                            </div>
                            <p class="text-sm text-muted">${account.accountNumber}</p>
                            <p class="text-2xl font-bold ${account.balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                                ${formatCurrency(account.balance)}
                            </p>
                        </div>
                    </div>
                `).join('');

                // Populate recent transactions
                const recentTransactions = document.getElementById('recentTransactions');
                recentTransactions.innerHTML = response.recentTransactions.map(transaction => `
                    <div class="transaction-item">
                        <div style="display: flex; align-items: center;">
                            <div class="transaction-icon ${transaction.type}">
                                ${transaction.type === 'credit' ? '↓' : '↑'}
                            </div>
                            <div>
                                <p class="font-bold">${transaction.description}</p>
                                <p class="text-sm text-muted">${formatDate(transaction.date)}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold ${transaction.type === 'credit' ? 'text-success' : 'text-error'}">
                                ${transaction.type === 'credit' ? '+' : ''}${formatCurrency(transaction.amount)}
                            </p>
                        </div>
                    </div>
                `).join('');

            } catch (error) {
                showToast('Failed to load dashboard data', 'error');
                console.error('Dashboard error:', error);
            }
        }

        // Load dashboard on page load
        loadDashboard();