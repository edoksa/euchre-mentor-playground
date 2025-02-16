
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

  if (!card.faceUp) {
    return (
      <div
        className={cn(
          "relative rounded-lg shadow-md transition-all duration-300",
          "bg-card-back",
          isPlayable && "hover:shadow-lg cursor-pointer hover:-translate-y-2",
          isSelected && "-translate-y-4",
          !isPlayable && "opacity-90 cursor-not-allowed",
          isMobile ? "w-16 h-24" : "w-24 h-36",
          className
        )}
      >
        {/* Card Back Pattern */}
        <div className="absolute inset-[3px] rounded-md border-2 border-white/20">
          <div className="absolute inset-2 rounded border border-white/10 bg-gradient-to-br from-blue-900/50 to-blue-800/50">
            {/* Diamond Pattern */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 gap-1 p-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-sm"
                  style={{
                    transform: `rotate(${45}deg)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      className={cn(
        "relative bg-white rounded-lg shadow-md transition-all duration-300",
        "hover:shadow-lg select-none",
        isPlayable && "hover:animate-card-hover",
        isSelected && "-translate-y-4",
        !isPlayable && "opacity-90",
        isPlayable ? "cursor-pointer hover:-translate-y-2" : "cursor-not-allowed",
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
