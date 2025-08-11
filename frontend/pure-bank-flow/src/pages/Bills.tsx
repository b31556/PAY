import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, getBillers, SendRequest } from "@/lib/banking-api";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Plus, 
  History,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Bills = () => {
  const [user, setUser] = useState<any>(null);
  const [billers, setBillers] = useState<any[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setBillers(getBillers());
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatus = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return { status: "overdue", color: "destructive" };
    if (daysUntilDue <= 3) return { status: "due-soon", color: "warning" };
    return { status: "on-time", color: "default" };
  };

  const handlePayBill = async () => {
    if (!selectedBiller || !paymentAmount || !paymentAccount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all payment details",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await SendRequest("/pay-bill", {
        biller: selectedBiller.name,
        amount: paymentAmount,
        account: paymentAccount
      });

      // Reset payment form
      setSelectedBiller(null);
      setPaymentAmount("");
      setPaymentAccount("");
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock payment history
  const paymentHistory = [
    { id: "1", biller: "Electric Company", amount: 125.50, date: "2024-07-15", status: "completed" },
    { id: "2", biller: "Internet Provider", amount: 89.99, date: "2024-07-10", status: "completed" },
    { id: "3", biller: "Phone Company", amount: 65.00, date: "2024-06-20", status: "completed" },
    { id: "4", biller: "Insurance", amount: 156.75, date: "2024-06-25", status: "completed" },
  ];

  const eligibleAccounts = user?.accounts?.filter((acc: any) => acc.type !== "Credit") || [];

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Pay Bills</h1>
          <p className="text-muted-foreground mt-2">Manage your bill payments and view payment history</p>
        </div>

        <Tabs defaultValue="pay-bills" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pay-bills">Pay Bills</TabsTrigger>
            <TabsTrigger value="payment-history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="pay-bills" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Billers List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Your Billers</CardTitle>
                        <CardDescription>Select a biller to make a payment</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Biller
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {billers.map((biller) => {
                        const daysUntilDue = getDaysUntilDue(biller.dueDate);
                        const billStatus = getBillStatus(daysUntilDue);
                        
                        return (
                          <div
                            key={biller.id}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              selectedBiller?.id === biller.id ? 'border-banking-primary bg-banking-primary/5' : ''
                            }`}
                            onClick={() => {
                              setSelectedBiller(biller);
                              setPaymentAmount(biller.lastAmount.toString());
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-banking-primary/10 rounded-lg">
                                  <CreditCard className="w-5 h-5 text-banking-primary" />
                                </div>
                                <div>
                                  <h3 className="font-medium">{biller.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Last payment: {formatCurrency(biller.lastAmount)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={billStatus.color as any} className="mb-2">
                                  {billStatus.status === "overdue" && "Overdue"}
                                  {billStatus.status === "due-soon" && "Due Soon"}
                                  {billStatus.status === "on-time" && "On Time"}
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Due {formatDate(biller.dueDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Make Payment</CardTitle>
                    <CardDescription>
                      {selectedBiller ? `Pay ${selectedBiller.name}` : "Select a biller to continue"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedBiller ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-5 h-5 text-banking-primary" />
                            <h4 className="font-medium">{selectedBiller.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(selectedBiller.dueDate)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Payment Amount</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Last payment: {formatCurrency(selectedBiller.lastAmount)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Payment Account</Label>
                          <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleAccounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.type} {account.accountNumber}
                                  <span className="text-muted-foreground ml-2">
                                    {formatCurrency(account.balance)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          onClick={handlePayBill}
                          className="w-full bg-gradient-to-r from-banking-primary to-banking-secondary"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            "Processing Payment..."
                          ) : (
                            <>
                              Pay {paymentAmount && `$${paymentAmount}`}
                              <DollarSign className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Select a biller from the list to make a payment
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Security */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Secure payment processing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-banking-primary" />
                      <span className="text-sm">Same-day processing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-banking-warning" />
                      <span className="text-sm">Payment confirmation via email</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment-history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Payment History
                </CardTitle>
                <CardDescription>View your recent bill payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-success/10 rounded-full">
                          <CheckCircle className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.biller}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(payment.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <Badge variant="default" className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BankingLayout>
  );
};

export default Bills;