
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
  isCP