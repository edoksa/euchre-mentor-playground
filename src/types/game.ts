
export type Suit = "hearts" | "diamonds" | "spades" | "clubs";
export type Rank = "9" | "10" | "J" | "Q" | "K" | "A";
export type Card = {
  suit: Suit;
  rank: Rank;
  id: string;
};

export type Player = {
  id: string;
  name: string;
  hand: Card[];
  isCPU: boolean;
};

export type GamePhase = "pre-game" | "dealing" | "bidding" | "playing";

export type GameState = {
  deck: Card[];
  players: Player[];
  currentPlayer: number;
  dealer: number;
  trump?: Suit;
  trumpSelector: number;
  trickCards: Card[];
  scores: [number, number];
  phase: GamePhase;
  learningMode: boolean;
  passCount: number;
  shouldClearTrick?: boolean;
};
