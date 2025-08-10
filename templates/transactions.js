        allTransactions = [];
        filteredTransactions = [];

        // Load transactions data
        async function loadTransactions() {
            try {
                const user = getCurrentUser();
                const response = await SendRequest('/transactions');
                allTransactions = response.transactions;
                filteredTransactions = [...allTransactions];
                
                // Populate account filter
                const accountFilter = document.getElementById('accountFilter');
                user.accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.type} ${account.accountNumber}`;
                    accountFilter.appendChild(option);
                });

                // Check URL params for account filter
                const urlParams = new URLSearchParams(window.location.search);
                const accountParam = urlParams.get('account');
                if (accountParam) {
                    accountFilter.value = accountParam;
                }

                updateDisplay();
                
            } catch (error) {
                showToast('Failed to load transactions', 'error');
                console.error('Transactions error:', error);
            }
        }

        // Filter transactions
        function filterTransactions() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const accountFilter = document.getElementById('accountFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;

            filteredTransactions = allTransactions.filter(transaction => {
                const matchesSearch = transaction.description.toLowerCase().includes(searchTerm);
                const matchesAccount = accountFilter === 'all' || transaction.accountId === accountFilter;
                const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
                
                return matchesSearch && matchesAccount && matchesType;
            });

            updateDisplay();
        }

        // Update display
        function updateDisplay() {
            const user = getCurrentUser();
            
            // Update summary
            const totalCredits = filteredTransactions.filter(t => t.type === 'credit').length;
            const totalDebits = filteredTransactions.filter(t => t.type === 'debit').length;
            const netAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

            document.getElementById('totalTransactions').textContent = filteredTransactions.length;
            document.getElementById('totalCredits').textContent = totalCredits;
            document.getElementById('totalDebits').textContent = totalDebits;
            document.getElementById('netAmount').textContent = formatCurrency(netAmount);
            document.getElementById('netAmount').className = `text-2xl font-bold ${netAmount >= 0 ? 'text-success' : 'text-error'}`;
            document.getElementById('transactionCount').textContent = filteredTransactions.length;

            // Update transactions list
            const transactionsList = document.getElementById('transactionsList');
            
            if (filteredTransactions.length === 0) {
                transactionsList.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <p class="text-muted">No transactions found matching your criteria.</p>
                    </div>
                `;
            } else {
                transactionsList.innerHTML = filteredTransactions.map(transaction => {
                    const account = user.accounts.find(acc => acc.id === transaction.accountId);
                    const accountName = account ? `${account.type} ${account.accountNumber}` : 'Unknown Account';
                    
                    return `
                        <div class="transaction-item">
                            <div style="display: flex; align-items: center;">
                                <div class="transaction-icon ${transaction.type}">
                                    ${transaction.type === 'credit' ? '↓' : '↑'}
                                </div>
                                <div>
                                    <p class="font-bold">${transaction.description}</p>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                                        <span style="font-size: 0.75rem;">📅</span>
                                        <p class="text-sm text-muted">${formatDate(transaction.date)}</p>
                                        <span class="text-muted">•</span>
                                        <p class="text-sm text-muted">${accountName}</p>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <p class="text-lg font-bold ${transaction.type === 'credit' ? 'text-success' : 'text-error'}">
                                    ${transaction.type === 'credit' ? '+' : ''}${formatCurrency(transaction.amount)}
                                </p>
                                <span class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                    ${transaction.type === 'credit' ? 'Credit' : 'Debit'}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', filterTransactions);
        document.getElementById('accountFilter').addEventListener('change', filterTransactions);
        document.getElementById('typeFilter').addEventListener('change', filterTransactions);

        // Load transactions on page load
        loadTransactions();