import React, { createContext, useContext, useReducer, useEffect } from "react";
import { GameState, Card, Suit, Player } from "@/types/game";
import { createDeck, dealCards, isValidPlay, determineWinner } from "@/utils/gameUtils";
import { toast } from "sonner";

type GameAction =
  | { type: "START_GAME" }
  | { type: "DEAL" }
  | { type: "PLAY_CARD"; card: Card }
  | { type: "SET_TRUMP"; suit: Suit }
  | { type: "PASS" }
  | { type: "TOGGLE_LEARNING_MODE" }
  | { type: "CPU_PLAY" }
  | { type: "CLEAR_TRICK" };

const initialState: GameState = {
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
  scores: [0, 0],
  phase: "pre-game",
  learningMode: false,
  passCount: 0,
  trumpSelector: 0,
  shouldClearTrick: false,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  if (!state || !Array.isArray(state.players)) {
    console.error("Invalid state detected, resetting to initial state");
    return initialState;
  }

  switch (action.type) {
    case "START_GAME":
      return {
        ...initialState,
        phase: "dealing",
        dealer: Math.floor(Math.random() * 4),
      };
      
    case "DEAL": {
      const deck = createDeck();
      const dealResult = dealCards(deck);
      
      if (!dealResult) {
        toast.error("Failed to deal cards");
        return {
          ...initialState,
          phase: "pre-game"
        };
      }

      const { hands, remainingDeck } = dealResult;
      
      if (!hands || hands.length !== 4 || hands.some(hand => hand.length !== 5)) {
        toast.error("Invalid deal detected");
        return {
          ...initialState,
          phase: "pre-game"
        };
      }

      return {
        ...state,
        deck: remainingDeck,
        players: state.players.map((p, i) => ({ ...p, hand: hands[i] })),
        currentPlayer: (state.dealer + 1) % 4,
        phase: "bidding",
        passCount: 0,
      };
    }
    case "PASS": {
      const newPassCount = state.passCount + 1;
      const nextPlayer = (state.currentPlayer + 1) % 4;
      
      if (newPassCount === 3 && nextPlayer === state.dealer) {
        toast.info("Dealer must select trump!");
        return {
          ...state,
          currentPlayer: nextPlayer,
          passCount: newPassCount,
        };
      }

      return {
        ...state,
        currentPlayer: nextPlayer,
        passCount: newPassCount,
      };
    }
    case "SET_TRUMP": {
      return {
        ...state,
        trump: action.suit,
        trumpSelector: state.currentPlayer,
        phase: "playing",
        currentPlayer: (state.dealer + 1) % 4,
      };
    }
    case "PLAY_CARD": {
      if (!state.trump) return state;

      const currentPlayer = state.players[state.currentPlayer];
      if (!currentPlayer || !currentPlayer.hand) return state;

      // Prevent playing if we already have 4 cards
      if (state.trickCards.length >= 4) return state;

      const newHand = currentPlayer.hand.filter((c) => c.id !== action.card.id);
      const newTrickCards = [...state.trickCards, action.card];
      
      let newState = {
        ...state,
        players: state.players.map((p) =>
          p.id === currentPlayer.id ? { ...p, hand: newHand } : p
        ),
        trickCards: newTrickCards,
        currentPlayer: (state.currentPlayer + 1) % 4,
      };

      if (newTrickCards.length === 4) {
        const winner = determineWinner(newTrickCards, state.trump);
        const team = winner % 2;
        const newScores: [number, number] = [state.scores[0], state.scores[1]];
        newScores[team]++;

        newState = {
          ...newState,
          scores: newScores,
          currentPlayer: winner,
          shouldClearTrick: true,
        };

        toast(`Team ${team + 1} wins the trick!`, {
          duration: 2000,
        });
      }

      return newState;
    }
    case "CPU_PLAY": {
      const cpu = state.players[state.currentPlayer];
      if (!cpu || !cpu.isCPU || !cpu.hand) return state;

      if (state.phase === "bidding") {
        const shouldPass = Math.random() > 0.3;
        if (shouldPass && state.currentPlayer !== state.dealer) {
          return gameReducer(state, { type: "PASS" });
        } else {
          const suits: Suit[] = ["hearts", "diamonds", "spades", "clubs"];
          const randomSuit = suits[Math.floor(Math.random() * suits.length)];
          return gameReducer(state, { type: "SET_TRUMP", suit: randomSuit });
        }
      }

      if (!state.trump) return state;
      
      // Don't allow CPU to play if we need to clear the trick first
      if (state.shouldClearTrick) return state;
      
      const playableCards = cpu.hand.filter((c) =>
        isValidPlay(c, cpu.hand, state.trickCards, state.trump)
      );
      
      if (playableCards.length === 0) return state;
      
      const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
      return gameReducer(state, { type: "PLAY_CARD", card: cardToPlay });
    }
    case "TOGGLE_LEARNING_MODE":
      return {
        ...state,
        learningMode: !state.learningMode,
      };
    case "CLEAR_TRICK": {
      return {
        ...state,
        trickCards: [],
        shouldClearTrick: false,
      };
    }
    default:
      return state;
  }
};

const STORAGE_KEY = "euchre_game_state";

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadInitialState = (): GameState => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (!savedState) return initialState;

      const parsedState = JSON.parse(savedState);
      
      if (!parsedState || !Array.isArray(parsedState.players)) {
        console.error("Invalid saved state, using initial state");
        localStorage.removeItem(STORAGE_KEY);
        return initialState;
      }

      return parsedState;
    } catch (error) {
      console.error("Error loading game state:", error);
      localStorage.removeItem(STORAGE_KEY);
      return initialState;
    }
  };

  const [state, dispatch] = useReducer(gameReducer, loadInitialState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  }, [state]);

  useEffect(() => {
    if (state.shouldClearTrick) {
      const timer = setTimeout(() => {
        dispatch({ type: "CLEAR_TRICK" });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.shouldClearTrick]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
