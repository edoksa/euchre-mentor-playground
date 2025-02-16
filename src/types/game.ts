
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

export type GameState = {
  deck: Card[];
  players: Player[];
  currentPlayer: number;
  trump?: Suit;
  trickCards: Card[];
  scores: [number, number]; // Team scores [we, they]
  phase: "dealing" | "bidding" | "playing";
  learningMode: boolean;
};
