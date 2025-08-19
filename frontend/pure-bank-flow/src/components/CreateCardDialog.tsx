import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccount } from "../pages/Accounts";

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
  onSubmit: (accountUuid: string, pincode: string) => void;
  loading: boolean;
}

export function CreateCardDialog({
  open,
  onOpenChange,
  accounts,
  onSubmit,
  loading
}: CreateCardDialogProps) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState("");

  const handleSubmit = () => {
    // Validáljuk a PIN kódot
    if (pincode.length !== 4 || !/^\d+$/.test(pincode)) {
      setPincodeError("A PIN kódnak pontosan 4 számjegyből kell állnia.");
      return;
    }
    
    onSubmit(selectedAccount, pincode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új bankkártya igénylése</DialogTitle>
          <DialogDescription>
            Add meg az új bankkártya adatait. A kártya a kiválasztott számlához lesz kapcsolva.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          <div className="grid gap-2">
            <Label htmlFor="pincode">PIN kód</Label>
            <Input 
              id="pincode" 
              type="password"
              maxLength={4}
              value={pincode}
              onChange={(e) => {
                const value = e.target.value;
                setPincode(value);
                if (value && (value.length !== 4 || !/^\d+$/.test(value))) {
                  setPincodeError("A PIN kódnak pontosan 4 számjegyből kell állnia.");
                } else {
                  setPincodeError("");
                }
              }}
              placeholder="Új PIN kód (4 számjegy)"
              className={pincodeError ? "border-red-500" : ""}
            />
            {pincodeError && <p className="text-red-500 text-xs mt-1">{pincodeError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Mégsem</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!pincode || !selectedAccount || loading || !!pincodeError}
          >
            {loading ? "Igénylés..." : "Igénylés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
