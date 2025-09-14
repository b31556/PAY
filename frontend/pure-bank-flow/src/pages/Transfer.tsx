import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, SendRequest } from "@/lib/banking-api";
import { 
  ArrowRight, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Users,
  Globe,
  Building,
  UserPlus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import BackendOfflineOverlay from "@/components/BackendOfflineOverlay";
import { checkBackendConnectivity } from "@/lib/backend-connectivity";

// Interface for account data structure
interface BankAccount {
  uuid: string;
  bank_account_number: string;
  holder_name: string;
  balance: number;
  currency: string;
  account_type: string;
  available_balance: number;
  thm: string;
  fillup_timeline: string;
  kamat: string;
  kamet_this_year: string;
  memo: string;
}

interface Card {
  card_number: string;
  card_holder: string;
  expiration_date: string;
  cvv: string;
  card_type: string;
  account_uuid: string;
  is_locked: boolean;
}

interface AccountsResponse {
  accounts: BankAccount[];
  cards: Card[];
}

interface Contact {
  uuid: string;
  name: string;
  bank_account_number: string;
  email: string;
}

const Transfer = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    toAccountNumber: "",
    amount: "",
    memo: "",
    transferType: "between_accounts"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [backendOffline, setBackendOffline] = useState(false);

  // Ha az accounts betöltődtek, és van from/to az URL-ben, állítsuk be újra a formData-t
  useEffect(() => {
    if (accounts.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    let update = false;
    let newForm: typeof formData = { ...formData };
    // fromAccount
    const fromParam = params.get("from");
    if (fromParam && accounts.some(acc => acc.uuid === fromParam)) {
      newForm.fromAccount = fromParam;
      update = true;
    }
    // toacc
    const toaccParam = params.get("toacc");
    if (toaccParam && accounts.some(acc => acc.uuid === toaccParam)) {
      newForm.toAccount = toaccParam;
      newForm.transferType = "between_accounts";
      update = true;
    }
    if (update) setFormData(newForm);
  }, [accounts]);

  // URL paraméterek feldolgozása és accounts betöltése
  useEffect(() => {
    // URL paraméterek kiolvasása
    const params = new URLSearchParams(window.location.search);
    let initialType = "between_accounts";
    let initialFrom = params.get("from") || "";
    let initialToAccount = "";
    let initialToAccountNumber = "";
    // transferType logika
    if (params.get("toacc")) {
      initialType = "between_accounts";
      initialToAccount = params.get("toacc") || "";
    } else if (params.get("toban")) {
      initialType = "wire";
      initialToAccountNumber = params.get("toban") || "";
    } else if (params.get("toiban")) {
      initialType = "external";
      initialToAccountNumber = params.get("toiban") || "";
    } else if (params.get("tocontact")) {
      initialType = "to_contact";
      // toContact paramétert lehetne kezelni, de most nem implementáljuk
    }
    const initialAmount = params.get("amount") || "";
    const initialMemo = params.get("memo") || "";

    setFormData(prev => ({
      ...prev,
      fromAccount: initialFrom,
      toAccount: initialToAccount,
      toAccountNumber: initialToAccountNumber,
      amount: initialAmount,
      memo: initialMemo,
      transferType: initialType
    }));

    // Fetch user accounts from API
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        console.log("Fetching accounts...");
        const response = await SendRequest("/accounts");
        if (response.success && response.data && response.data.accounts) {
          console.log("Accounts loaded:", response.data.accounts);
          setAccounts(response.data.accounts);
        } else {
          console.error("Invalid accounts data:", response);
          toast({
            title: "Error Loading Accounts",
            description: "Failed to load account data",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast({
          title: "Error Loading Accounts",
          description: error instanceof Error ? error.message : "Failed to load accounts",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    // Contacts lekérése
    const fetchContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const response = await SendRequest("/contacts/list", {});
        if (response.success && response.data && response.data.contacts) {
          setContacts(response.data.contacts);
        }
      } catch (error) {
        toast({
          title: "Kapcsolatok betöltése sikertelen",
          description: error instanceof Error ? error.message : "Nem sikerült betölteni a kontaktokat",
          variant: "destructive",
        });
      } finally {
        setIsLoadingContacts(false);
      }
    };

    fetchAccounts();
    fetchContacts();
  }, []);

  useEffect(() => {
    checkBackendConnectivity().then(ok => {
      if (!ok) setBackendOffline(true);
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    // Clear toAccount or toAccountNumber when transfer type changes
    if (field === "transferType") {
      if (value === "between_accounts") {
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          toAccountNumber: "",
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          toAccount: "",
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountBalance = (accountId: string) => {
    const account = accounts.find(acc => acc.uuid === accountId);
    return account ? account.available_balance : 0;
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.uuid === accountId);
    return account ? `${account.memo} - ${account.bank_account_number}` : '';
  };

  // Kontakt név lekérése
  const getContactName = (contactUuid: string) => {
    const contact = contacts.find(c => c.uuid === contactUuid);
    return contact ? `${contact.name} (${contact.bank_account_number})` : '';
  };

  const validateTransfer = () => {
    if (!formData.fromAccount) {
      toast({
        title: "Invalid Transfer",
        description: "Please select a source account",
        variant: "destructive",
      });
      return false;
    }

    if (formData.transferType === "between_accounts") {
      if (!formData.toAccount) {
        toast({
          title: "Invalid Transfer",
          description: "Please select a destination account",
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
    } else if (formData.transferType === "to_contact") {
      if (!formData.toAccount) {
        toast({
          title: "Érvénytelen átutalás",
          description: "Válasszon kontaktot!",
          variant: "destructive",
        });
        return false;
      }
    } else {
      if (!formData.toAccountNumber) {
        toast({
          title: "Invalid Transfer",
          description: "Please enter a valid destination account number",
          variant: "destructive",
        });
        return false;
      }
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
    setTransactionStatus("pending");

    try {
      // Prepare request payload based on transfer type
      let payload;
      if (formData.transferType === "between_accounts") {
        payload = {
          from_account: formData.fromAccount,
          to_account: formData.toAccount,
          amount: parseFloat(formData.amount),
          memo: formData.memo,
          transfer_type: formData.transferType
        };
      } else if (formData.transferType === "to_contact") {
        payload = {
          from_account: formData.fromAccount,
          to_contact_uuid: formData.toAccount,
          amount: parseFloat(formData.amount),
          memo: formData.memo,
          transfer_type: formData.transferType
        };
      } else {
        payload = {
          from_account: formData.fromAccount,
          to_account_number: formData.toAccountNumber,
          amount: parseFloat(formData.amount),
          memo: formData.memo,
          transfer_type: formData.transferType
        };
      }

      // Send request to start transaction
      const response = await SendRequest("/start-transaction", payload);


      if (response.code === 200 && response.data) {
        // Store transaction ID for confirmation if needed
        setTransactionId(response.data.transaction_id);
        
        // Check if confirmation is required for non-internal transfers
        if (formData.transferType !== "between_accounts" && formData.transferType !== "to_contact") {
          setConfirmationRequired(true);
          toast({
            title: "Confirmation Required",
            description: "Please enter the confirmation code sent to your device",
          });
        } else {
          // For internal transfers, show confirmation dialog
          setPendingTransaction(response.data);
          setShowConfirmationDialog(true);
        }
      } else {
        toast({
          title: "Transfer Failed",
          description: response.data?.detail || "An error occurred while processing the transfer",
          variant: "destructive",
        });
        setTransactionStatus("failed");
      }
    } catch (error) {
      // This is where 400 errors usually land
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the transfer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmInternalTransfer = async () => {
    if (!transactionId) return;
    
    setIsLoading(true);
    
    try {
      const confirmPayload = {
        transaction_id: transactionId
        // Belső átutalásoknál nem kell confirmation_code
      };
      
      const response = await SendRequest("/confirm-transaction", confirmPayload);
      
      if (response.success) {
        setTransactionStatus("confirmed");
        toast({
          title: "Transfer Completed",
          description: "Your transfer has been successfully processed",
        });
        
        // Update account balances in UI
        const amount = parseFloat(formData.amount);
        setAccounts(prev => prev.map(account => {
          if (account.uuid === formData.fromAccount) {
            return { ...account, balance: account.balance - amount, available_balance: account.available_balance - amount };
          } else if (account.uuid === formData.toAccount) {
            return { ...account, balance: account.balance + amount, available_balance: account.available_balance + amount };
          }
          return account;
        }));
        
        // Reset all states after a short delay
        setTimeout(() => {
          resetForm();
          setTransactionId(null);
          setShowConfirmationDialog(false);
          setPendingTransaction(null);
          setTransactionStatus("idle");
        }, 1000);
      }
    } catch (error) {
      setTransactionStatus("failed");
      toast({
        title: "Confirmation Failed",
        description: error instanceof Error ? error.message : "Failed to confirm transfer",
        variant: "destructive",
      });
      setShowConfirmationDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!transactionId) return;
    
    setIsLoading(true);
    
    try {
      const confirmPayload = {
        transaction_id: transactionId,
        confirmation_code: confirmationCode
      };
      
      const response = await SendRequest("/confirm-transaction", confirmPayload);
      
      if (response.success && response.code === 200) {
        setTransactionStatus("confirmed");
        toast({
          title: "Transfer Completed",
          description: "Your transfer has been successfully processed",
        });
        
        // Update account balance for external transfers
        const amount = parseFloat(formData.amount);
        setAccounts(prev => prev.map(account => {
          if (account.uuid === formData.fromAccount) {
            return { 
              ...account, 
              balance: account.balance - amount, 
              available_balance: account.available_balance - amount 
            };
          }
          return account;
        }));
        
        // Reset all states after a short delay
        setTimeout(() => {
          resetForm();
          setConfirmationRequired(false);
          setConfirmationCode("");
          setTransactionId(null);
          setTransactionStatus("idle");
        }, 3000);
      }
      setTransactionStatus("failed");
      toast({
        title: "Confirmation Failed",
        description: response.data?.detail,
        variant: "destructive",
      });
    } catch (error) {
      setTransactionStatus("failed");
      toast({
        title: "Confirmation Failed",
        description: error instanceof Error ? error.message : "Failed to confirm transfer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fromAccount: "",
      toAccount: "",
      toAccountNumber: "",
      amount: "",
      memo: "",
      transferType: "between_accounts"
    });
  };

  // Filter accounts to show only eligible ones (exclude credit accounts)
  const eligibleAccounts = accounts.filter(acc => acc.account_type !== "credit");
  
  console.log("Current accounts:", accounts);
  console.log("Eligible accounts:", eligibleAccounts);

  return (
    <>
      {backendOffline && <BackendOfflineOverlay />}
      {!backendOffline && (
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
                          onValueChange={(value) => {
                          handleInputChange("transferType", value);
                          setTransactionStatus("idle");
                          }}
                        >
                          <SelectTrigger>
                          <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="between_accounts">
                            <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-banking-primary" />
                            <span>Between My Accounts</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="wire">
                            <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2 text-banking-secondary" />
                            <span>To Bank Account</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="external">
                            <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-banking-warning" />
                            <span>Interbank Transfer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="to_contact">
                            <div className="flex items-center">
                            <UserPlus className="w-4 h-4 mr-2 text-banking-success" />
                            <span>To Contact</span>
                            </div>
                          </SelectItem>
                          </SelectContent>
                        </Select>
                        </div>

                        {/* From Account */}
                        <div className="space-y-2">
                        <Label>From Account</Label>
                        <Select 
                          value={formData.fromAccount} 
                          onValueChange={(value) => {
                          handleInputChange("fromAccount", value);
                          setTransactionStatus("idle");
                          }}
                        >
                          <SelectTrigger>
                          <SelectValue placeholder="Select source account" />
                          </SelectTrigger>
                          <SelectContent>
                          {isLoadingAccounts ? (
                            <div className="flex items-center justify-center p-4">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            <span>Loading accounts...</span>
                            </div>
                          ) : eligibleAccounts.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                            No accounts available
                            </div>
                          ) : (
                            eligibleAccounts.map((account) => (
                            <SelectItem key={account.uuid} value={account.uuid}>
                              <div className="flex justify-between items-center w-full">
                              <span>{account.memo} - {account.bank_account_number}</span>
                              <span className="text-muted-foreground ml-4">
                                {formatCurrency(account.available_balance)}
                              </span>
                              </div>
                            </SelectItem>
                            ))
                          )}
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
                        {formData.transferType === "between_accounts" ? (
                          <Select 
                          value={formData.toAccount} 
                          onValueChange={(value) => {
                            handleInputChange("toAccount", value);
                            setTransactionStatus("idle");
                          }}
                          >
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination account" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingAccounts ? (
                            <div className="flex items-center justify-center p-4">
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              <span>Loading accounts...</span>
                            </div>
                            ) : (
                            eligibleAccounts
                              .filter((acc) => acc.uuid !== formData.fromAccount)
                              .map((account) => (
                              <SelectItem key={account.uuid} value={account.uuid}>
                                <div className="flex justify-between items-center w-full">
                                <span>{account.memo} - {account.bank_account_number}</span>
                                <span className="text-muted-foreground ml-4">
                                  {formatCurrency(account.available_balance)}
                                </span>
                                </div>
                              </SelectItem>
                              ))
                            )}
                          </SelectContent>
                          </Select>
                        ) : formData.transferType === "to_contact" ? (
                          <Select
                            value={formData.toAccount}
                            onValueChange={(value) => {
                              handleInputChange("toAccount", value);
                              setTransactionStatus("idle");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon kontaktot" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingContacts ? (
                                <div className="flex items-center justify-center p-4">
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  <span>Kapcsolatok betöltése...</span>
                                </div>
                              ) : contacts.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  Nincs elérhető kontakt
                                </div>
                              ) : (
                                contacts.map((contact) => (
                                  <SelectItem key={contact.uuid} value={contact.uuid}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{contact.name}</span>
                                      <span className="text-xs text-muted-foreground">{contact.bank_account_number} &bull; {contact.email}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                          placeholder="External account number or email"
                          value={formData.toAccountNumber}
                          onChange={(e) => {
                            handleInputChange("toAccountNumber", e.target.value);
                            setTransactionStatus("idle");
                          }}
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
                          onChange={(e) => {
                            handleInputChange("amount", e.target.value);
                            setTransactionStatus("idle");
                          }}
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
                          onChange={(e) => {
                          handleInputChange("memo", e.target.value);
                          setTransactionStatus("idle");
                          }}
                          rows={3}
                        />
                        </div>

                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-banking-primary to-banking-secondary"
                        disabled={isLoading || confirmationRequired}
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing Transfer...
                          </div>
                        ) : transactionStatus === "confirmed" ? (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Transfer Completed
                          </div>
                        ) : (
                          <>
                            Transfer {formData.amount && `$${formData.amount}`}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Confirmation Code Input */}
                    {confirmationRequired && formData.transferType !== "to_contact" && (
                      <div className="mt-6 space-y-4 p-6 border rounded-lg bg-muted/20">
                        <div className="text-center">
                          <h3 className="font-bold text-lg mb-2">Confirmation Required</h3>
                          <p className="text-sm text-muted-foreground">
                            For your security, we've sent a verification code to your registered device.
                            Please enter the 6-digit code below to complete your transfer.
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-center py-2">
                          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-amber-600" />
                          </div>
                        </div>
                        
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                              This code will expire in 5 minutes. If you don't receive the code, 
                              you can cancel and try again.
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmationCode" className="text-center block">Verification Code</Label>
                          <Input
                            id="confirmationCode"
                            placeholder="Enter 6-digit code"
                            value={confirmationCode}
                            onChange={(e) => setConfirmationCode(e.target.value)}
                            className="text-center tracking-widest text-lg font-medium"
                            maxLength={6}
                          />
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setConfirmationRequired(false);
                              setTransactionId(null);
                              setConfirmationCode("");
                              setTransactionStatus("idle");
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleConfirmTransaction}
                            className="flex-1 bg-gradient-to-r from-banking-primary to-banking-secondary"
                            disabled={isLoading || confirmationCode.length < 6}
                          >
                            {isLoading ? (
                              <div className="flex items-center">
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Verifying...
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirm Transfer
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Security & Info */}
              <div className="space-y-6">
                {/* Transfer Summary */}
                {(formData.fromAccount && (
                  (formData.transferType === "between_accounts" && formData.toAccount) ||
                  (formData.transferType === "to_contact" && formData.toAccount) ||
                  (formData.transferType !== "between_accounts" && formData.transferType !== "to_contact" && formData.toAccountNumber)
                ) && formData.amount) && (
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
                          {formData.transferType === "between_accounts"
                            ? getAccountName(formData.toAccount)
                            : formData.transferType === "to_contact"
                            ? getContactName(formData.toAccount)
                            : formData.toAccountNumber || "External Account"
                          }
                        </p>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-2xl font-bold text-banking-primary">
                          ${formData.amount}
                        </p>
                      </div>
                      
                      {/* Transaction Status */}
                      {transactionStatus !== "idle" && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <div className={`flex items-center mt-1 ${
                            transactionStatus === "pending" ? "text-amber-500" :
                            transactionStatus === "confirmed" ? "text-emerald-500" :
                            "text-red-500"
                          }`}>
                            {transactionStatus === "pending" && (
                              <>
                                <Clock className="w-5 h-5 mr-2" />
                                <span>Processing Transaction</span>
                              </>
                            )}
                            {transactionStatus === "confirmed" && (
                              <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                <span>Transaction Completed</span>
                              </>
                            )}
                            {transactionStatus === "failed" && (
                              <>
                                <AlertCircle className="w-5 h-5 mr-2" />
                                <span>Transaction Failed</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
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
                          {formData.transferType === "between_accounts" 
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

          {/* Belső átutalás megerősítő dialógus */}
          <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Megerősíti az átutalást?</DialogTitle>
                <DialogDescription>
                  Kérjük, ellenőrizze az átutalás részleteit a folytatás előtt.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                {pendingTransaction && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Küldő számla</p>
                        <p className="font-medium">{getAccountName(formData.fromAccount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fogadó számla</p>
                        <p className="font-medium">{contacts.find(contact => contact.uuid === formData.toAccount)?.name || getAccountName(formData.toAccount)}</p>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Összeg</p>
                        <p className="text-xl font-bold text-banking-primary">${formData.amount}</p>
                      </div>
                      {formData.memo && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-sm font-medium">Közlemény</p>
                          <p className="text-sm text-muted-foreground">{formData.memo}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        A megerősítés után az átutalás azonnal végrehajtásra kerül.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowConfirmationDialog(false);
                    setTransactionId(null);
                    setPendingTransaction(null);
                    setTransactionStatus("idle");
                  }}
                >
                  Mégsem
                </Button>
                <Button 
                  type="button"
                  onClick={handleConfirmInternalTransfer}
                  className="bg-gradient-to-r from-banking-primary to-banking-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Feldolgozás...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Átutalás megerősítése
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </BankingLayout>
      )}
    </>
  );
};

export default Transfer;