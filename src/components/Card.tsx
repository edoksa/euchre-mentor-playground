
import React from "react";
import { Card as CardType } from "@/types/game";
import { cn } from "@/lib/utils";

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  isPlayable = true,
  isSelected = false,
  onClick,
  className,
}) => {
  const { suit, rank } = card;

  const suitColor = suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-black";
  const suitSymbol = {
    hearts: "♥",
    diamonds: "♦",
    spades: "♠",
    clubs: "♣",
  }[suit];

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      className={cn(
        "relative w-24 h-36 bg-white rounded-lg shadow-md transition-all duration-200",
        "hover:shadow-lg cursor-pointer select-none",
        isPlayable && "hover:animate-card-hover",
        isSelected && "-translate-y-4",
        !isPlayable && "opacity-70 cursor-not-allowed",
        "animate-card-deal",
        className
      )}
    >
      <div className={cn("absolute top-2 left-2 font-bold text-lg", suitColor)}>
        {rank}
      </div>
      <div className={cn("absolute bottom-2 right-2 font-bold text-lg", suitColor)}>
        {rank}
      </div>
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "text-4xl font-bold",
          suitColor
        )}
      >
        {suitSymbol}
      </div>
    </div>
  );
};

export default Card;
