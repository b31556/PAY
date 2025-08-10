        accounts = [];

        // Load accounts and populate dropdowns
        async function loadAccounts() {
            try {
                const user = getCurrentUser();
                accounts = user.accounts.filter(acc => acc.status === 'active');
                
                const fromSelect = document.getElementById('fromAccount');
                const toSelect = document.getElementById('toAccount');
                
                // Clear existing options
                fromSelect.innerHTML = '<option value="">Select source account</option>';
                toSelect.innerHTML = '<option value="">Select destination account</option>';
                
                // Populate dropdowns
                accounts.forEach(account => {
                    const option1 = document.createElement('option');
                    option1.value = account.id;
                    option1.textContent = `${account.type} ${account.accountNumber} - ${formatCurrency(account.balance)}`;
                    fromSelect.appendChild(option1);
                    
                    const option2 = document.createElement('option');
                    option2.value = account.id;
                    option2.textContent = `${account.type} ${account.accountNumber}`;
                    toSelect.appendChild(option2);
                });

                // Check URL params for pre-selected account
                const urlParams = new URLSearchParams(window.location.search);
                const fromParam = urlParams.get('from');
                if (fromParam) {
                    fromSelect.value = fromParam;
                    updateAvailableBalance();
                }

                loadRecentTransfers();
                
            } catch (error) {
                showToast('Failed to load accounts', 'error');
                console.error('Accounts error:', error);
            }
        }

        // Update available balance when from account changes
        function updateAvailableBalance() {
            const fromAccountId = document.getElementById('fromAccount').value;
            const account = accounts.find(acc => acc.id === fromAccountId);
            const availableBalance = document.getElementById('availableBalance');
            
            if (account) {
                availableBalance.textContent = formatCurrency(account.balance);
            } else {
                availableBalance.textContent = '$0.00';
            }
        }

        // Update transfer summary
        function updateSummary() {
            const amount = parseFloat(document.getElementById('amount').value) || 0;
            document.getElementById('summaryAmount').textContent = formatCurrency(amount);
            document.getElementById('summaryTotal').textContent = formatCurrency(amount);
        }

        // Load recent transfers
        function loadRecentTransfers() {
            const recentTransfers = [
                { from: 'Checking ****1234', to: 'Savings ****5678', amount: 500.00, date: '2024-01-14' },
                { from: 'Savings ****5678', to: 'Checking ****1234', amount: 200.00, date: '2024-01-10' },
                { from: 'Checking ****1234', to: 'Credit ****9012', amount: 300.00, date: '2024-01-08' }
            ];

            const recentTransfersDiv = document.getElementById('recentTransfers');
            recentTransfersDiv.innerHTML = recentTransfers.map(transfer => `
                <div class="transaction-item">
                    <div>
                        <p class="font-bold">${transfer.from} → ${transfer.to}</p>
                        <p class="text-sm text-muted">${formatDate(transfer.date)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold">${formatCurrency(transfer.amount)}</p>
                    </div>
                </div>
            `).join('');
        }

        // Validate transfer
        function validateTransfer() {
            const fromAccount = document.getElementById('fromAccount').value;
            const toAccount = document.getElementById('toAccount').value;
            const amount = parseFloat(document.getElementById('amount').value);

            if (!fromAccount) {
                showToast('Please select a source account', 'error');
                return false;
            }

            if (!toAccount) {
                showToast('Please select a destination account', 'error');
                return false;
            }

            if (fromAccount === toAccount) {
                showToast('Source and destination accounts must be different', 'error');
                return false;
            }

            if (!amount || amount <= 0) {
                showToast('Please enter a valid amount', 'error');
                return false;
            }

            const sourceAccount = accounts.find(acc => acc.id === fromAccount);
            if (amount > sourceAccount.balance) {
                showToast('Insufficient funds in source account', 'error');
                return false;
            }

            return true;
        }

        // Handle form submission
        document.getElementById('transferForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateTransfer()) return;

            const submitBtn = document.getElementById('submitBtn');
            const formData = {
                fromAccount: document.getElementById('fromAccount').value,
                toAccount: document.getElementById('toAccount').value,
                amount: parseFloat(document.getElementById('amount').value),
                memo: document.getElementById('memo').value
            };

            // Show loading state
            submitBtn.innerHTML = '<span class="spinner"></span>Processing Transfer...';
            submitBtn.disabled = true;

            try {
                const response = await SendRequest('/transfer', formData);
                
                if (response.success) {
                    showToast('Transfer completed successfully!', 'success');
                    document.getElementById('transferForm').reset();
                    updateAvailableBalance();
                    updateSummary();
                    loadRecentTransfers();
                } else {
                    throw new Error('Transfer failed');
                }
            } catch (error) {
                showToast(error.message || 'Transfer failed', 'error');
            } finally {
                submitBtn.innerHTML = 'Transfer Funds';
                submitBtn.disabled = false;
            }
        });

        // Event listeners
        document.getElementById('fromAccount').addEventListener('change', updateAvailableBalance);
        document.getElementById('amount').addEventListener('input', updateSummary);

        // Load accounts on page load
        loadAccounts();