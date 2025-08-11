// Card model for physical cards
export interface PhysicalCard {
  id: string;
  accountId: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  status: "active" | "frozen" | "revoked";
  limit: number;
  createdAt: string;
}

// Mock API for card operations
let cards: PhysicalCard[] = [];

export function getCards(accountId: string): PhysicalCard[] {
  return cards.filter(card => card.accountId === accountId);
}

export function createCard(accountId: string, cardHolder: string, limit: number): PhysicalCard {
  const newCard: PhysicalCard = {
    id: Math.random().toString(36).slice(2),
    accountId,
    cardNumber: "4111 1111 1111 " + Math.floor(1000 + Math.random() * 9000),
    cardHolder,
    expiry: "12/28",
    status: "active",
    limit,
    createdAt: new Date().toISOString(),
  };
  cards.push(newCard);
  return newCard;
}

export function setCardLimit(cardId: string, limit: number) {
  const card = cards.find(c => c.id === cardId);
  if (card) card.limit = limit;
}

export function freezeCard(cardId: string) {
  const card = cards.find(c => c.id === cardId);
  if (card) card.status = "frozen";
}

export function revokeCard(cardId: string) {
  const card = cards.find(c => c.id === cardId);
  if (card) card.status = "revoked";
}

export function unfreezeCard(cardId: string) {
  const card = cards.find(c => c.id === cardId);
  if (card && card.status === "frozen") card.status = "active";
}
