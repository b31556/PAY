
        // Load accounts data
        async function loadAccounts() {
            try {
                const response = await SendRequest('/accounts');
                const accounts = response.accounts;
                
                // Calculate totals
                const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
                const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
                const creditAccount = accounts.find(acc => acc.type === 'Credit Card');
                const availableCredit = creditAccount ? creditAccount.creditLimit + creditAccount.balance : 0;

                // Update summary
                document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
                document.getElementById('activeAccounts').textContent = activeAccounts;
                document.getElementById('availableCredit').textContent = formatCurrency(availableCredit);

                // Populate accounts list
                const accountsList = document.getElementById('accountsList');
                accountsList.innerHTML = accounts.map(account => `
                    <div class="card mb-4">
                        <div class="card-content">
                            <div style="display: flex; justify-content: between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <span style="font-size: 1.5rem;">💳</span>
                                        <h3 class="text-xl font-bold">${account.type}</h3>
                                        <span class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                            ${account.status}
                                        </span>
                                    </div>
                                    <p class="text-muted">Account Number: ${account.accountNumber}</p>
                                    ${account.creditLimit ? `<p class="text-muted">Credit Limit: ${formatCurrency(account.creditLimit)}</p>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <p class="text-2xl font-bold ${account.balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                                        ${formatCurrency(account.balance)}
                                    </p>
                                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                        <a href="transactions.html?account=${account.id}" class="btn btn-secondary btn-sm" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                                            View Transactions
                                        </a>
                                        <a href="transfer.html?from=${account.id}" class="btn btn-primary btn-sm" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                                            Transfer
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');

            } catch (error) {
                showToast('Failed to load accounts data', 'error');
                console.error('Accounts error:', error);
            }
        }

        // Load accounts on page load
        loadAccounts();