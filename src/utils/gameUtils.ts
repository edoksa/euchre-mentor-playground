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

export const dealCards = (deck: Card[]): { hands: Card[][]; remainingDeck: Card[] } | null => {
  try {
    if (!deck || deck.length < 24) {
      console.error("Invalid deck provided for dealing");
      return null;
    }

    const hands: Card[][] = [[], [], [], []];
    const shuffledDeck = shuffleDeck([...deck]);
    
    // Deal exactly 5 cards to each player
    for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
      for (let cardIndex = 0; cardIndex < 5; cardIndex++) {
        const card = shuffledDeck.pop();
        if (!card) {
          console.error("Not enough cards in deck");
          return null;
        }
        hands[playerIndex].push(card);
      }
    }

    return {
      hands,
      remainingDeck: shuffledDeck
    };
  } catch (error) {
    console.error("Error in dealCards:", error);
    return null;
  }
};

// Helper to get the corresponding left bower suit
const getLeftBowerSuit = (trump: Suit): Suit => {
  switch (trump) {
    case "hearts": return "diamonds";
    case "diamonds": return "hearts";
    case "spades": return "clubs";
    case "clubs": return "spades";
  }
};

// Helper to determine if a card is effectively trump (including bowers)
const isTrumpCard = (card: Card, trump: Suit): boolean => {
  if (card.suit === trump) return true;
  if (card.rank === "J" && card.suit === getLeftBowerSuit(trump)) return true;
  return false;
};

// Helper to get effective suit of a card (considering bowers)
const getEffectiveSuit = (card: Card, trump: Suit): Suit => {
  if (card.rank === "J" && card.suit === getLeftBowerSuit(trump)) return trump;
  return card.suit;
};

export const isValidPlay = (card: Card, hand: Card[], trick: Card[], trump: Suit): boolean => {
  if (trick.length === 0) return true;
  
  const leadCard = trick[0];
  const leadSuit = getEffectiveSuit(leadCard, trump);
  
  // Check if player has any cards of the lead suit (considering bowers)
  const hasSuit = hand.some(c => getEffectiveSuit(c, trump) === leadSuit);
  
  // If player has lead suit, they must play it
  if (hasSuit) {
    return getEffectiveSuit(card, trump) === leadSuit;
  }
  
  // If player doesn't have lead suit, they can play anything
  return true;
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

const canBeatCard = (cardToPlay: Card, cardToBeat: Card, trump: Suit): boolean => {
  return isWinningCard(cardToPlay, cardToBeat, trump);
};

const findHighestPlayedCard = (trick: Card[], trump: Suit): Card => {
  return trick.reduce((highest, current) => 
    isWinningCard(current, highest, trump) ? current : highest
  , trick[0]);
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
  const highestPlayed = findHighestPlayedCard(trick, trump);
  
  if (followingSuit.length > 0) {
    // Must follow suit
    const canWinTrick = followingSuit.some(card => canBeatCard(card, highestPlayed, trump));
    if (canWinTrick) {
      const lowestWinningCard = followingSuit
        .filter(card => canBeatCard(card, highestPlayed, trump))
        .reduce((lowest, card) => 
          RANKS.indexOf(card.rank) < RANKS.indexOf(lowest.rank) ? card : lowest
        );
      return `You can win this trick - play your ${lowestWinningCard.rank} of ${lowestWinningCard.suit} to win efficiently.`;
    } else {
      return "You can't win this trick - play your lowest card in the led suit to save stronger cards for later.";
    }
  }

  const trumpCards = hand.filter((c) => c.suit === trump);
  if (trumpCards.length > 0) {
    // Can't follow suit but have trump
    const highestTrumpPlayed = trick.find(c => c.suit === trump);
    if (!highestTrumpPlayed) {
      // No trump played yet
      const remainingPlayers = 3 - trick.length;
      if (remainingPlayers > 1) {
        return "Consider saving your trump - other players might trump in after you.";
      }
      return "Consider trumping to win the trick - you're the last player who could trump!";
    } else if (trumpCards.some(card => canBeatCard(card, highestTrumpPlayed, trump))) {
      return "You can over-trump to win the trick - but consider if it's worth using your high trump now.";
    } else {
      return "Save your trump cards - you can't win this trick.";
    }
  }

  // Can't follow suit and no trump
  const lowestCard = hand.reduce((lowest, card) => 
    RANKS.indexOf(card.rank) < RANKS.indexOf(lowest.rank) ? card : lowest
  );
  return `Discard your ${lowestCard.rank} of ${lowestCard.suit} since you can't win this trick.`;
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
