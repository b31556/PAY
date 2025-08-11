import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BankingLayout from "@/components/BankingLayout";
import { getBalances, getUserDetails, getAccounts } from "@/lib/banking-api";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  TrendingUp, 
  DollarSign,
  ArrowRight,
  ArrowLeftRight,
  Wallet
} from "lucide-react";
import { Link } from "react-router-dom";

interface Account {
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
  accounts: Account[];
  cards: Card[];
}

interface Transaction {
  id: string;
  type: string;
  description?: string;
  amount: number;
  created_at: string;
  title?: string;
  account_uuid?: string; // ezt érdemes hozzáadni, ha lehetséges
}

interface User {
  username: string;
  email: string;
  full_name: string;
}

interface BalanceData {
  total: number;
  accounts: Account[];
  recent_transactions: Transaction[];
  percent_compared_to_last_month: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userResponse = await getUserDetails();
        const balanceResponse = await getBalances();
        const accountsResponse = await getAccounts();
        
        setUser(userResponse as User);
        setBalanceData(balanceResponse as BalanceData);
        setAccountsData(accountsResponse as AccountsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <BankingLayout>
        <div className="space-y-8">
          <div className="h-6 w-64 bg-gray-200 animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </BankingLayout>
    );
  }

  return (
    <BankingLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">Üdvözöljük, {user?.full_name || "Felhasználó"}!</h1>
          <p className="text-muted-foreground mt-2">Íme a legfrissebb információk a számláival kapcsolatban.</p>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-banking-primary to-banking-secondary text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/80">Teljes egyenleg</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(balanceData?.total || 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+{balanceData?.percent_compared_to_last_month || 0}% az előző hónaphoz képest</span>
              </div>
            </CardContent>
          </Card>

          {balanceData?.accounts.map((account) => (
            <Card key={account.uuid} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>
                    {account.account_type === "checking" ? "Folyószámla" : 
                     account.account_type === "savings" ? "Megtakarítási számla" : "Hitelkártya számla"}
                  </CardDescription>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </div>
                <CardTitle className={`text-xl ${account.balance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(account.balance, account.currency)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{account.bank_account_number}</p>
                <div className="mt-4">
                  <Link to={`/accounts`}>
                    <Button variant="ghost" size="sm" className="text-xs px-0 h-6">
                      Részletek <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Bankkártyák megjelenítése */}
        {accountsData && accountsData.cards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bankkártyáim</CardTitle>
              <CardDescription>Virtuális és fizikai kártyák áttekintése</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountsData.cards.map((card, index) => {
                  const linkedAccount = accountsData.accounts.find(a => a.uuid === card.account_uuid);
                  return (
                    <div key={card.card_number ?? index} className="relative">
                      <div 
                        className={`
                          rounded-xl overflow-hidden shadow-lg
                          bg-gradient-to-br from-gray-900 via-banking-primary to-black
                          relative flex flex-col justify-between p-4
                          h-[140px] transform transition-all hover:scale-105 cursor-pointer
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-white opacity-80 text-xs">
                            {card.card_type === "credit" ? "Hitelkártya" : "Bankkártya"}
                          </div>
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="text-white font-mono text-base tracking-wider">
                          {card.card_number}
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="text-white text-xs">
                            <div>{card.card_holder}</div>
                            <div>{card.expiration_date}</div>
                          </div>
                          
                          <div className="text-white text-xs">
                            <div>{linkedAccount ? formatCurrency(linkedAccount.balance, linkedAccount.currency) : ""}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Gyors műveletek</CardTitle>
            <CardDescription>Gyakran használt banki szolgáltatások</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/transfer">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <ArrowRight className="w-6 h-6" />
                  Átutalás
                </Button>
              </Link>
              <Link to="/deposit">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <DollarSign className="w-6 h-6" />
                  Befizetés
                </Button>
              </Link>
              <Link to="/transactions">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <ArrowLeftRight className="w-6 h-6" />
                  Tranzakciók
                </Button>
              </Link>
              <Link to="/cards">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <CreditCard className="w-6 h-6" />
                  Kártyák
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </BankingLayout>
  );
};

export default Dashboard;
