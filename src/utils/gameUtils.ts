import { Card, Rank, Suit } from "@/types/game";

const SUITS_ORDER: Suit[] = ["clubs", "diamonds", "hearts", "spades"]; // Define an order for suits if needed for tie-breaking non-trump scenarios, though rank is primary.
const STD_RANKS_ORDER: Rank[] = ["9", "10", "J", "Q", "K", "A"]; // Standard rank order

/**
 * Creates a standard 24-card Euchre deck.
 * @returns An array of Card objects.
 */
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS_ORDER.forEach((suit) => {
    STD_RANKS_ORDER.forEach((rank) => {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}`, // Unique ID for each card
      });
    });
  });
  return shuffleDeck(deck);
};

/**
 * Shuffles an array of cards.
 * @param deck - The deck of cards to shuffle.
 * @returns A new array with the cards shuffled.
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]; // Swap elements
  }
  return newDeck;
};

/**
 * Deals cards to 4 players from a deck.
 * @param deck - The deck to deal from.
 * @returns An object containing the hands for each player and the remaining deck, or null if dealing fails.
 */
export const dealCards = (deck: Card[]): { hands: Card[][]; remainingDeck: Card[] } | null => {
  try {
    if (!deck || deck.length < 20) { // Euchre uses 24 cards, dealing 5 to each means 20 cards are used.
      console.error("Invalid deck provided for dealing (less than 20 cards).");
      return null;
    }

    const hands: Card[][] = [[], [], [], []];
    const shuffledDeck = shuffleDeck([...deck]); // Ensure deck is shuffled before dealing

    // Deal 5 cards to each of the 4 players
    for (let cardIndex = 0; cardIndex < 5; cardIndex++) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        const card = shuffledDeck.pop();
        if (!card) {
          // This should not happen if deck validation is correct
          console.error("Not enough cards in deck during dealing.");
          return null; 
        }
        hands[playerIndex].push(card);
      }
    }
    return {
      hands,
      remainingDeck: shuffledDeck, // The remaining 4 cards form the kitty/turn-up card pile
    };
  } catch (error) {
    console.error("Error in dealCards:", error);
    return null;
  }
};

/**
 * Determines the suit of the Left Bower given the trump suit.
 * The Left Bower is the Jack of the suit of the same color as the trump suit.
 * @param trump - The current trump suit.
 * @returns The suit of the Left Bower.
 */
export const getLeftBowerSuit = (trump: Suit): Suit => {
  switch (trump) {
    case "hearts": return "diamonds";
    case "diamonds": return "hearts";
    case "spades": return "clubs";
    case "clubs": return "spades";
    default: throw new Error(`Invalid trump suit: ${trump}`); // Should not happen
  }
};

/**
 * Determines the effective suit of a card, considering the trump suit and Bowers.
 * The Left Bower's effective suit is the trump suit.
 * @param card - The card to evaluate.
 * @param trump - The current trump suit.
 * @returns The effective suit of the card.
 */
export const getEffectiveSuit = (card: Card, trump: Suit): Suit => {
  if (card.rank === "J" && card.suit === getLeftBowerSuit(trump)) {
    return trump; // Left Bower acts as trump suit
  }
  return card.suit;
};

/**
 * Calculates a numerical value for a card's rank, considering trump and Bowers.
 * Higher values indicate stronger cards.
 * - Right Bower (Jack of trump) is highest (18).
 * - Left Bower (Jack of same color as trump) is second highest (17).
 * - Other trump cards: A (16), K (15), Q (14), J (if not bower, 13), 10 (12), 9 (11).
 * - Non-trump cards: A (10), K (9), Q (8), J (7), 10 (6), 9 (5).
 * @param card - The card to evaluate.
 * @param trump - The current trump suit.
 * @returns A numerical value representing the card's rank.
 */
export const getRankValue = (card: Card, trump: Suit): number => {
  const isTrump = getEffectiveSuit(card, trump) === trump;
  const rankOrder = STD_RANKS_ORDER.indexOf(card.rank); // Base value: 0-5 for 9-A

  if (isTrump) {
    if (card.rank === "J") {
      // Check for Bowers
      if (card.suit === trump) {
        return 18; // Right Bower
      }
      if (card.suit === getLeftBowerSuit(trump)) {
        return 17; // Left Bower
      }
    }
    // Other trump cards, A is highest, 9 is lowest among these.
    // Add 11 to elevate trumps above non-trumps, and to map 9-A (0-5) to 11-16
    return rankOrder + 11; // 9 (0) -> 11, A (5) -> 16
  } else {
    // Non-trump cards, A is highest, 9 is lowest.
    // Add 5 to keep non-trump Aces (5+5=10) below lowest trump 9 (11)
    return rankOrder + 5; // 9 (0) -> 5, A (5) -> 10
  }
};

/**
 * Checks if a card is a trump card, considering Bowers.
 * @param card - The card to check.
 * @param trump - The current trump suit.
 * @returns True if the card is a trump card, false otherwise.
 */
export const isTrumpCard = (card: Card, trump: Suit): boolean => {
  return getEffectiveSuit(card, trump) === trump;
};

/**
 * Validates if a card can be played, given the player's hand, current trick, and trump suit.
 * - If leading a trick, any card is valid.
 * - If following, must play a card of the same effective suit as the lead card, if possible.
 * - If unable to follow suit, any card (trump or off-suit) can be played.
 * @param cardToPlay - The card the player intends to play.
 * @param hand - The player's current hand.
 * @param trick - The cards already played in the current trick.
 * @param trump - The current trump suit.
 * @returns True if the play is valid, false otherwise.
 */
export const isValidPlay = (cardToPlay: Card, hand: Card[], trick: Card[], trump: Suit): boolean => {
  if (!hand.some(c => c.id === cardToPlay.id)) {
    // Basic check: card must be in hand. This should ideally be caught earlier.
    console.error("isValidPlay: Card not in hand.", cardToPlay, hand);
    return false;
  }

  if (trick.length === 0) {
    return true; // Can lead any card
  }

  const leadCard = trick[0];
  const effectiveLeadSuit = getEffectiveSuit(leadCard, trump);
  const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trump);

  // Check if the player has any cards of the effective lead suit
  const hasLeadSuitInHand = hand.some(c => getEffectiveSuit(c, trump) === effectiveLeadSuit);

  if (hasLeadSuitInHand) {
    // If player has the lead suit, they must play a card of that suit
    return cardToPlayEffectiveSuit === effectiveLeadSuit;
  } else {
    // If player does not have the lead suit, they can play any card
    return true;
  }
};

/**
 * Determines the winning card's index from a completed trick.
 * @param trick - An array of cards representing the trick. Must not be empty.
 * @param trump - The current trump suit.
 * @returns The index of the winning card in the trick array.
 */
export const determineWinner = (trick: Card[], trump: Suit): number => {
  if (!trick || trick.length === 0) {
    throw new Error("Cannot determine winner of an empty trick.");
  }

  let winningCardIndex = 0; // Assume the first card is winning initially
  let winningCard = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    const winningCardEffectiveSuit = getEffectiveSuit(winningCard, trump);
    const currentCardEffectiveSuit = getEffectiveSuit(currentCard, trump);
    const winningCardRankValue = getRankValue(winningCard, trump);
    const currentCardRankValue = getRankValue(currentCard, trump);

    if (currentCardEffectiveSuit === trump) {
      // Current card is trump
      if (winningCardEffectiveSuit === trump) {
        // Both are trump, compare rank values
        if (currentCardRankValue > winningCardRankValue) {
          winningCard = currentCard;
          winningCardIndex = i;
        }
      } else {
        // Current card is trump, winning card was not; current card wins
        winningCard = currentCard;
        winningCardIndex = i;
      }
    } else {
      // Current card is not trump
      if (winningCardEffectiveSuit !== trump) {
        // Neither are trump, compare if current card is same suit as lead and higher rank
        // (The first card of the trick sets the suit to follow if no trump is played)
        const leadSuitOfTrick = getEffectiveSuit(trick[0], trump);
        if (currentCardEffectiveSuit === leadSuitOfTrick && currentCardRankValue > winningCardRankValue) {
          winningCard = currentCard;
          winningCardIndex = i;
        }
      }
      // If current is not trump and winning card is trump, current card cannot win.
    }
  }
  return winningCardIndex;
};


/**
 * Suggests the best card to play for a CPU player or as a hint.
 * @param hand - The player's hand.
 * @param trick - The cards currently in the trick.
 * @param trump - The trump suit.
 * @param playerCardsRemaining - Optional array indicating cards remaining for other players, for advanced strategy.
 * @param partnerIsWinning - Optional boolean indicating if the player's partner is currently winning the trick.
 * @returns The best card to play. Returns the first valid card if multiple have same best score, or first card if no clear strategy.
 */
export const getBestPlay = (
  hand: Card[],
  trick: Card[],
  trump: Suit,
  playerCardsRemaining?: number[], // Example: [5, 4, 3] for players after current
  partnerIsWinning?: boolean // Is the current player's partner winning the trick?
): Card => {
  const validPlays = hand.filter(card => isValidPlay(card, hand, trick, trump));
  if (validPlays.length === 0) {
    // This should not happen if hand has cards and isValidPlay is correct.
    // Fallback to the first card in hand, though it might be invalid.
    console.error("getBestPlay: No valid plays found. This is an issue.", hand, trick, trump);
    return hand[0]; 
  }
  if (validPlays.length === 1) {
    return validPlays[0]; // Only one valid play
  }

  // Determine current winning card in the trick if trick is not empty
  let currentWinningCardInTrick: Card | undefined = undefined;
  if (trick.length > 0) {
    const winnerIndex = determineWinner(trick, trump);
    currentWinningCardInTrick = trick[winnerIndex];
  }

  if (trick.length === 0) {
    // --- Leading a new trick ---
    // 1. Right Bower
    const rightBower = validPlays.find(c => c.rank === "J" && c.suit === trump);
    if (rightBower) return rightBower;
    // 2. Left Bower
    const leftBower = validPlays.find(c => c.rank === "J" && c.suit === getLeftBowerSuit(trump));
    if (leftBower) return leftBower;
    // 3. Highest trump (Ace, King, etc.)
    const sortedTrump = validPlays
      .filter(c => isTrumpCard(c, trump))
      .sort((a, b) => getRankValue(b, trump) - getRankValue(a, trump));
    if (sortedTrump.length > 0) return sortedTrump[0];
    // 4. Highest off-suit Ace
    const offSuitAces = validPlays.filter(c => c.rank === "A" && !isTrumpCard(c, trump));
    if (offSuitAces.length > 0) {
        // Prefer leading an Ace from a suit with fewer cards in hand (singleton or doubleton Ace)
        offSuitAces.sort((a,b) => hand.filter(h => h.suit === a.suit).length - hand.filter(h => h.suit === b.suit).length);
        return offSuitAces[0];
    }
    // 5. Other high off-suit cards (K, Q)
    const highOffSuit = validPlays
        .filter(c => !isTrumpCard(c, trump) && (c.rank === "K" || c.rank === "Q"))
        .sort((a,b) => getRankValue(b, trump) - getRankValue(a, trump)); // getRankValue handles non-trump ranks correctly
    if(highOffSuit.length > 0) return highOffSuit[0];
    // 6. Default: Lowest value card (to avoid giving away a good card if no clear strategy)
    //    However, leading lowest is often not a good Euchre strategy.
    //    A better default might be highest non-trump, or a random non-trump.
    //    For now, let's pick highest available card if no other strategy fits.
    return validPlays.sort((a, b) => getRankValue(b, trump) - getRankValue(a, trump))[0];
  } else {
    // --- Following in a trick ---
    const leadCard = trick[0];
    const effectiveLeadSuit = getEffectiveSuit(leadCard, trump);
    const currentWinningValue = currentWinningCardInTrick ? getRankValue(currentWinningCardInTrick, trump) : -1;

    // If partner is winning and we are last to play (or close to it), consider discarding
    if (partnerIsWinning && (trick.length === 3 || (trick.length === 2 && playerCardsRemaining?.length === 1) )) {
        // If partner is winning, play lowest possible card
        return validPlays.sort((a,b) => getRankValue(a, trump) - getRankValue(b, trump))[0];
    }

    const canFollowSuit = validPlays.some(c => getEffectiveSuit(c, trump) === effectiveLeadSuit);

    if (canFollowSuit) {
      const followingSuitCards = validPlays.filter(c => getEffectiveSuit(c, trump) === effectiveLeadSuit);
      const winningFollowingCards = followingSuitCards.filter(c => getRankValue(c, trump) > currentWinningValue);

      if (winningFollowingCards.length > 0) {
        // Can win by following suit: play the lowest card that wins
        return winningFollowingCards.sort((a, b) => getRankValue(a, trump) - getRankValue(b, trump))[0];
      } else {
        // Cannot win by following suit: play the lowest card of that suit
        return followingSuitCards.sort((a, b) => getRankValue(a, trump) - getRankValue(b, trump))[0];
      }
    } else {
      // --- Cannot follow suit (can play any card) ---
      const trumpCardsInHand = validPlays.filter(c => isTrumpCard(c, trump));
      if (trumpCardsInHand.length > 0) {
        const winningTrumpCards = trumpCardsInHand.filter(c => getRankValue(c, trump) > currentWinningValue);
        if (winningTrumpCards.length > 0) {
          // Can trump and win: play the lowest trump that wins
          return winningTrumpCards.sort((a, b) => getRankValue(a, trump) - getRankValue(b, trump))[0];
        } else {
          // Have trump, but cannot over-trump the current winner.
          // Play lowest non-trump card to save trump, or lowest trump if only trumps available.
          const nonTrumps = validPlays.filter(c => !isTrumpCard(c, trump));
          if (nonTrumps.length > 0) {
            return nonTrumps.sort((a,b) => getRankValue(a,trump) - getRankValue(b,trump))[0];
          }
          return trumpCardsInHand.sort((a,b) => getRankValue(a,trump) - getRankValue(b,trump))[0]; // Play lowest trump
        }
      } else {
        // No trump in hand and cannot follow suit: discard the lowest-value off-suit card
        return validPlays.sort((a, b) => getRankValue(a, trump) - getRankValue(b, trump))[0];
      }
    }
  }
};


// --- Other Utility Functions (Keep existing ones like getTip, getGameRules if they are used elsewhere) ---

// (getTip and getGameRules were present in the original file, keeping them for completeness if they are used.
//  Their internal logic might also benefit from the new helper functions, but that's outside this specific subtask's scope
//  unless explicitly requested.)

const findHighestPlayedCard = (trick: Card[], trump: Suit): Card | null => {
  if (!trick || trick.length === 0) return null;
  const winnerIndex = determineWinner(trick, trump);
  return trick[winnerIndex];
};

const canBeatCard = (cardToPlay: Card, cardToBeat: Card, trump: Suit, leadSuit: Suit): boolean => {
    const playEffSuit = getEffectiveSuit(cardToPlay, trump);
    const beatEffSuit = getEffectiveSuit(cardToBeat, trump);
    const playRankVal = getRankValue(cardToPlay, trump);
    const beatRankVal = getRankValue(cardToBeat, trump);

    if (isTrumpCard(cardToPlay, trump)) {
        return !isTrumpCard(cardToBeat, trump) || playRankVal > beatRankVal;
    }
    // Not playing trump
    if (isTrumpCard(cardToBeat, trump)) return false; // Can't beat trump with non-trump
    if (playEffSuit !== beatEffSuit) {
        // If cardToBeat is not lead suit, and cardToPlay is lead suit, it could win if cardToBeat was off-suit.
        // This scenario is complex if cardToBeat wasn't following suit.
        // Assuming cardToBeat was a valid play.
        // If cardToPlay is same suit as lead, and cardToBeat is not, cardToPlay is better (unless cardToBeat is trump)
        return playEffSuit === leadSuit && beatEffSuit !== leadSuit;
    }
    // Both are same non-trump suit
    return playRankVal > beatRankVal;
};


export const getTip = (
  hand: Card[],
  trick: Card[],
  trump: Suit,
  phase: "playing" | "bidding" // Added phase to determine context
): string => {
  if (phase === "bidding") {
    // Simple bidding tip: Count trump cards and high cards
    let trumpPotential = 0;
    hand.forEach(card => {
      if (isTrumpCard(card, trump)) trumpPotential += getRankValue(card, trump); // Use rank value for better assessment
      else if (card.rank === "A") trumpPotential += 2; // Off-suit Aces are good
    });
    if (trumpPotential > 30) return "Strong hand for this trump! Consider ordering it up or calling it.";
    if (trumpPotential > 20) return "Decent potential for this trump. Could be worth a shot.";
    return "Weak potential for this trump. Probably best to pass.";
  }

  // Playing phase tips
  if (!trump) return "Trump not set yet."; // Should not happen in playing phase

  const validPlays = hand.filter(c => isValidPlay(c, hand, trick, trump));
  if (validPlays.length === 0) return "No valid plays available.";

  const bestPlay = getBestPlay(hand, trick, trump); // Use our new logic

  if (trick.length === 0) {
    return `Lead with ${bestPlay.rank} of ${bestPlay.suit}. Good leads often include Bowers, high trump, or an off-suit Ace.`;
  }

  const currentWinningCard = findHighestPlayedCard(trick, trump);
  const leadCard = trick[0];
  const effectiveLeadSuit = getEffectiveSuit(leadCard, trump);

  if (isValidPlay(bestPlay, hand, trick, trump)) {
    const bestPlayEffSuit = getEffectiveSuit(bestPlay, trump);
    const bestPlayRankVal = getRankValue(bestPlay, trump);

    if (currentWinningCard && canBeatCard(bestPlay, currentWinningCard, trump, effectiveLeadSuit)) {
      if (bestPlayEffSuit === trump && getEffectiveSuit(currentWinningCard, trump) !== trump) {
        return `Trump with ${bestPlay.rank} of ${bestPlay.suit} to win.`;
      }
      return `Play ${bestPlay.rank} of ${bestPlay.suit} to win the trick.`;
    } else if (bestPlayEffSuit === effectiveLeadSuit) {
      return `You must follow suit. Play your ${bestPlay.rank} of ${bestPlay.suit}.`;
    } else {
      return `You can't win or follow suit. Consider playing ${bestPlay.rank} of ${bestPlay.suit}.`;
    }
  }
  return "Consider your options carefully."; // Generic fallback
};


export const getGameRules = (): string => {
  return `
Euchre is a card game played with 4 players in 2 teams of 2 players each.

Basic Concepts:
- The game uses a special 24-card deck (9, 10, Jack, Queen, King, and Ace of each suit).
- Players sit across from their teammate.
- Each hand consists of dealing 5 cards to each player.
- One suit is chosen as "trump" for each hand, making its cards more powerful.

Card Ranks (Highest to Lowest):
1. Right Bower (Jack of trump suit).
2. Left Bower (Jack of the other suit of the same color as trump).
3. Ace, King, Queen, 10, 9 of the trump suit.
4. Ace, King, Queen, Jack, 10, 9 of non-trump suits (off-suits).

Gameplay:
1. Dealing: 5 cards to each player. The top card of the remaining deck may be turned up.
2. Bidding (Ordering/Calling Trump): Players decide if the up-card's suit (or another suit) becomes trump.
   - "Ordering up": Telling the dealer to pick up the up-card.
   - "Going alone": Playing without one's partner for potential bonus points.
3. Playing Tricks:
   - The player to the dealer's left leads the first trick.
   - Players must follow the suit led if possible. The Left Bower is considered part of the trump suit.
   - If unable to follow suit, a player can play any card (trump or off-suit).
   - The highest trump card played wins the trick. If no trump is played, the highest card of the suit led wins.
   - The winner of a trick leads the next trick.

Scoring:
- 5 tricks per hand.
- Calling team wins 3 or 4 tricks: 1 point.
- Calling team wins all 5 tricks (march): 2 points.
- Calling team "goes alone" and wins 3 or 4 tricks: 1 point (some rules say 2).
- Calling team "goes alone" and wins all 5 tricks: 4 points.
- If calling team fails to get 3 tricks (euchred): Opponents get 2 points.
- First team to a set score (e.g., 10 points) wins.
  `;
};
