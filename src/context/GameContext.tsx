
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { GameState } from "@/types/game";
import { gameReducer, GameAction, initialState } from "@/reducers/gameReducer";
import { loadGameState, saveGameState } from "@/utils/storage";

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, loadGameState());

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  useEffect(() => {
    if (state.shouldClearTrick) {
      const timer = setTimeout(() => {
        dispatch({ type: "CLEAR_TRICK" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.shouldClearTrick]);

  useEffect(() => {
    if (state.phase !== "pre-game" && state.players[state.currentPlayer]?.isCPU && !state.shouldClearTrick) {
      const timer = setTimeout(() => {
        dispatch({ type: "CPU_PLAY" });
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [state.currentPlayer, state.phase, state.shouldClearTrick]);

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
