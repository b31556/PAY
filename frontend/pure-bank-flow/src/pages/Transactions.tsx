import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, getTransactions } from "@/lib/banking-api";
import { checkBackendConnectivity } from "@/lib/backend-connectivity";
import BackendOfflineOverlay from "@/components/BackendOfflineOverlay";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  Download,
  Calendar
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface Transaction {
  id: string;
  date?: string;
  created_at?: string;
  description: string;
  amount: number;
  type: string;
  accountId?: string;
}

const Transactions = () => {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userData = getCurrentUser();
        setUser(userData);
        
        // Check if specific account is requested via URL params
        const accountFilter = searchParams.get('account');
        if (accountFilter) {
          setSelectedAccount(accountFilter);
        }
        
        // Fetch transactions with optional account filter
        const accountId = accountFilter !== "all" ? accountFilter : undefined;
        const transactionsData = await getTransactions(accountId);
console.log("transactionsData:", transactionsData); // debug

const txs = Array.isArray(transactionsData) 
  ? transactionsData 
  : transactionsData?.transactions || [];

setTransactions(txs);
setFilteredTransactions(txs);

      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams]);

  useEffect(() => {
    let filtered = transactions;

    // Filter by account
    if (selectedAccount !== "all") {
      filtered = filtered.filter(t => t.accountId === selectedAccount);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, selectedAccount, selectedType, searchTerm]);

  useEffect(() => {
    checkBackendConnectivity().then(ok => {
      if (!ok) setBackendOffline(true);
    });
  }, [searchParams]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionDate = (transaction: Transaction) => {
    return transaction.created_at || transaction.date;
  };

  const getAccountName = (accountId: string) => {
    const account = user?.accounts?.find((acc: any) => acc.id === accountId);
    return account ? `${account.type} ${account.accountNumber}` : 'Unknown Account';
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <BankingLayout>
        <div className="space-y-8">
          <div className="h-6 w-64 bg-gray-200 animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </BankingLayout>
    );
  }

  if (backendOffline) {
    return <BackendOfflineOverlay />;
  }

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground mt-2">View and search your account activity</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Transactions</CardDescription>
              <CardTitle className="text-2xl">{filteredTransactions.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Credits</CardDescription>
              <CardTitle className="text-2xl text-success">
                {filteredTransactions.filter(t => t.type === 'credit').length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Debits</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {filteredTransactions.filter(t => t.type === 'debit').length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Amount</CardDescription>
              <CardTitle className={`text-2xl ${totalAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Transactions</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {user?.accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.type} {account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credits Only</SelectItem>
                    <SelectItem value="debit">Debits Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Actions</Label>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Showing {filteredTransactions.length} transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found matching your criteria.</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'credit' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {transaction.type === 'credit' ? 
                          <ArrowDownLeft className="w-4 h-4" /> : 
                          <ArrowUpRight className="w-4 h-4" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{formatDate(getTransactionDate(transaction))}</p>
                          {transaction.accountId && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <p className="text-sm text-muted-foreground">{getAccountName(transaction.accountId)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-medium ${
                        transaction.type === 'credit' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.type === 'credit' ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge 
                        variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </BankingLayout>
  );
};

export default Transactions;