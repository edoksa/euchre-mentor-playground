import React from 'react';
import Card from '@/components/Card'; // Assuming Card component is in src/components/Card.tsx
import type { Card as CardType } from '@/types/game';

interface PlayerHandProps {
  hand: CardType[];
  isCurrentPlayer: boolean;
  onCardClick: (card: CardType) => void;
  phase: string;
  playerId: string; // ID of the player this hand belongs to
  dealerId: string;
  isHumanPlayer: boolean; // True if this is the human user's hand
  isMobile: boolean; // For responsive styling if needed
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  isCurrentPlayer,
  onCardClick,
  phase,
  playerId,
  dealerId,
  isHumanPlayer,
  isMobile, // Use this prop if specific mobile styling adjustments are needed within this component
}) => {
  const canPlay = isHumanPlayer && isCurrentPlayer && phase === 'playing';

  return (
    <div className={`fixed bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 ${isHumanPlayer ? 'z-20' : 'z-0'}`}>
      <div className="flex items-center gap-2 justify-center mb-2">
        {isHumanPlayer && isCurrentPlayer && phase === 'playing' && (
          <div className="bg-white/90 px-4 py-1 rounded-md shadow-lg text-base font-bold animate-bounce">
            It's Your Turn!
          </div>
        )}
        {isHumanPlayer && <p className="text-white text-xs md:text-base">Your Hand</p>}
        {!isHumanPlayer && <p className="text-white text-xs md:text-base">{`Player ${playerId}`/* Or player name */}</p>}
        {playerId === dealerId && (
          <span className="bg-yellow-500 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded">
            Dealer
          </span>
        )}
      </div>
      <div className="flex gap-1 md:gap-2 justify-center">
        {isHumanPlayer ? (
          hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              isPlayable={canPlay}
              onClick={canPlay ? () => onCardClick(card) : undefined}
              // Add any specific animation or styling for human player's cards
            />
          ))
        ) : (
          // Render opponent hands (e.g., as card backs or simplified view)
          // For now, showing card backs as per original EuchreGame.tsx for opponents
          // Note: The original EuchreGame.tsx renders opponent hands at the top of the screen.
          // This PlayerHand component is designed for the bottom-screen human player.
          // If this component were to be used for opponents at the top, its positioning CSS would need to be managed by the parent.
          // For this task, we are focusing on extracting the human player's hand.
          // The following is more of a placeholder if this component were to be adapted for opponents.
          hand.map((_card, cardIndex) => (
            <div
              key={`${playerId}-card-${cardIndex}`}
              className={`w-8 h-12 md:w-16 md:h-24 bg-card-back rounded-lg shadow-md ${isMobile ? 'w-10 h-16' : ''}`}
              // This styling is for card backs, actual cards would use the <Card> component
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PlayerHand;
