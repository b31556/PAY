import { useEffect, useState } from "react";
import BankingLayout from "@/components/BankingLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { SendRequest } from "@/lib/banking-api";
import { UserPlus, Trash2, QrCode, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import BackendOfflineOverlay from "@/components/BackendOfflineOverlay";
import { checkBackendConnectivity } from "@/lib/backend-connectivity";

interface Contact {
  uuid: string;
  name: string;
  bank_account_number: string;
  email: string;
}

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

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showQrSetupDialog, setShowQrSetupDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: "", bank_account_number: "", email: "" });
  const [pendingRemove, setPendingRemove] = useState<Contact | null>(null);
  const [urlAddContact, setUrlAddContact] = useState<{ name: string, bank_account_number: string, email: string } | null>(null);

  // Új: Bank accountok QR setuphoz
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [qrSetupForm, setQrSetupForm] = useState({ bank_account_uuid: "", name: "", email: "" });
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);

  // Kontaktok betöltése
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await SendRequest("/contacts/list", {});
      if (response.success && response.data && response.data.contacts) {
        setContacts(response.data.contacts);
      } else {
        toast({
          title: "Hiba a kontaktok betöltésekor",
          description: "Nem sikerült betölteni a kontaktokat.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba a kontaktok betöltésekor",
        description: error instanceof Error ? error.message : "Ismeretlen hiba",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bank accountok betöltése QR setuphoz
  const fetchAccounts = async () => {
    try {
      const response = await SendRequest("/accounts");
      if (response.success && response.data && response.data.accounts) {
        setAccounts(response.data.accounts);
      }
    } catch {
      // ignore, toast nem kell
    }
  };

  // Felhasználó adatainak lekérése
  const fetchUser = async () => {
    try {
      const response = await SendRequest("/me");
      if (response.data) {
        setUser({
          full_name: response.data.full_name,
          email: response.data.email,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Backend connectivity check
    checkBackendConnectivity().then(ok => {
      if (!ok) setBackendOffline(true);
    });

    fetchContacts();
    fetchAccounts();
    fetchUser();
    // URL paraméterek figyelése hozzáadáshoz
    const params = new URLSearchParams(window.location.search);
    const bak = params.get("bak");
    const name = params.get("name");
    const email = params.get("email");
    if (bak && name && email) {
      setUrlAddContact({ bank_account_number: bak, name, email });
      setShowAddDialog(true);
    }
  }, []);

  // Kontakt hozzáadása
  const handleAddContact = async () => {
    setIsAddLoading(true);
    try {
      const payload = {
        name: addForm.name,
        bank_account_number: addForm.bank_account_number,
        email: addForm.email,
      };
      const response = await SendRequest("/contacts/add", payload);
      if (response.data.contact_uuid) {
        fetchContacts();
        toast({
          title: "Kontakt hozzáadva",
          description: `sikeresen hozzáadva.`,
        });
        setShowAddDialog(false);
        setAddForm({ name: "", bank_account_number: "", email: "" });
        setUrlAddContact(null);
        const params = new URLSearchParams(window.location.search);
        params.delete("bak");
        params.delete("name");
        params.delete("email");
        window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      } else {
        toast({
          title: "Hiba hozzáadáskor",
          description: response.data.detail || "Nem sikerült hozzáadni a kontaktot.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba hozzáadáskor",
        description: error instanceof Error ? error.message : "Ismeretlen hiba",
        variant: "destructive",
      });
    } finally {
      setIsAddLoading(false);
    }
  };

  // Kontakt törlése
  const handleRemoveContact = async () => {
    if (!pendingRemove) return;
    setIsAddLoading(true);
    try {
      const response = await SendRequest("/contacts/rm", { contact_uuid: pendingRemove.uuid });
      if (response.code === 200) {
        setContacts(prev => prev.filter(c => c.uuid !== pendingRemove.uuid));
        toast({
          title: "Kontakt törölve",
          description: `${pendingRemove.name} sikeresen törölve.`,
        });
        setPendingRemove(null);
      } else {
        toast({
          title: "Hiba törléskor",
          description: response.message || "Nem sikerült törölni a kontaktot.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba törléskor",
        description: error instanceof Error ? error.message : "Ismeretlen hiba",
        variant: "destructive",
      });
    } finally {
      setIsAddLoading(false);
    }
  };

  // QR setup dialógus megnyitása
  const handleShowQrSetup = () => {
    setQrSetupForm({
      bank_account_uuid: accounts.length > 0 ? accounts[0].uuid : "",
      name: user?.full_name || "",
      email: user?.email || "",
    });
    setShowQrSetupDialog(true);
  };

  // QR kód lekérése a setup dialógusból
  const handleGenerateQr = async () => {
    setIsQrLoading(true);
    setQrCodeUrl(null);
    try {
      const payload = {
        bank_account_uuid: qrSetupForm.bank_account_uuid,
        name: qrSetupForm.name,
        email: qrSetupForm.email,
      };
    const response = await SendRequest("/contacts/me/qrcode", payload);
    if (response.data && response.data.qr_code) {
      setQrCodeUrl(`data:image/png;base64,${response.data.qr_code}`);
      setShowQrDialog(true);
      setShowQrSetupDialog(false);
    } else {
      toast({
        title: "QR kód hiba",
        description: "Nem sikerült lekérni a QR kódot.",
        variant: "destructive",
      });
    }
      
    } catch (error) {
      toast({
        title: "QR kód hiba",
        description: error instanceof Error ? error.message : "Ismeretlen hiba",
        variant: "destructive",
      });
    } finally {
      setIsQrLoading(false);
    }
  };

  // Add dialog form kitöltése (URL paraméterből vagy manuálisan)
  useEffect(() => {
    if (urlAddContact) {
      setAddForm(urlAddContact);
    }
  }, [urlAddContact]);

  return (
    <>
      {backendOffline && <BackendOfflineOverlay />}
      {!backendOffline && (
        <BankingLayout>
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold">Kapcsolatok</h1>
              <p className="text-muted-foreground mt-2">Kezelje banki kontaktjait, adjon hozzá, töröljön, vagy ossza meg QR kóddal.</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Kontakt lista */}
              <div className="flex-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Kontaktok</CardTitle>
                    <CardDescription>Az összes mentett banki kontaktja</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="mb-4 bg-gradient-to-r from-banking-primary to-banking-secondary"
                      onClick={() => { setShowAddDialog(true); setAddForm({ name: "", bank_account_number: "", email: "" }); }}
                      disabled={isAddLoading}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Új kontakt hozzáadása
                    </Button>
                    <Button
                      variant="outline"
                      className="mb-4 ml-2"
                      onClick={handleShowQrSetup}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Saját QR kód megtekintése
                    </Button>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        <span>Betöltés...</span>
                      </div>
                    ) : contacts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nincs mentett kontakt.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {contacts.map(contact => (
                          <div key={contact.uuid} className="flex items-center justify-between py-3">
                            <div>
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-xs text-muted-foreground">{contact.bank_account_number} &bull; {contact.email}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingRemove(contact)}
                              title="Kontakt törlése"
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Kontakt hozzáadás dialógus */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Kontakt hozzáadása</DialogTitle>
                <DialogDescription>
                  Adja meg a kontakt adatait, vagy erősítse meg a hozzáadást.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Név</Label>
                  <Input
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Név"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banki számlaszám</Label>
                  <Input
                    value={addForm.bank_account_number}
                    onChange={e => setAddForm(f => ({ ...f, bank_account_number: e.target.value }))}
                    placeholder="Számlaszám"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={addForm.email}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    type="email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setShowAddDialog(false); setUrlAddContact(null); const params = new URLSearchParams(window.location.search);
        params.delete("bak");
        params.delete("name");
        params.delete("email");
        window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      }}
    >
      Mégsem
    </Button>
    <Button
      onClick={handleAddContact}
              className="bg-gradient-to-r from-banking-primary to-banking-secondary"
              disabled={isAddLoading || !addForm.name || !addForm.bank_account_number || !addForm.email}
            >
              {isAddLoading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Hozzáadás...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Kontakt hozzáadása
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kontakt törlés dialógus */}
      <Dialog open={!!pendingRemove} onOpenChange={v => !v && setPendingRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kontakt törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretné ezt a kontaktot?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="font-medium">{pendingRemove?.name}</div>
            <div className="text-xs text-muted-foreground">{pendingRemove?.bank_account_number} &bull; {pendingRemove?.email}</div>
            <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                A törlés végleges, nem visszavonható!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRemove(null)}
            >
              Mégsem
            </Button>
            <Button
              onClick={handleRemoveContact}
              className="bg-gradient-to-r from-red-500 to-red-700"
              disabled={isAddLoading}
            >
              {isAddLoading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Törlés...
                </div>
              ) : (
                <div className="flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Kontakt törlése
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR setup dialógus */}
      <Dialog open={showQrSetupDialog} onOpenChange={setShowQrSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR kód beállítása</DialogTitle>
            <DialogDescription>
              Válassza ki, melyik számlához legyen a QR kód kötve, és milyen adatokat mutasson.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Számla</Label>
              <select
                className="w-full border rounded px-2 py-1"
                value={qrSetupForm.bank_account_uuid}
                onChange={e => setQrSetupForm(f => ({ ...f, bank_account_uuid: e.target.value }))}
              >
                {accounts.map(acc => (
                  <option key={acc.uuid} value={acc.uuid}>
                    {acc.memo} - {acc.bank_account_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Név</Label>
              <Input
                value={qrSetupForm.name}
                onChange={e => setQrSetupForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Név a QR-ban"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={qrSetupForm.email}
                onChange={e => setQrSetupForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email a QR-ban"
                type="email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQrSetupDialog(false)}
            >
              Mégsem
            </Button>
            <Button
              onClick={handleGenerateQr}
              className="bg-gradient-to-r from-banking-primary to-banking-secondary"
              disabled={
                isQrLoading ||
                !qrSetupForm.bank_account_uuid ||
                !qrSetupForm.name ||
                !qrSetupForm.email
              }
            >
              {isQrLoading ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  QR generálása...
                </div>
              ) : (
                <div className="flex items-center">
                  <QrCode className="w-4 h-4 mr-2" />
                  QR kód generálása
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* QR kód dialógus */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saját QR kód</DialogTitle>
            <DialogDescription>
              Ossza meg QR kódját, hogy mások könnyen hozzáadhassák Önt kontaktként.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {isQrLoading ? (
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR kód" className="w-48 h-48 rounded-lg border" />
            ) : (
              <div className="text-muted-foreground">QR kód nem elérhető.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </BankingLayout>
    )}
  </>
);
}

export default Contacts;
