import { GameState, Card, Suit, Player } from "@/types/game";
import { createDeck, dealCards, isValidPlay, determineWinner, getBestPlay, getLeftBowerSuit, isTrumpCard, getEffectiveSuit } from "@/utils/gameUtils";
import { toast } from "sonner";

export type GameAction =
  | { type: "START_GAME" }
  | { type: "DEAL" }
  | { type: "PLAY_CARD"; card: Card }
  | { type: "SET_TRUMP"; suit: Suit; goingAlone?: boolean }
  | { type: "PASS" }
  | { type: "TOGGLE_LEARNING_MODE" }
  | { type: "CPU_PLAY" }
  | { type: "CLEAR_TRICK" };

export const initialState: GameState = {
  deck: [],
  players: [
    { id: "p1", name: "You", hand: [], isCPU: false },
    { id: "p2", name: "CPU 1", hand: [], isCPU: true },
    { id: "p3", name: "CPU 2", hand: [], isCPU: true },
    { id: "p4", name: "CPU 3", hand: [], isCPU: true },
  ],
  currentPlayer: 0,
  dealer: 0,
  trickCards: [],
  scores: [0, 0], // Team 1 (players 0 & 2), Team 2 (players 1 & 3)
  phase: "pre-game",
  learningMode: false,
  passCount: 0,
  trumpSelector: 0, // Player index who called trump
  goingAlone: false,
  trump: undefined, // Will be set when trump is called
  shouldClearTrick: false, // Flag to indicate if the trick should be cleared
};

// --- Helper Functions for Reducer Logic ---

/**
 * Handles the START_GAME action.
 * Resets the game state to initial values, sets the phase to dealing,
 * and randomly assigns a dealer.
 */
const handleStartGame = (state: GameState): GameState => {
  return {
    ...initialState,
    phase: "dealing",
    dealer: Math.floor(Math.random() * 4),
    learningMode: state.learningMode, // Preserve learning mode setting
  };
};

/**
 * Handles the TOGGLE_LEARNING_MODE action.
 * Toggles the learningMode flag in the state.
 */
const handleToggleLearningMode = (state: GameState): GameState => {
  return {
    ...state,
    learningMode: !state.learningMode,
  };
};

/**
 * Handles the DEAL action.
 * Creates a new deck, deals cards to players, and sets up the bidding phase.
 */
const handleDeal = (state: GameState): GameState => {
  const deck = createDeck();
  const dealResult = dealCards(deck);

  if (!dealResult) {
    toast.error("Failed to deal cards. Resetting game.");
    return { ...initialState, phase: "pre-game" }; // Reset to a safe state
  }

  const { hands, remainingDeck } = dealResult;

  if (!hands || hands.length !== 4 || hands.some(hand => hand.length !== 5)) {
    toast.error("Invalid deal detected. Resetting game.");
    return { ...initialState, phase: "pre-game" }; // Reset to a safe state
  }

  return {
    ...state,
    deck: remainingDeck,
    players: state.players.map((p, i) => ({ ...p, hand: hands[i], sittingOut: false })), // Reset sittingOut status
    currentPlayer: (state.dealer + 1) % 4, // Player to the left of the dealer starts bidding
    phase: "bidding",
    passCount: 0,
    trickCards: [], // Clear any previous trick cards
    trump: undefined, // Reset trump
    goingAlone: false, // Reset going alone
    shouldClearTrick: false,
  };
};

/**
 * Handles the PASS action.
 * Increments the pass count and moves to the next player.
 * If three players pass, the dealer is forced to choose trump (handled in CPU_PLAY or UI).
 */
const handlePass = (state: GameState): GameState => {
  const newPassCount = state.passCount + 1;
  const nextPlayer = (state.currentPlayer + 1) % 4;

  // If it's the dealer's turn after 3 passes, they must call trump.
  // This specific logic is handled in CPU_PLAY for CPU dealer or UI for human dealer.
  if (newPassCount === 4) { // Technically 3 passes mean the dealer must choose. If dealer passes it's a misdeal (or house rules)
      // This state indicates a misdeal or forces dealer action.
      // For now, let dealer handle it. If CPU, handleCpuPlay will manage.
      // If human, UI should enforce.
      toast.info("Dealer must select trump or pass for a misdeal (house rule dependent).");
  }


  return {
    ...state,
    currentPlayer: nextPlayer,
    passCount: newPassCount,
  };
};

/**
 * Handles the SET_TRUMP action.
 * Sets the trump suit, the player who called trump, and transitions to the playing phase.
 * Handles "going alone" logic.
 */
const handleSetTrump = (state: GameState, action: Extract<GameAction, { type: "SET_TRUMP" }>): GameState => {
  const goingAlone = action.goingAlone || false;
  const trumpCallerIndex = state.currentPlayer;
  let partnerIndex: number | null = null;

  if (goingAlone) {
    const playerName = state.players[trumpCallerIndex].name;
    toast.info(`${playerName} is going alone!`, { duration: 2000 });
    partnerIndex = (trumpCallerIndex + 2) % 4;
  }

  return {
    ...state,
    trump: action.suit,
    trumpSelector: trumpCallerIndex,
    phase: "playing",
    currentPlayer: (state.dealer + 1) % 4, // Player to the left of the dealer starts playing
    goingAlone,
    passCount: 0, // Reset pass count for the playing phase
    players: state.players.map((p, i) => ({
      ...p,
      // Mark the partner as sitting out if someone is going alone
      sittingOut: goingAlone && i === partnerIndex,
    })),
  };
};

/**
 * Handles the PLAY_CARD action.
 * Updates the player's hand, adds the card to the trick, determines the trick winner if complete,
 * and advances to the next player or clears the trick.
 */
const handlePlayCard = (state: GameState, action: Extract<GameAction, { type: "PLAY_CARD" }>): GameState => {
  if (!state.trump) {
    toast.error("Trump is not set, cannot play card.");
    return state; // Or handle error appropriately
  }

  const player = state.players[state.currentPlayer];
  if (!player || player.sittingOut) {
    // This should ideally not happen if currentPlayer logic is correct
    console.error("Current player is sitting out or invalid.");
    return state;
  }

  // Validate if the played card is in the player's hand
  if (!player.hand.find(c => c.id === action.card.id)) {
    toast.error("Invalid card played.");
    console.error("Played card not in hand:", action.card, player.hand);
    return state;
  }
  
  // Validate if the play is valid according to game rules
  if (!isValidPlay(action.card, player.hand, state.trickCards, state.trump)) {
    toast.error("Invalid play - you must follow suit if possible!");
    return state;
  }

  const newHand = player.hand.filter((c) => c.id !== action.card.id);
  const newTrickCards = [...state.trickCards, action.card];

  let newState: GameState = {
    ...state,
    players: state.players.map((p, i) =>
      i === state.currentPlayer ? { ...p, hand: newHand } : p
    ),
    trickCards: newTrickCards,
    shouldClearTrick: false, // Reset flag, will be set if trick is complete
  };

  const expectedTrickSize = newState.goingAlone ? 3 : 4;

  if (newTrickCards.length === expectedTrickSize) {
    // Determine trick winner
    // The 'leadPlayerOffset' is the number of players from the current player back to the leader of the trick.
    // For a 4-player game (not going alone), if currentPlayer is 2, and trick has 4 cards, leader was player 3 ( (2 - (4-1) + 4) % 4 )
    // For a 3-player game (going alone), if currentPlayer is 2, and trick has 3 cards, leader was player 0 ( (2 - (3-1) + 4) % 4 )
    const leadPlayerOffset = newTrickCards.length -1;
    const leadPlayerIndex = (state.currentPlayer - leadPlayerOffset + 4) % 4;
    
    const winningCardIndexInTrick = determineWinner(newTrickCards, newState.trump!); // The index of the winning card within newTrickCards
    const trickWinnerPlayerIndex = (leadPlayerIndex + winningCardIndexInTrick) % 4; // Actual player index in the game

    // Update scores
    const newScores: [number, number] = [...newState.scores];
    newScores[trickWinnerPlayerIndex % 2]++; // 0 or 1 for team index

    toast.success(`${newState.players[trickWinnerPlayerIndex].name} wins the trick!`, {
      duration: 1500,
    });

    newState = {
      ...newState,
      scores: newScores,
      currentPlayer: trickWinnerPlayerIndex, // Winner of the trick leads the next trick
      shouldClearTrick: true, // Signal that the trick should be cleared
    };
  } else {
    // Move to the next active player
    let nextPlayer = (newState.currentPlayer + 1) % 4;
    while (newState.players[nextPlayer].sittingOut) {
      nextPlayer = (nextPlayer + 1) % 4;
    }
    newState.currentPlayer = nextPlayer;
  }

  return newState;
};


/**
 * Handles the CPU_PLAY action.
 * Contains logic for CPU bidding and playing.
 */
const handleCpuPlay = (state: GameState): GameState => {
  const cpu = state.players[state.currentPlayer];
  // Ensure it's a CPU player, it's their turn, and they are not sitting out
  if (!cpu || !cpu.isCPU || cpu.sittingOut || state.phase === "pre-game" || state.shouldClearTrick) {
    return state;
  }

  if (state.phase === "bidding") {
    // **Enhanced CPU Bidding Logic**
    const { hand } = cpu;
    const suits: Suit[] = ["hearts", "diamonds", "spades", "clubs"];
    let bestSuit: Suit | null = null;
    let maxScore = -1; // Initialize with a value that any hand can beat
    let shouldGoAlone = false;

    for (const suit of suits) {
      let currentScore = 0;
      const cardsOfSuit = hand.filter(c => getEffectiveSuit(c, suit) === suit); // Consider left bower as trump for counting
      const highCards = cardsOfSuit.filter(c => ["A", "K", "Q", "J"].includes(c.rank));
      
      currentScore += cardsOfSuit.length * 2; // More weight for cards of the suit
      currentScore += highCards.length * 3; // More weight for high cards

      // Check for Right Bower (Jack of the suit)
      if (hand.some(c => c.rank === "J" && c.suit === suit)) {
        currentScore += 4; // Strong bonus for Right Bower
      }
      // Check for Left Bower (Jack of same color suit)
      const leftBowerSuit = getLeftBowerSuit(suit);
      if (hand.some(c => c.rank === "J" && c.suit === leftBowerSuit)) {
        currentScore += 3; // Good bonus for Left Bower
      }
      
      // Bonus for Aces not in the potential trump suit (potential to take off-suit tricks)
      currentScore += hand.filter(c => c.rank === "A" && c.suit !== suit).length;

      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestSuit = suit;
      }
    }

    // Define thresholds for bidding decisions (these can be tuned)
    const callTrumpThreshold = 10; 
    const goAloneThreshold = 18; 

    // Decision: Call trump if score is high enough
    if (bestSuit && maxScore >= callTrumpThreshold) {
      if (maxScore >= goAloneThreshold) {
        shouldGoAlone = true;
      }
      // Dispatch SET_TRUMP action
      return gameReducer(state, { type: "SET_TRUMP", suit: bestSuit, goingAlone: shouldGoAlone });
    }

    // Decision: If dealer and everyone else passed, must call trump
    if (state.currentPlayer === state.dealer && state.passCount >= 3) { // >=3 to be safe
      // If no suit was deemed "good" enough by threshold, pick the one with highest score or a default
      if (!bestSuit) { // Should always have a bestSuit unless hand is empty (error)
         // Fallback: Pick the suit with the most cards, or just the first suit if all else fails
        let mostCards = 0;
        for (const s of suits) {
            const count = hand.filter(c => c.suit === s).length;
            if (count > mostCards) {
                mostCards = count;
                bestSuit = s;
            }
        }
        if (!bestSuit) bestSuit = suits[0]; // Absolute fallback
      }
      toast.info(`${cpu.name} (Dealer) is forced to call trump.`);
      return gameReducer(state, { type: "SET_TRUMP", suit: bestSuit!, goingAlone: false }); // Typically don't go alone if forced
    }

    // Default: Pass if no strong hand or not forced
    return gameReducer(state, { type: "PASS" });

  } else if (state.phase === "playing") {
    // **Improved CPU Playing Logic**
    if (!state.trump) return state; // Should not happen in playing phase

    // Use getBestPlay utility function for CPU card selection
    const cardToPlay = getBestPlay(cpu.hand, state.trickCards, state.trump, state.players.map(p => p.hand.length));
    
    if (cardToPlay) {
      // Dispatch PLAY_CARD action with the chosen card
      return gameReducer(state, { type: "PLAY_CARD", card: cardToPlay });
    } else {
      // This case should ideally not be reached if CPU always has a valid card to play
      console.error("CPU has no valid card to play, this should not happen.", cpu.hand, state.trickCards, state.trump);
      // As a fallback, if no card is returned by getBestPlay (e.g., an issue with logic or empty hand),
      // try to play the first valid card.
      const playableCards = cpu.hand.filter(c => isValidPlay(c, cpu.hand, state.trickCards, state.trump!));
      if (playableCards.length > 0) {
        return gameReducer(state, { type: "PLAY_CARD", card: playableCards[0] });
      }
      // If still no card, something is wrong, return current state to avoid crash
      return state;
    }
  }
  return state; // Should not be reached
};

/**
 * Handles the CLEAR_TRICK action.
 * Clears the trick cards. If all hands are empty, transitions to the dealing phase for a new hand.
 * Otherwise, the current player (winner of the last trick) leads the next trick.
 */
const handleClearTrick = (state: GameState): GameState => {
  const allHandsEmpty = state.players.every(
    (p) => p.sittingOut || p.hand.length === 0
  );

  if (allHandsEmpty) {
    // Check for march or euchre if a team took all 5 tricks
    // This logic is simplified here; detailed scoring for march/euchre would be based on who called trump
    // and how many tricks they won. For now, scores are incremented per trick.
    // A full hand scoring would assess points for the hand (1, 2, or 4 points).
    // This simple Toast is just for indication.
    toast.info("Hand complete! Dealing new cards...", { duration: 2000 });
    
    // TODO: Implement full end-of-hand scoring (1 point, 2 for march/going alone success, 2 for euchre)
    // This would involve checking state.trumpSelector and state.scores for the tricks taken by each team.
    
    return {
      ...state,
      phase: "dealing", // Transition to deal for the next hand
      trickCards: [],
      shouldClearTrick: false,
      dealer: (state.dealer + 1) % 4, // Next player becomes dealer
      currentPlayer: (state.dealer + 1 + 1) % 4, // Player left of new dealer starts bidding
      // Scores are already updated per trick. Consider hand scoring here.
      // Reset passCount, trump, goingAlone for the new hand (done in handleDeal)
    };
  }

  // If hand is not over, clear trick cards and winner of last trick leads
  return {
    ...state,
    trickCards: [],
    shouldClearTrick: false,
    // currentPlayer is already set to the winner of the trick by handlePlayCard
  };
};


// --- Main Reducer ---

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  // Basic state validation
  if (!state || !Array.isArray(state.players) || state.players.length !== 4) {
    console.error("Invalid state detected, resetting to initial state.", state);
    return initialState; // Return a valid initial state if current state is corrupted
  }

  // Log actions if learning mode is on or for debugging
  if (state.learningMode) {
    console.log("Action:", action.type, action);
    console.log("Current State:", state);
  }

  let newState: GameState;

  switch (action.type) {
    case "START_GAME":
      newState = handleStartGame(state);
      break;
    case "TOGGLE_LEARNING_MODE":
      newState = handleToggleLearningMode(state);
      break;
    case "DEAL":
      newState = handleDeal(state);
      // After dealing, if the first player is CPU, trigger CPU_PLAY for bidding
      if (newState.phase === "bidding" && newState.players[newState.currentPlayer].isCPU) {
        return gameReducer(newState, { type: "CPU_PLAY" });
      }
      break;
    case "PASS":
      newState = handlePass(state);
      // After a pass, if the next player is CPU, trigger CPU_PLAY
      if (newState.phase === "bidding" && newState.players[newState.currentPlayer].isCPU && newState.passCount < 4) {
         // Dealer condition (passCount === 3 and current is dealer) is handled in CPU_PLAY
        return gameReducer(newState, { type: "CPU_PLAY" });
      }
      break;
    case "SET_TRUMP":
      newState = handleSetTrump(state, action);
      // After trump is set, if the first player to play is CPU, trigger CPU_PLAY
      if (newState.phase === "playing" && newState.players[newState.currentPlayer].isCPU && !newState.players[newState.currentPlayer].sittingOut) {
        return gameReducer(newState, { type: "CPU_PLAY" });
      }
      break;
    case "PLAY_CARD":
      newState = handlePlayCard(state, action);
      // After a card is played:
      if (newState.shouldClearTrick) {
        // If trick is complete, immediately dispatch CLEAR_TRICK
        // The CLEAR_TRICK handler will then determine if a CPU needs to play next (if hand continues)
        return gameReducer(newState, { type: "CLEAR_TRICK" });
      } else if (newState.phase === "playing" && newState.players[newState.currentPlayer].isCPU && !newState.players[newState.currentPlayer].sittingOut) {
        // If trick is not complete and next player is CPU, trigger CPU_PLAY
        return gameReducer(newState, { type: "CPU_PLAY" });
      }
      break;
    case "CPU_PLAY": // This action is now mostly for triggering CPU decisions
      newState = handleCpuPlay(state); // handleCpuPlay will dispatch other actions like PASS, SET_TRUMP, PLAY_CARD
      break;
    case "CLEAR_TRICK":
      newState = handleClearTrick(state);
      // After clearing a trick, if the hand continues and the current player (trick winner) is CPU, trigger CPU_PLAY
      if (newState.phase === "playing" && newState.players[newState.currentPlayer].isCPU && !newState.players[newState.currentPlayer].sittingOut) {
         return gameReducer(newState, { type: "CPU_PLAY" });
      }
      // If all hands are empty, and phase is 'dealing', and first player is CPU, trigger CPU_PLAY for bidding
      else if (newState.phase === "dealing") { // Switched to dealing means hand is over
          const tempDealState = gameReducer(newState, {type: "DEAL"}); // Perform the deal
          if (tempDealState.phase === "bidding" && tempDealState.players[tempDealState.currentPlayer].isCPU) {
              return gameReducer(tempDealState, {type: "CPU_PLAY"});
          }
          return tempDealState;
      }
      break;
    default:
      // This is a way to handle unknown actions, though TypeScript should catch them.
      // It's good practice to assert exhaustiveness.
      const _exhaustiveCheck: never = action;
      console.warn("Unhandled action type:", _exhaustiveCheck);
      newState = state;
  }
  
  // Log new state if learning mode is on or for debugging
  if (state.learningMode) {
    console.log("New State:", newState);
  }

  return newState;
};
