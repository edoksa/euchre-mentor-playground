
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
Euchre is a card game played with 4 players in 2 teams of 2 players each.

Basic Concepts:
- The game uses a special 24-card deck (only 9, 10, Jack, Queen, King, and Ace of each suit)
- Players sit across from their teammate
- Each hand consists of dealing 5 cards to each player
- One suit is chosen as "trump" for each hand, making it more powerful than other suits

What is Trump?
- Trump is the most powerful suit in each hand
- Cards of the trump suit beat any card of other suits
- When a trump suit is chosen, that suit's cards become the highest-ranking cards

What is a Trick?
- A trick is one round where each player plays one card
- The first player leads by playing any card
- Other players must follow suit (play the same suit) if they can
- If you can't follow suit, you can play any card
- The highest card of the led suit wins, unless a trump card is played
- Trump cards beat all other suits

Scoring:
- Each hand has 5 tricks total
- The team that wins 3 or more tricks scores 1 point
- If a team wins all 5 tricks (called a "march"), they score 2 points
- First team to reach 10 points wins the game

Playing Order:
1. Cards are dealt (5 to each player)
2. Players bid to choose the trump suit
3. Players take turns playing cards clockwise
4. Highest card wins each trick
5. After 5 tricks, points are awarded
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
