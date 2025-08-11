import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, SendRequest } from "@/lib/banking-api";
import { ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Transfer = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    memo: "",
    transferType: "internal"
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountBalance = (accountId: string) => {
    const account = user?.accounts?.find((acc: any) => acc.id === accountId);
    return account ? account.balance : 0;
  };

  const getAccountName = (accountId: string) => {
    const account = user?.accounts?.find((acc: any) => acc.id === accountId);
    return account ? `${account.type} ${account.accountNumber}` : '';
  };

  const validateTransfer = () => {
    if (!formData.fromAccount || !formData.toAccount) {
      toast({
        title: "Invalid Transfer",
        description: "Please select both source and destination accounts",
        variant: "destructive",
      });
      return false;
    }

    if (formData.fromAccount === formData.toAccount) {
      toast({
        title: "Invalid Transfer",
        description: "Source and destination accounts must be different",
        variant: "destructive",
      });
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than $0",
        variant: "destructive",
      });
      return false;
    }

    const sourceBalance = getAccountBalance(formData.fromAccount);
    if (amount > sourceBalance) {
      toast({
        title: "Insufficient Funds",
        description: "Transfer amount exceeds available balance",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTransfer()) return;
    
    setIsLoading(true);

    try {
      await SendRequest("/transfer", {
        fromAccount: getAccountName(formData.fromAccount),
        toAccount: getAccountName(formData.toAccount),
        amount: formData.amount,
        memo: formData.memo,
        type: formData.transferType
      });

      // Reset form
      setFormData({
        fromAccount: "",
        toAccount: "",
        amount: "",
        memo: "",
        transferType: "internal"
      });

    } catch (error) {
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Failed to process transfer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const eligibleAccounts = user?.accounts?.filter((acc: any) => acc.type !== "Credit") || [];

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Transfer Funds</h1>
          <p className="text-muted-foreground mt-2">Move money between your accounts or to external recipients</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transfer Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
                <CardDescription>Complete the form below to initiate your transfer</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Transfer Type */}
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <Select 
                      value={formData.transferType} 
                      onValueChange={(value) => handleInputChange("transferType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Between My Accounts</SelectItem>
                        <SelectItem value="external">To External Account</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From Account */}
                  <div className="space-y-2">
                    <Label>From Account</Label>
                    <Select 
                      value={formData.fromAccount} 
                      onValueChange={(value) => handleInputChange("fromAccount", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source account" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{account.type} {account.accountNumber}</span>
                              <span className="text-muted-foreground ml-4">
                                {formatCurrency(account.balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.fromAccount && (
                      <p className="text-sm text-muted-foreground">
                        Available balance: {formatCurrency(getAccountBalance(formData.fromAccount))}
                      </p>
                    )}
                  </div>

                  {/* To Account */}
                  <div className="space-y-2">
                    <Label>To Account</Label>
                    {formData.transferType === "internal" ? (
                      <Select 
                        value={formData.toAccount} 
                        onValueChange={(value) => handleInputChange("toAccount", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleAccounts
                            .filter((acc: any) => acc.id !== formData.fromAccount)
                            .map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex justify-between items-center w-full">
                                <span>{account.type} {account.accountNumber}</span>
                                <span className="text-muted-foreground ml-4">
                                  {formatCurrency(account.balance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="External account number or email"
                        value={formData.toAccount}
                        onChange={(e) => handleInputChange("toAccount", e.target.value)}
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="space-y-2">
                    <Label>Memo (Optional)</Label>
                    <Textarea
                      placeholder="Add a note for this transfer..."
                      value={formData.memo}
                      onChange={(e) => handleInputChange("memo", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-banking-primary to-banking-secondary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Processing Transfer..."
                    ) : (
                      <>
                        Transfer {formData.amount && `$${formData.amount}`}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Security & Info */}
          <div className="space-y-6">
            {/* Transfer Summary */}
            {(formData.fromAccount && formData.toAccount && formData.amount) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transfer Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">{getAccountName(formData.fromAccount)}</p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">
                      {formData.transferType === "internal" 
                        ? getAccountName(formData.toAccount)
                        : formData.toAccount || "External Account"
                      }
                    </p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold text-banking-primary">
                      ${formData.amount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Security Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">256-bit Encryption</p>
                    <p className="text-sm text-muted-foreground">All transfers are protected with bank-level security</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-banking-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Processing Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.transferType === "internal" 
                        ? "Instant" 
                        : formData.transferType === "wire" 
                        ? "Same day" 
                        : "1-3 business days"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-banking-warning mt-0.5" />
                  <div>
                    <p className="font-medium">Transfer Limits</p>
                    <p className="text-sm text-muted-foreground">
                      Daily limit: $10,000<br />
                      Monthly limit: $100,000
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BankingLayout>
  );
};

export default Transfer;