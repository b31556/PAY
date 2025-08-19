import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccount } from "../pages/Accounts";

interface CardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardUuid: string;
  cardNumber: string;
  accounts: BankAccount[];
  onSave: (cardUuid: string, accountUuid: string, pincode: string) => void;
  loading: boolean;
}

export function CardSettingsDialog({
  open,
  onOpenChange,
  cardUuid,
  cardNumber,
  accounts,
  onSave,
  loading
}: CardSettingsDialogProps) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [pincode, setPincode] = useState("");

  const handleSave = () => {
    onSave(cardUuid, selectedAccount, pincode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kártya beállítások</DialogTitle>
          <DialogDescription>
            Módosítsd a(z) {cardNumber} számú kártya beállításait
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pincode">PIN kód</Label>
            <Input 
              id="pincode" 
              type="password"
              maxLength={4}
              value={pincode} 
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Új PIN kód (4 számjegy)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="connected-account">Kapcsolt számla</Label>
            <Select 
              value={selectedAccount}
              onValueChange={setSelectedAccount}
            >
              <SelectTrigger id="connected-account">
                <SelectValue placeholder="Válassz számlát" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.uuid} value={account.uuid}>
                    {account.holder_name} - {account.bank_account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Mégsem</Button>
          <Button 
            onClick={handleSave}
            disabled={!pincode || !selectedAccount || loading}
          >
            {loading ? "Mentés..." : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
