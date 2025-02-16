
import { GameState } from "@/types/game";
import { initialState } from "@/reducers/gameReducer";

export const STORAGE_KEY = "euchre_game_state";

export const loadGameState = (): GameState => {
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

export const saveGameState = (state: GameState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving game state:", error);
  }
};
