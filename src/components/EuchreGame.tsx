
import React, { useEffect } from "react";
import { useGame } from "@/context/GameContext";
import Card from "./Card";
import { isValidPlay, getTip } from "@/utils/gameUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const EuchreGame: React.FC = () => {
  const { state, dispatch } = useGame();
  const { players, currentPlayer, trickCards, trump, phase, learningMode, scores } = state;

  useEffect(() => {
    dispatch({ type: "DEAL" });
  }, []);

  useEffect(() => {
    if (players[currentPlayer].isCPU) {
      const timer = setTimeout(() => {
        dispatch({ type: "CPU_PLAY" });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, players]);

  const handleCardClick = (card: Card) => {
    if (!trump || phase !== "playing") return;
    
    const player = players[currentPlayer];
    if (player.isCPU) return;
    
    if (!isValidPlay(card, player.hand, trickCards, trump)) {
      toast.error("Invalid play - you must follow suit if possible!");
      return;
    }

    if (learningMode) {
      const tip = getTip(player.hand, trickCards, trump, phase);
      toast.info(tip);
    }

    dispatch({ type: "PLAY_CARD", card });
  };

  const toggleLearningMode = () => {
    dispatch({ type: "TOGGLE_LEARNING_MODE" });
    if (!learningMode) {
      toast.success("Learning mode enabled! You'll receive tips and explanations as you play.");
    }
  };

  return (
    <div className="min-h-screen bg-table p-4">
      <div className="fixed top-4 right-4 flex gap-4 items-center">
        <Button
          variant="outline"
          onClick={toggleLearningMode}
          className="flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          {learningMode ? "Disable" : "Enable"} Learning Mode
        </Button>
        <div className="bg-white/90 p-2 rounded-lg shadow-lg">
          <p className="font-bold">Score</p>
          <p>Us: {scores[0]} | Them: {scores[1]}</p>
        </div>
      </div>

      {/* CPU Players */}
      <div className="flex justify-between mb-8">
        {players.slice(1).map((player, i) => (
          <div key={player.id} className="text-center">
            <p className="text-white mb-2">{player.name}</p>
            <div className="flex gap-2">
              {player.hand.map((card, cardIndex) => (
                <div
                  key={card.id}
                  className="w-16 h-24 bg-card-back rounded-lg shadow-md"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trick Area */}
      <div className="flex justify-center items-center h-48 mb-8">
        <div className="grid grid-cols-2 gap-4">
          {trickCards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              isPlayable={false}
              className="transform scale-75"
            />
          ))}
        </div>
      </div>

      {/* Player's Hand */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-white mb-2 text-center">Your Hand</p>
        <div className="flex gap-2">
          {players[0].hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              isPlayable={currentPlayer === 0}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>

      {/* Trump Selection (only during bidding) */}
      {phase === "bidding" && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 p-4 rounded-lg shadow-lg animate-fade-in">
          <p className="text-lg font-bold mb-4">Select Trump Suit</p>
          <div className="flex gap-2">
            {["hearts", "diamonds", "spades", "clubs"].map((suit) => (
              <Button
                key={suit}
                onClick={() => dispatch({ type: "SET_TRUMP", suit: suit as any })}
                className="w-20 h-20 flex items-center justify-center text-2xl"
              >
                {suit === "hearts" && "♥"}
                {suit === "diamonds" && "♦"}
                {suit === "spades" && "♠"}
                {suit === "clubs" && "♣"}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EuchreGame;
