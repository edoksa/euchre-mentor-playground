
import { Card, Rank, Suit, Player } from "@/types/game";

const SUITS: Suit[] = ["hearts", "diamonds", "spades", "clubs"];
const RANKS: Rank[] = ["9", "10", "J", "Q", "K", "A"];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}`,
      });
    });
  });
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const dealCards = (deck: Card[]): { hands: Card[][]; remainingDeck: Card[] } => {
  const hands: Card[][] = [[], [], [], []];
  const newDeck = [...deck];
  
  // Deal 5 cards to each player
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      const card = newDeck.pop();
      if (card) hands[j].push(card);
    }
  }

  return { hands, remainingDeck: newDeck };
};

export const isValidPlay = (card: Card, hand: Card[], trick: Card[], trump: Suit): boolean => {
  if (trick.length === 0) return true;
  const leadSuit = trick[0].suit;
  const hasSuit = hand.some((c) => c.suit === leadSuit);
  return !hasSuit || card.suit === leadSuit;
};

export const determineWinner = (trick: Card[], trump: Suit): number => {
  let winningCard = trick[0];
  let winningIndex = 0;

  for (let i = 1; i < trick.length; i++) {
    if (isWinningCard(trick[i], winningCard, trump)) {
      winningCard = trick[i];
      winningIndex = i;
    }
  }

  return winningIndex;
};

const isWinningCard = (card1: Card, card2: Card, trump: Suit): boolean => {
  if (card1.suit === trump && card2.suit !== trump) return true;
  if (card1.suit !== trump && card2.suit === trump) return false;
  if (card1.suit !== card2.suit) return false;
  return RANKS.indexOf(card1.rank) > RANKS.indexOf(card2.rank);
};

export const getTip = (
  hand: Card[],
  trick: Card[],
  trump: Suit,
  phase: "playing" | "bidding"
): string => {
  if (phase === "bidding") {
    const trumpCards = hand.filter((c) => c.suit === trump);
    if (trumpCards.length >= 3) return "You have a strong trump hand - consider ordering it up!";
    return "Your hand is weak in trump - you might want to pass.";
  }

  if (trick.length === 0) {
    const highCards = hand.filter((c) => ["A", "K"].includes(c.rank));
    if (highCards.length > 0) return "Leading with a high card can help control the trick.";
    return "When leading without high cards, try to draw out stronger cards from opponents.";
  }

  const leadSuit = trick[0].suit;
  const followingSuit = hand.filter((c) => c.suit === leadSuit);
  if (followingSuit.length > 0) {
    return "You must follow suit if you can.";
  }

  const trumpCards = hand.filter((c) => c.suit === trump);
  if (trumpCards.length > 0) {
    return "You can't follow suit - consider trumping to win the trick!";
  }

  return "You can't follow suit or trump - discard a low card.";
};
