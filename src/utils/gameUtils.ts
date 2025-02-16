
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
    if (trumpCards.length >= 3) {
      const highTrumpCount = trumpCards.filter((c) => ["A", "K", "Q", "J"].includes(c.rank)).length;
      if (highTrumpCount >= 2) return "Strong trump hand - consider ordering it up!";
      return "Moderate trump hand - your call on ordering up.";
    }
    return "Weak trump hand - you might want to pass.";
  }

  if (trick.length === 0) {
    const highCards = hand.filter((c) => ["A", "K"].includes(c.rank));
    if (highCards.length > 0) return "Leading with a high card can help control the trick.";
    return "When leading without high cards, try to draw out stronger cards from opponents.";
  }

  const leadSuit = trick[0].suit;
  const followingSuit = hand.filter((c) => c.suit === leadSuit);
  
  if (followingSuit.length > 0) {
    const highFollow = followingSuit.filter((c) => ["A", "K", "J"].includes(c.rank));
    if (highFollow.length > 0) return "You have high cards in the led suit - consider winning the trick!";
    return "You must follow suit - play your lowest card if you can't win.";
  }

  const trumpCards = hand.filter((c) => c.suit === trump);
  if (trumpCards.length > 0) {
    return "You can't follow suit - consider trumping to win the trick!";
  }

  return "You can't follow suit or trump - discard a low card.";
};

export const getGameRules = (): string => {
  return `
Euchre is a trick-taking card game played with 24 cards (9 through Ace).
- Teams of 2 players compete to win tricks
- First team to 10 points wins
- Trump suit makes cards of that suit more powerful
- Must follow suit if possible
- Highest trump card wins, or highest card of led suit if no trump played
- Each trick won counts as 1 point
- Making all 5 tricks (march) scores 2 points
  `;
};

export const getBestPlay = (hand: Card[], trick: Card[], trump: Suit): Card => {
  if (trick.length === 0) {
    // Leading - play highest non-trump if possible
    const nonTrump = hand.filter(c => c.suit !== trump);
    if (nonTrump.length > 0) {
      return nonTrump.reduce((highest, card) => 
        RANKS.indexOf(card.rank) > RANKS.indexOf(highest.rank) ? card : highest
      );
    }
    return hand[0]; // Play any card if only trump remains
  }

  const leadSuit = trick[0].suit;
  const followingSuit = hand.filter(c => c.suit === leadSuit);
  
  if (followingSuit.length > 0) {
    // Must follow suit - play highest if we can win, lowest if we can't
    return followingSuit.reduce((best, card) => 
      RANKS.indexOf(card.rank) > RANKS.indexOf(best.rank) ? card : best
    );
  }

  const trumpCards = hand.filter(c => c.suit === trump);
  if (trumpCards.length > 0) {
    // Can't follow suit but have trump - play lowest trump that can win
    return trumpCards[0];
  }

  // Can't follow suit or trump - play lowest card
  return hand.reduce((lowest, card) => 
    RANKS.indexOf(card.rank) < RANKS.indexOf(lowest.rank) ? card : lowest
  );
};
