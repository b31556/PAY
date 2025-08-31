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
import { CardSettingsDialog } from "@/components/CardSettingsDialog";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { getCurrentUser, getTransactions, getAccounts, createAccount, toggleCardLock, updateCardSettings, makeCard, revealFullCardNumber } from "@/lib/banking-api";
import { CreditCard, Eye, ArrowRight, TrendingUp, TrendingDown, LockIcon, UnlockIcon, Plus, Trash2, Settings, Send, Clock, Shield, Bell, Snowflake, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import BackendOfflineOverlay from "@/components/BackendOfflineOverlay";
import { checkBackendConnectivity } from "@/lib/backend-connectivity";

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
  memo?: string;
}

export type { BankAccount };

interface Card {
  card_number: string;
  card_holder: string;
  expiration_date: string;
  cvv: string;
  card_type: string;
  account_uuid: string;
  is_locked?: boolean;
  uuid?: string;
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
  const [cardSettingsDialog, setCardSettingsDialog] = useState({
    open: false,
    cardUuid: "",
    cardNumber: ""
  });
  const [showCreateCardDialog, setShowCreateCardDialog] = useState(false);
  const [revealedCardNumbers, setRevealedCardNumbers] = useState<Record<string, string>>({});
  const [newAccountData, setNewAccountData] = useState({
    name: "",
    type: "checking",
    currency: "HUF"
  });
  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userData = getCurrentUser();
        setUser(userData);
        
        // Fetch accounts from API
        const accountsResponse = await getAccounts();
        
        // Ideiglenes fix: Ha nincs uuid a kártyán, adjunk hozzá egyet
        if (accountsResponse && accountsResponse.cards) {
          accountsResponse.cards = accountsResponse.cards.map(card => {
            if (!card.uuid) {
              const cardId = `card-${card.card_number?.replace(/\s/g, '') || Math.random().toString(36).substring(2, 11)}`;
              console.log("Adding missing UUID to card:", card.card_number, "UUID:", cardId);
              return {
                ...card,
                uuid: cardId
              };
            }
            return card;
          });
        }
        
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

  useEffect(() => {
    checkBackendConnectivity().then(ok => {
      if (!ok) setBackendOffline(true);
    });
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

  // Kártya zárolás/feloldás kezelése
  const handleToggleCardLock = async (cardUuid: string | undefined, isLocked: boolean | undefined) => {
    console.log("Toggle card lock called with:", { cardUuid, isLocked });
    
    if (!cardUuid) {
      console.error("Card UUID is missing!");
      toast({
        title: "Hiba történt",
        description: "A kártya azonosítója hiányzik.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log("Sending toggleCardLock request for card:", cardUuid);
      const response = await toggleCardLock(cardUuid);
      console.log("Toggle card lock response:", response);
      
      if (response) {
        // Kártya státusz sikeresen frissítve
        toast({
          title: response.new_status === "locked" ? "Kártya zárolva" : "Kártya feloldva",
          description: response.message
        });
        
        // Újratöltjük a kártya adatokat
        const accountsResponse = await getAccounts();
        setAccountsData(accountsResponse);
      }
    } catch (error) {
      console.error("Hiba a kártya státusz módosításakor:", error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült módosítani a kártya státuszát. Kérjük próbálja újra később.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Kártya teljes számának megjelenítése
  const handleRevealCardNumber = async (cardUuid: string | undefined) => {
    if (!cardUuid) {
      console.error("Card UUID is missing!");
      toast({
        title: "Hiba történt",
        description: "A kártya azonosítója hiányzik.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log("Revealing full card number for card:", cardUuid);
      
      // Ha már egyszer lekértük, ne kérjük le újra (csak a UI-t frissítsük)
      if (revealedCardNumbers[cardUuid]) {
        // Ideiglenes eltüntetés 30 másodperc után
        setTimeout(() => {
          setRevealedCardNumbers(prev => {
            const newRevealedNumbers = { ...prev };
            delete newRevealedNumbers[cardUuid];
            return newRevealedNumbers;
          });
        }, 30000);
        return;
      }
      
      const response = await revealFullCardNumber(cardUuid);
      
      if (response && response.full_card_number) {
        // Frissítjük a state-et a teljes kártyaszámmal
        setRevealedCardNumbers(prev => ({
          ...prev,
          [cardUuid]: response.full_card_number
        }));
        
        // Ideiglenes eltüntetés 30 másodperc után
        setTimeout(() => {
          setRevealedCardNumbers(prev => {
            const newRevealedNumbers = { ...prev };
            delete newRevealedNumbers[cardUuid];
            return newRevealedNumbers;
          });
        }, 30000);
        
        toast({
          title: "Biztonsági figyelmeztetés",
          description: "A teljes kártyaszám megjelenítve 30 másodpercig.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Hiba a kártyaszám megjelenítésekor:", error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült megjeleníteni a teljes kártyaszámot. Kérjük próbálja újra később.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Új kártya igénylése
  const handleCreateCard = async (accountUuid: string, pincode: string) => {
    try {
      setLoading(true);
      console.log("Creating new card:", { accountUuid, pincode });
      
      const response = await makeCard(accountUuid, pincode);
      
      if (response) {
        toast({
          title: "Új kártya sikeresen igényelve",
          description: response.message || "Az új bankkártyát sikeresen igényeltük.",
        });
        
        // Dialógus bezárása
        setShowCreateCardDialog(false);
        
        // Frissítsük az adatokat
        const accountsResponse = await getAccounts();
        setAccountsData(accountsResponse);
      }
    } catch (error: any) {
      console.error("Hiba az új kártya igénylésekor:", error);
      let errorMessage = "Nem sikerült az új kártya igénylése. Kérjük próbálja újra később.";
      
      // Ellenőrizzük, hogy elértük-e a maximális kártyaszámot
      if (error.message?.includes("Maximum card limit reached") || error.status === 400) {
        errorMessage = "Elérte a maximális kártyaszámot ennél a számlánál.";
      }
      
      toast({
        title: "Hiba történt",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Kártya beállítások frissítése
  const handleUpdateCardSettings = async (cardUuid: string | undefined, connectedAccountUuid: string, pincode: string) => {
    if (!cardUuid) return;
    
    try {
      setLoading(true);
      console.log("Updating card settings:", { cardUuid, connectedAccountUuid, pincode });
      const response = await updateCardSettings(cardUuid, connectedAccountUuid, pincode);
      
      if (response) {
        toast({
          title: "Kártya beállítások frissítve",
          description: response.message || "A kártya beállítások sikeresen frissítve."
        });
        
        // Dialógus bezárása
        setCardSettingsDialog(prev => ({ ...prev, open: false }));
        
        // Frissítsük az adatokat
        const accountsResponse = await getAccounts();
        setAccountsData(accountsResponse);
      }
    } catch (error) {
      console.error("Hiba a kártya beállítások frissítésekor:", error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült frissíteni a kártya beállításait. Kérjük próbálja újra később.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
  const handleCreateAccount = async () => {
    if (!newAccountData.name) {
      toast({
        title: "Hiányzó adat",
        description: "Kérjük add meg a számla nevét",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createAccount(newAccountData.type, newAccountData.name);
      
      if (response.code === 10) {
        // Számla sikeresen létrehozva
        toast({
          title: "Új számla létrehozva",
          description: `A számla sikeresen létrehozva.`
        });
        
        // Újratöltjük a számla adatokat
        const accountsResponse = await getAccounts();
        setAccountsData(accountsResponse);
      } else if (response.code === 56) {
        // Jóváhagyásra váró számla
        toast({
          title: "Jóváhagyásra vár",
          description: "Az új számla létrehozása jóváhagyásra vár. Hamarosan aktiválásra kerül."
        });
      }
      
      setShowNewAccountDialog(false);
      setNewAccountData({
        name: "",
        type: "checking",
        currency: "HUF"
      });
    } catch (error) {
      console.error("Hiba a számla létrehozásakor:", error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült létrehozni a számlát. Kérjük próbálja újra később.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Segédfüggvény számlaszám generáláshoz
  const generateAccountNumber = () => {
    return "11773030-" + 
      Math.floor(10000000 + Math.random() * 90000000);
  };

  if (backendOffline) {
    return <BackendOfflineOverlay />;
  }

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
                      <SelectItem value="checking">Folyószámla</SelectItem>
                      <SelectItem value="savings">Megtakarítási számla</SelectItem>
                      <SelectItem value="credit">Hitelkártya számla</SelectItem>
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
                <Button onClick={handleCreateAccount}>Létrehozás</Button>
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
                            {account.memo || (
                              account.account_type === "checking" ? "Prémium Folyószámla" : 
                              account.account_type === "savings" ? "Megtakarítási számla" : "Hitelkártya számla"
                            )}
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
                
                {/* Kártyák és új kártya igénylés gomb */}
                <div className="flex justify-between items-center my-4">
                  <h3 className="text-lg font-semibold">Bankkártyák</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowCreateCardDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Új kártya igénylése
                  </Button>
                </div>
                
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
                              ${card.is_locked ? 'opacity-80' : ''}
                            `}
                          >
                            {/* Biztonsági hologram effekt */}
                            <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" 
                              style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
                            
                            {/* Fagyott effektus zárolt kártyákhoz */}
                            {card.is_locked && (
                              <div className="absolute inset-0 z-10 backdrop-blur-sm bg-blue-500/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-blue-500/30"></div>
                                <div className="absolute top-5 right-5">
                                  <Snowflake className="w-12 h-12 text-white/80" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-lg border border-white/30">
                                    <p className="text-white font-bold text-lg">ZÁROLT KÁRTYA</p>
                                  </div>
                                </div>
                              </div>
                            )}
                              
                            <div className="flex justify-between items-start">
                              <div className="text-white opacity-80 font-medium">
                                {card.card_type === "credit" ? "Hitelkártya" : "Bankkártya"}
                              </div>
                              <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            
                            <div 
                              className="text-white font-mono text-xl tracking-wider relative group cursor-pointer"
                              onClick={() => handleRevealCardNumber(card.uuid)}
                            >
                              {revealedCardNumbers[card.uuid || ""] ? (
                                <div className="flex items-center">
                                  <span>{revealedCardNumbers[card.uuid || ""]}</span>
                                  <span className="ml-2 bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                                    30s
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center group">
                                  <span>{card.card_number}</span>
                                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 hover:bg-white/30 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    <span>Mutasd</span>
                                  </div>
                                </div>
                              )}
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
                              variant={card.is_locked ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {card.is_locked ? "Zárolt" : "Aktív"}
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
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => {
                                    if (!card.uuid) {
                                      console.error("Card has no UUID! Card data:", card);
                                      toast({
                                        title: "Hiba történt",
                                        description: "A kártya azonosítója hiányzik.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Beállítjuk a dialógus adatait
                                    setCardSettingsDialog({
                                      open: true,
                                      cardUuid: card.uuid,
                                      cardNumber: card.card_number
                                    });
                                  }}
                                >
                                  <Settings className="w-4 h-4" />
                                  Kártya beállítások
                                </Button>
                                <Button 
                                  variant={card.is_locked ? "default" : "destructive"} 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => {
                                    console.log("Lock button clicked for card:", card);
                                    if (!card.uuid) {
                                      console.error("Card has no UUID! Card data:", card);
                                      toast({
                                        title: "Hiba történt",
                                        description: "A kártya azonosítója hiányzik.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    handleToggleCardLock(card.uuid, card.is_locked);
                                  }}
                                >
                                  {card.is_locked ? (
                                    <>
                                      <UnlockIcon className="w-4 h-4" />
                                      Kártya feloldása
                                    </>
                                  ) : (
                                    <>
                                      <LockIcon className="w-4 h-4" />
                                      Kártya zárolása
                                    </>
                                  )}
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
      
      {/* Kártya beállítások dialógus */}
      <CardSettingsDialog
        open={cardSettingsDialog.open}
        onOpenChange={(open) => setCardSettingsDialog(prev => ({ ...prev, open }))}
        cardUuid={cardSettingsDialog.cardUuid}
        cardNumber={cardSettingsDialog.cardNumber}
        accounts={accountsData.accounts}
        onSave={handleUpdateCardSettings}
        loading={loading}
      />
      
      {/* Új kártya igénylés dialógus */}
      <CreateCardDialog
        open={showCreateCardDialog}
        onOpenChange={setShowCreateCardDialog}
        accounts={accountsData.accounts}
        onSubmit={handleCreateCard}
        loading={loading}
      />
    </BankingLayout>
  );
};

export default Accounts;