import { useState } from "react";
import {
  getCards,
  createCard,
  setCardLimit,
  freezeCard,
  revokeCard,
  unfreezeCard,
  PhysicalCard,
} from "@/lib/cards-api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CardsProps {
  accountId: string;
  cardHolder: string;
}

export default function CardsManager({ accountId, cardHolder }: CardsProps) {
  const [cards, setCards] = useState<PhysicalCard[]>(getCards(accountId));
  const [newLimit, setNewLimit] = useState(1000);

  function handleCreate() {
    createCard(accountId, cardHolder, newLimit);
    setCards(getCards(accountId));
  }

  function handleLimit(cardId: string, limit: number) {
    setCardLimit(cardId, limit);
    setCards(getCards(accountId));
  }

  function handleFreeze(cardId: string) {
    freezeCard(cardId);
    setCards(getCards(accountId));
  }

  function handleUnfreeze(cardId: string) {
    unfreezeCard(cardId);
    setCards(getCards(accountId));
  }

  function handleRevoke(cardId: string) {
    revokeCard(cardId);
    setCards(getCards(accountId));
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min={100}
          value={newLimit}
          onChange={e => setNewLimit(Number(e.target.value))}
          className="border rounded px-2 py-1 w-24"
        />
        <Button onClick={handleCreate}>Új kártya igénylése</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(card => (
          <Card key={card.id}>
            <CardHeader>
              <CardTitle>{card.cardNumber}</CardTitle>
              <CardDescription>{card.cardHolder} | Lejárat: {card.expiry}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>Limit: ${card.limit}</div>
              <div>Státusz: {card.status}</div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <input
                type="number"
                min={100}
                value={card.limit}
                onChange={e => handleLimit(card.id, Number(e.target.value))}
                className="border rounded px-2 py-1 w-20"
              />
              {card.status === "active" && (
                <Button variant="outline" onClick={() => handleFreeze(card.id)}>Zárolás</Button>
              )}
              {card.status === "frozen" && (
                <Button variant="outline" onClick={() => handleUnfreeze(card.id)}>Feloldás</Button>
              )}
              {card.status !== "revoked" && (
                <Button variant="destructive" onClick={() => handleRevoke(card.id)}>Visszavonás</Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
