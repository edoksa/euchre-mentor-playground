
import React from "react";
import { Card as CardType } from "@/types/game";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
        "relative bg-white rounded-lg shadow-md transition-all duration-200",
        "hover:shadow-lg cursor-pointer select-none",
        isPlayable && "hover:animate-card-hover",
        isSelected && "-translate-y-4",
        !isPlayable && "opacity-70 cursor-not-allowed",
        "animate-card-deal",
        isMobile ? "w-16 h-24" : "w-24 h-36",
        className
      )}
    >
      <div className={cn("absolute top-1 left-1 font-bold", suitColor, isMobile ? "text-sm" : "text-lg")}>
        {rank}
      </div>
      <div className={cn("absolute bottom-1 right-1 font-bold", suitColor, isMobile ? "text-sm" : "text-lg")}>
        {rank}
      </div>
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "font-bold",
          suitColor,
          isMobile ? "text-2xl" : "text-4xl"
        )}
      >
        {suitSymbol}
      </div>
    </div>
  );
};

export default Card;
