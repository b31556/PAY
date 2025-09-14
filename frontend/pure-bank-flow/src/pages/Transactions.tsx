import { useEffect, useState } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, SendRequest } from "@/lib/banking-api";
import { checkBackendConnectivity } from "@/lib/backend-connectivity";
import BackendOfflineOverlay from "@/components/BackendOfflineOverlay";
import { 
  ArrowUpRight, ArrowDownLeft, Search, Filter,
  Download, Calendar, Clock, CheckCircle, XCircle
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface Transaction {
  id: string;
  state: "pending" | "completed" | "failed";
  type: "expense" | "income";
  amount: number;
  memo?: string;
  title: string;
  created_at: string;
  from_account?: string;
  to_account?: string;
}

interface TransactionsResponse {
  total_expenses: number;
  total_income: number;
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const Transactions = () => {
  const [user, setUser] = useState<any>(null);
  const [transactionsData, setTransactionsData] = useState<TransactionsResponse | null>(null);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<Transaction | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userData = getCurrentUser();
        setUser(userData);

        const accountFilter = searchParams.get("account");
        if (accountFilter && accountFilter !== "all") {
          setSelectedAccount(accountFilter);
        }

        const response = await SendRequest("/transactions", { page: currentPage });

        if (response.success && response.data) {
          setTransactionsData(response.data);
          setFilteredTransactions(
            Array.isArray(response.data.transactions) ? response.data.transactions : []
          );
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setBackendOffline(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, currentPage]);

  useEffect(() => {
    if (!transactionsData) return;

    let filtered = Array.isArray(transactionsData.transactions)
      ? transactionsData.transactions
      : [];

    if (selectedType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedType);
    }

    if (selectedState !== "all") {
      filtered = filtered.filter((t) => t.state === selectedState);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.memo && t.memo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredTransactions(filtered);
  }, [transactionsData, selectedAccount, selectedType, selectedState, searchTerm, user]);

  useEffect(() => {
    checkBackendConnectivity().then((ok) => {
      if (!ok) setBackendOffline(true);
    });
  }, []);

  const fetchTransactionDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const response = await SendRequest("/transactions/details", { transaction_id: id });
      if (response.success && response.data) {
        setTransactionDetails(response.data.transaction);
      }
    } catch (err) {
      console.error("Error loading transaction details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "income" ? (
      <ArrowDownLeft className="w-4 h-4" />
    ) : (
      <ArrowUpRight className="w-4 h-4" />
    );
  };

  const getTypeColor = (type: string) => {
    return type === "income" ? "text-green-600" : "text-red-600";
  };

  const handleExportCSV = () => {
    if (!filteredTransactions.length) return;

    const csvContent = [
      ["Date", "Title", "Type", "Amount", "State", "Memo"].join(","),
      ...filteredTransactions.map((t) =>
        [
          formatDate(t.created_at),
          `"${t.title}"`,
          t.type,
          t.amount,
          t.state,
          `"${t.memo || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const netAmount =
    (transactionsData?.total_income || 0) - (transactionsData?.total_expenses || 0);

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
          <p className="text-muted-foreground mt-2">
            View and search your account activity
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Transactions</CardDescription>
              <CardTitle className="text-2xl">{transactionsData?.total || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Income (This Month)</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(transactionsData?.total_income || 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Expenses (This Month)</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {formatCurrency(transactionsData?.total_expenses || 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Amount (This Month)</CardDescription>
              <CardTitle
                className={`text-2xl ${
                  netAmount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(netAmount)}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Search Transactions</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title or memo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="expense">Expenses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Actions</Label>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleExportCSV}
                  disabled={
                    !Array.isArray(filteredTransactions) ||
                    filteredTransactions.length === 0
                  }
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Page Info</Label>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  Page {transactionsData?.page || 1} of{" "}
                  {transactionsData?.total_pages || 1}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Showing {filteredTransactions.length} of {transactionsData?.total || 0}{" "}
              transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(filteredTransactions) && filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      fetchTransactionDetails(transaction.id);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.title}</p>
                        {transaction.memo && (
                          <p className="text-sm text-muted-foreground">
                            {transaction.memo}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-medium ${getTypeColor(
                          transaction.type
                        )}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.type}
                        </Badge>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStateColor(
                            transaction.state
                          )}`}
                        >
                          {getStateIcon(transaction.state)}
                          <span className="capitalize">{transaction.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No transactions found matching your criteria.
                  </p>
                </div>
              )}
            </div>

            {transactionsData && transactionsData.total_pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(transactionsData.page - 1) * transactionsData.per_page + 1}{" "}
                  to{" "}
                  {Math.min(
                    transactionsData.page * transactionsData.per_page,
                    transactionsData.total
                  )}{" "}
                  of {transactionsData.total} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactionsData.page <= 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactionsData.page >= transactionsData.total_pages}
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(transactionsData.total_pages, prev + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Modal */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => {
          setSelectedTransaction(null);
          setTransactionDetails(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <p>Loading...</p>
          ) : transactionDetails ? (
            <div className="space-y-4">
              <p>
                <strong>Title:</strong> {transactionDetails.title}
              </p>
              <p>
                <strong>Amount:</strong> {formatCurrency(transactionDetails.amount)}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                <span className={getTypeColor(transactionDetails.type)}>
                  {transactionDetails.type}
                </span>
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={getStateColor(transactionDetails.state)}>
                  {transactionDetails.state}
                </span>
              </p>
              <p>
                <strong>Date:</strong> {formatDate(transactionDetails.created_at)}
              </p>
              <p>
                <strong>From Account:</strong>{" "}
                {transactionDetails.from_account || "N/A"}
              </p>
              <p>
                <strong>To Account:</strong>{" "}
                {transactionDetails.to_account || "N/A"}
              </p>
              {transactionDetails.memo && (
                <p>
                  <strong>Memo:</strong> {transactionDetails.memo}
                </p>
              )}
            </div>
          ) : (
            <p>No details found.</p>
          )}
        </DialogContent>
      </Dialog>
    </BankingLayout>
  );
};

export default Transactions;
