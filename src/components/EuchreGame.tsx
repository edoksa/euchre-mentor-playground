
import React, { useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { type Card as CardType } from "@/types/game";
import Card from "./Card";
import { isValidPlay, getTip } from "@/utils/gameUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Info, Play } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

const EuchreGame: React.FC = () => {
  const { state, dispatch } = useGame();
  const { players, currentPlayer, dealer, trickCards, trump, phase, learningMode, scores } = state;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (phase === "dealing") {
      dispatch({ type: "DEAL" });
    }
  }, [phase]);

  useEffect(() => {
    if (players[currentPlayer].isCPU && phase !== "pre-game") {
      const timer = setTimeout(() => {
        dispatch({ type: "CPU_PLAY" });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, players, phase]);

  const handleCardClick = (card: CardType) => {
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

  const handlePass = () => {
    dispatch({ type: "PASS" });
  };

  if (phase === "pre-game") {
    return (
      <div className="min-h-screen bg-table flex items-center justify-center p-4">
        <div className="bg-white/90 p-6 md:p-8 rounded-lg shadow-lg max-w-md w-full space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-center mb-6">Welcome to Euchre!</h1>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <label className="font-medium text-sm md:text-base">Learning Mode</label>
              <Switch
                checked={learningMode}
                onCheckedChange={() => dispatch({ type: "TOGGLE_LEARNING_MODE" })}
              />
            </div>
            {learningMode && (
              <p className="text-sm text-gray-600 italic">
                Learning mode enabled! You'll receive tips and explanations as you play.
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={() => dispatch({ type: "START_GAME" })}
            >
              <Play className="w-5 h-5 mr-2" />
              Let's Play!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-table p-2 md:p-4">
      {/* Game Controls - Split into left and right corners */}
      <div className="fixed bottom-2 md:bottom-4 left-2 md:left-4">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "TOGGLE_LEARNING_MODE" })}
          className="flex items-center gap-2 text-xs md:text-sm bg-white/90"
          size={isMobile ? "sm" : "default"}
        >
          <Info className="w-3 h-3 md:w-4 md:h-4" />
          {learningMode ? "Disable" : "Enable"} Learning
        </Button>
      </div>
      
      <div className="fixed bottom-2 md:bottom-4 right-2 md:right-4">
        <div className="bg-white/90 p-2 rounded-lg shadow-lg text-xs md:text-sm">
          <p className="font-bold">Score</p>
          <p>Us: {scores[0]} | Them: {scores[1]}</p>
        </div>
      </div>

      {phase !== "pre-game" && (
        <>
          {/* CPU Players */}
          <div className="flex justify-between mb-4 md:mb-8">
            {players.slice(1).map((player, i) => (
              <div key={player.id} className="text-center">
                <div className="flex items-center gap-1 md:gap-2 justify-center mb-1 md:mb-2">
                  <p className="text-white text-xs md:text-base">{player.name}</p>
                  {i + 1 === dealer && (
                    <span className="bg-yellow-500 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded">
                      Dealer
                    </span>
                  )}
                </div>
                <div className="flex gap-1 md:gap-2">
                  {player.hand.map((card) => (
                    <div
                      key={card.id}
                      className="w-8 h-12 md:w-16 md:h-24 bg-card-back rounded-lg shadow-md"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Trick Area */}
          <div className="flex justify-center items-center h-32 md:h-48 mb-4 md:mb-8">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {trickCards.map((card, i) => (
                <Card
                  key={card.id}
                  card={card}
                  isPlayable={false}
                  className={isMobile ? "transform scale-75" : "transform scale-90"}
                />
              ))}
            </div>
          </div>

          {/* Player's Hand */}
          <div className="fixed bottom-16 md:bottom-20 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 md:gap-2 justify-center mb-1 md:mb-2">
              <p className="text-white text-xs md:text-base">Your Hand</p>
              {dealer === 0 && (
                <span className="bg-yellow-500 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded">
                  Dealer
                </span>
              )}
            </div>
            <div className="flex gap-1 md:gap-2 justify-center">
              {players[0].hand.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  isPlayable={currentPlayer === 0 && phase === "playing"}
                  onClick={() => handleCardClick(card)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bidding UI */}
      {phase === "bidding" && currentPlayer === 0 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 p-3 md:p-4 rounded-lg shadow-lg animate-fade-in">
          <p className="text-base md:text-lg font-bold mb-2 md:mb-4">Select Trump Suit or Pass</p>
          <div className="flex gap-1 md:gap-2">
            {["hearts", "diamonds", "spades", "clubs"].map((suit) => (
              <Button
                key={suit}
                onClick={() => dispatch({ type: "SET_TRUMP", suit: suit as any })}
                className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center text-xl md:text-2xl"
                size={isMobile ? "sm" : "default"}
              >
                {suit === "hearts" && "♥"}
                {suit === "diamonds" && "♦"}
                {suit === "spades" && "♠"}
                {suit === "clubs" && "♣"}
              </Button>
            ))}
            {currentPlayer !== dealer && (
              <Button
                variant="outline"
                onClick={handlePass}
                className="w-14 h-14 md:w-20 md:h-20 text-sm md:text-base"
                size={isMobile ? "sm" : "default"}
              >
                Pass
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EuchreGame;
