import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { Suit } from '@/types/game';

interface BiddingPanelProps {
  phase: string;
  currentPlayerId: string; // Assuming player IDs are strings, adjust if necessary
  dealerId: string;
  onSetTrump: (suit: Suit, goingAlone: boolean) => void;
  onPass: () => void;
  isMobile: boolean;
  isHumanPlayerTurn: boolean; // Explicitly pass if it's the human's turn to bid
}

const BiddingPanel: React.FC<BiddingPanelProps> = ({
  phase,
  currentPlayerId,
  dealerId,
  onSetTrump,
  onPass,
  isMobile,
  isHumanPlayerTurn,
}) => {
  const [goingAlone, setGoingAlone] = useState(false);

  if (phase !== 'bidding' || !isHumanPlayerTurn) {
    return null;
  }

  const handleSuitSelect = (suit: Suit) => {
    onSetTrump(suit, goingAlone);
  };

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 p-3 md:p-4 rounded-lg shadow-lg animate-fade-in z-30">
      <div className="text-base md:text-lg font-bold mb-2 md:mb-4">
        <p>Select Trump Suit</p>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="goAlone"
          checked={goingAlone}
          onCheckedChange={(checked: CheckedState) => {
            if (typeof checked === 'boolean') {
              setGoingAlone(checked);
            }
          }}
        />
        <label
          htmlFor="goAlone"
          className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Go Alone (Your partner sits out, but you'll score more points if you win!)
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['hearts', 'diamonds', 'spades', 'clubs'] as Suit[]).map((suit) => (
          <Button
            key={suit}
            onClick={() => handleSuitSelect(suit)}
            className="h-14 md:h-20 flex items-center justify-center text-xl md:text-2xl"
            size={isMobile ? 'sm' : 'default'}
          >
            {suit === 'hearts' && '♥'}
            {suit === 'diamonds' && '♦'}
            {suit === 'spades' && '♠'}
            {suit === 'clubs' && '♣'}
          </Button>
        ))}
        {/* Show Pass button if current player is not the dealer OR if dealer has already had one round of bidding (more complex rule not handled here yet) */}
        {/* Simplified: show pass if not dealer. EuchreGame.tsx should manage if dealer *must* call. */}
        {currentPlayerId !== dealerId && (
          <Button
            variant="outline"
            onClick={onPass}
            className="col-span-2 mt-2"
            size={isMobile ? 'sm' : 'default'}
          >
            Pass
          </Button>
        )}
      </div>
    </div>
  );
};

export default BiddingPanel;
