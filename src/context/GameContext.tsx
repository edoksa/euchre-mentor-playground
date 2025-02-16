
import React, { createContext, useContext, useReducer } from "react";
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
  | { type: "CPU_PLAY" };

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
  scores: [0, 0] as [number, number],
  phase: "pre-game",
  learningMode: false,
  passCount: 0,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "START_GAME":
      return {
        ...state,
        phase: "dealing",
        dealer: Math.floor(Math.random() * 4),
      };
    case "DEAL": {
      const deck = createDeck();
      const { hands, remainingDeck } = dealCards(deck);
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
      
      // If everyone has passed except dealer
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
        phase: "playing",
        currentPlayer: (state.dealer + 1) % 4, // First player after dealer starts
      };
    }
    case "PLAY_CARD": {
      if (!state.trump) return state;

      const currentPlayer = state.players[state.currentPlayer];
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
        const newScores: [number, number] = [...state.scores] as [number, number];
        newScores[team]++;
        
        newState = {
          ...newState,
          trickCards: [],
          currentPlayer: winner,
          scores: newScores,
        };

        toast(`Team ${team + 1} wins the trick!`);
      }

      return newState;
    }
    case "TOGGLE_LEARNING_MODE":
      return {
        ...state,
        learningMode: !state.learningMode,
      };
    case "CPU_PLAY": {
      const cpu = state.players[state.currentPlayer];
      if (!cpu.isCPU) return state;

      if (state.phase === "bidding") {
        // Simple CPU bidding logic
        const shouldPass = Math.random() > 0.3; // 30% chance to pick trump
        if (shouldPass && state.currentPlayer !== state.dealer) {
          return gameReducer(state, { type: "PASS" });
        } else {
          const suits: Suit[] = ["hearts", "diamonds", "spades", "clubs"];
          const randomSuit = suits[Math.floor(Math.random() * suits.length)];
          return gameReducer(state, { type: "SET_TRUMP", suit: randomSuit });
        }
      }

      if (!state.trump) return state;
      
      const playableCards = cpu.hand.filter((c) =>
        isValidPlay(c, cpu.hand, state.trickCards, state.trump)
      );
      const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];

      return gameReducer(state, { type: "PLAY_CARD", card: cardToPlay });
    }
    default:
      return state;
  }
};

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

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
