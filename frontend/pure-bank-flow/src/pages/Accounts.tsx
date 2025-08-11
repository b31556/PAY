import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankingLayout from "@/components/BankingLayout";
import { getCurrentUser, getTransactions, getAccounts } from "@/lib/banking-api";
import { CreditCard, Eye, ArrowRight, TrendingUp, TrendingDown, LockIcon, UnlockIcon, Plus, Trash2, Settings, Send, Clock, Shield, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface BankAccount {
  uuid: string;
  bank_account_number: string;
  holder_name: string;
  balance: number;
  currency: string;
  account_type: string;
  available_balance: number;
  thm?: string;
  fillup_timeline?: string;
  kamat?: string;
  kamet_this_year?: string;
}

interface Card {
  card_number: string;
  card_holder: string;
  expiration_date: string;
  cvv: string;
  card_type: string;
  account_uuid: string;
}

interface AccountsData {
  accounts: BankAccount[];
  cards: Card[];
}

const Accounts = () => {
  const [user, setUser] = useState<any>(null);
  const [accountsData, setAccountsData] = useState<AccountsData>({ accounts: [], cards: [] });
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [cardLimits, setCardLimits] = useState<Record<string, {daily: number, online: number, contactless: boolean}>>({}); 
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    name: "",
    type: "Checking",
    currency: "HUF"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userData = getCurrentUser();
        setUser(userData);
        
        // Fetch accounts from API
        const accountsResponse = await getAccounts();
        setAccountsData(accountsResponse);
        
        if (accountsResponse?.accounts?.length > 0) {
          setActiveAccountId(accountsResponse.accounts[0].uuid);
          
          // Initialize card limits for all accounts
          const limits: Record<string, {daily: number, online: number, contactless: boolean}> = {};
          accountsResponse.accounts.forEach((account: BankAccount) => {
            limits[account.uuid] = {
              daily: 200000,
              online: 100000,
              contactless: true
            };
          });
          setCardLimits(limits);
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatCurrency = (amount: number, currency = "HUF") => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountTypeIcon = (type: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  const getAccountStatus = (type: string, balance: number) => {
    if (type === "credit") {
      return balance < 0 ? "Aktív" : "Rendezett";
    }
    return "Aktív";
  };

  const getAccountTransactions = (accountId: string) => {
    return 5; // Placeholder - would be replaced with actual transaction count from API
  };

  // Card settings update
  const updateCardLimits = (accountId: string, limitType: 'daily' | 'online' | 'contactless', value: number | boolean) => {
    setCardLimits(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [limitType]: value
      }
    }));
    
    toast({
      title: "Kártya beállítások frissítve",
      description: "A beállítások sikeresen mentésre kerültek",
    });
  };

  // Új fiók létrehozása
  const handleCreateAccount = () => {
    if (!newAccountData.name) {
      toast({
        title: "Hiányzó adat",
        description: "Kérjük add meg a számla nevét",
        variant: "destructive"
      });
      return;
    }

    const newAccount = {
      id: Math.random().toString(36).slice(2),
      type: newAccountData.type,
      name: newAccountData.name,
      accountNumber: generateAccountNumber(),
      currency: newAccountData.currency,
      balance: 0,
      created: new Date().toISOString()
    };

    // Frissítjük a felhasználó fiókjait
    const updatedUser = {
      ...user,
      accounts: [...user.accounts, newAccount]
    };
    setUser(updatedUser);
    
    // Kártya limitek inicializálása az új fiókhoz
    setCardLimits(prev => ({
      ...prev,
      [newAccount.id]: {
        daily: 200000,
        online: 100000,
        contactless: true
      }
    }));

    setShowNewAccountDialog(false);
    setNewAccountData({
      name: "",
      type: "Checking",
      currency: "HUF"
    });

    toast({
      title: "Új számla létrehozva",
      description: `A ${newAccount.name} nevű számla sikeresen létrehozva`
    });
  };

  // Segédfüggvény számlaszám generáláshoz
  const generateAccountNumber = () => {
    return "11773030-" + 
      Math.floor(10000000 + Math.random() * 90000000);
  };

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Header és új számla létrehozás */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Számlák kezelése</h1>
            <p className="text-muted-foreground mt-1">Kezeld a számláidat és a virtuális kártyáidat</p>
          </div>
          <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} />
                Új számla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új bankszámla létrehozása</DialogTitle>
                <DialogDescription>
                  Add meg az új bankszámla adatait
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Számla neve</Label>
                  <Input 
                    id="name" 
                    value={newAccountData.name} 
                    onChange={(e) => setNewAccountData({...newAccountData, name: e.target.value})}
                    placeholder="pl. Fő számlám"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Számla típusa</Label>
                  <Select 
                    value={newAccountData.type}
                    onValueChange={(value) => setNewAccountData({...newAccountData, type: value})}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Válassz típust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checking">Folyószámla</SelectItem>
                      <SelectItem value="Savings">Megtakarítási számla</SelectItem>
                      <SelectItem value="Credit">Hitelkártya számla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Pénznem</Label>
                  <Select 
                    value={newAccountData.currency}
                    onValueChange={(value) => setNewAccountData({...newAccountData, currency: value})}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Válassz pénznemet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HUF">Magyar Forint (HUF)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>Mégsem</Button>
                <Button onClick={() => {}}>Létrehozás</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {/* Számlák és hozzá tartozó kártyák */}
        <div className="space-y-8">
          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-2">
                  <div className="h-48 bg-gray-200 animate-pulse"></div>
                </Card>
              ))}
            </div>
          ) : (
            (accountsData?.accounts || []).map((account, index) => (
              <div key={account.uuid || index} className="space-y-4">
                {/* Prémium számla kártya */}
                <Card className="overflow-hidden border-2 hover:border-banking-primary/40 transition-all shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-banking-primary/10 to-banking-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-banking-primary/20 rounded-lg">
                          {getAccountTypeIcon(account.account_type)}
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {account.account_type === "checking" ? "Prémium Folyószámla" : 
                             account.account_type === "savings" ? "Megtakarítási számla" : "Hitelkártya számla"}
                          </CardTitle>
                          <CardDescription className="font-mono">{account.bank_account_number}</CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant={getAccountStatus(account.account_type, account.balance) === "Aktív" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {getAccountStatus(account.account_type, account.balance)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Egyenleg</p>
                        <p className={`text-2xl font-bold ${
                          account.balance < 0 ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Elérhető egyenleg</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(account.available_balance, account.currency)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Tulajdonos</p>
                        <p className="text-lg font-semibold">{account.holder_name}</p>
                      </div>
                    </div>

                    {/* Számla-specifikus információk */}
                    <div className="mt-6 pt-6 border-t border-border/60">
                      {account.account_type === "savings" && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Kamatláb:</span>
                            <span className="ml-2 font-medium">{account.kamat || "2,5% EBKM"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Kamat (idén):</span>
                            <span className="ml-2 font-medium text-success">{account.kamet_this_year || "42.750 Ft"}</span>
                          </div>
                        </div>
                      )}
                      
                      {account.account_type === "credit" && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hitelkeret:</span>
                            <span className="ml-2 font-medium">{formatCurrency(account.available_balance)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">THM:</span>
                            <span className="ml-2 font-medium">{account.thm || "18,99%"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Minimum fizetendő:</span>
                            <span className="ml-2 font-medium">{Math.abs(account.balance * 0.05).toFixed(0)} Ft</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fizetési határidő:</span>
                            <span className="ml-2 font-medium">
                              {account.fillup_timeline ? new Date(account.fillup_timeline).toLocaleDateString('hu-HU') : "2025. aug. 15."}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {account.account_type === "checking" && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Számla típus:</span>
                            <span className="ml-2 font-medium">Prémium folyószámla</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Havi díj:</span>
                            <span className="ml-2 font-medium">0 Ft (elengedve)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-muted/30 flex gap-2 justify-end pt-4">
                    <Link to={`/transactions?account=${account.uuid}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Tranzakciók
                      </Button>
                    </Link>
                    {account.account_type !== "credit" && (
                      <Link to={`/transfer?from=${account.uuid}`}>
                        <Button variant="default" size="sm" className="gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Utalás
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
                
                {/* A számlához tartozó kártyák megjelenítése */}
                {(accountsData?.cards || [])
                  .filter(card => card.account_uuid === account.uuid)
                  .map((card, cardIndex) => (
                    <div key={`${card.card_number}-${cardIndex}`} className="ml-8 my-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="relative">
                          <div 
                            className={`
                              w-[350px] h-[200px] rounded-xl overflow-hidden shadow-2xl 
                              bg-gradient-to-br from-gray-900 via-banking-primary to-black
                              relative flex flex-col justify-between p-6
                              transform transition-all hover:scale-105 cursor-pointer
                            `}
                          >
                            {/* Biztonsági hologram effekt */}
                            <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" 
                              style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
                              
                            <div className="flex justify-between items-start">
                              <div className="text-white opacity-80 font-medium">
                                {card.card_type === "credit" ? "Hitelkártya" : "Bankkártya"}
                              </div>
                              <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            
                            <div className="text-white font-mono text-xl tracking-wider">
                              {card.card_number}
                            </div>
                            
                            <div className="flex justify-between items-end">
                              <div className="text-white text-sm">
                                <div className="opacity-70 text-xs mb-1">Kártyabirtokos</div>
                                <div>{card.card_holder}</div>
                              </div>
                              
                              <div className="text-white text-sm">
                                <div className="opacity-70 text-xs mb-1">Lejárat</div>
                                <div>{card.expiration_date}</div>
                              </div>
                            </div>
                            
                            {/* NFC/chip jelzés */}
                            <div className="absolute top-6 left-24 w-8 h-6 border-2 border-white/40 rounded-sm flex items-center justify-center">
                              <div className="w-2 h-4 border-l-2 border-white/40 rounded-full"></div>
                            </div>
                          </div>
                          
                          {/* Kártya aktív/inaktív állapot jelző */}
                          <div className="absolute -top-2 -right-2">
                            <Badge 
                              variant="default"
                              className="text-xs"
                            >
                              Aktív
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Kártya információk</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Kártya típusa:</span>
                                  <span className="ml-2 font-medium">
                                    {card.card_type === "credit" ? "Hitelkártya" : "Bankkártya"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Kapcsolódó számla:</span>
                                  <span className="ml-2 font-medium">{account.bank_account_number}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Biztonsági kód:</span>
                                  <span className="ml-2 font-medium">{card.cvv}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Számla egyenleg:</span>
                                  <span className="ml-2 font-medium">{formatCurrency(account.balance, account.currency)}</span>
                                </div>
                              </div>
                              
                              <div className="pt-4 border-t flex justify-between">
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Settings className="w-4 h-4" />
                                  Kártya beállítások
                                </Button>
                                <Button variant="destructive" size="sm" className="gap-2">
                                  <LockIcon className="w-4 h-4" />
                                  Kártya zárolása
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            ))
          )}
        </div>
      </div>
    </BankingLayout>
  );
};

export default Accounts;