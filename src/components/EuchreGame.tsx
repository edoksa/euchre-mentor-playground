import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { type Card as CardType } from "@/types/game";
import Card from "@/components/Card";
import { isValidPlay, getTip, getGameRules, getBestPlay } from "@/utils/gameUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Info, Play, HelpCircle, Book, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EuchreGame: React.FC = () => {
  const { state, dispatch } = useGame();
  const { players = [], currentPlayer = 0, dealer = 0, trickCards = [], trump, phase = "pre-game", learningMode = false, scores = [0, 0], trumpSelector = 0 } = state || {};
  const isMobile = useIsMobile();
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (phase === "dealing") {
      dispatch({ type: "DEAL" });
    }
  }, [phase]);

  useEffect(() => {
    if (players[currentPlayer]?.isCPU && phase !== "pre-game") {
      const timer = setTimeout(() => {
        dispatch({ type: "CPU_PLAY" });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, players, phase]);

  useEffect(() => {
    if (learningMode && phase === "dealing") {
      toast.info(getGameRules());
    }
  }, [learningMode, phase]);

  const handleCardClick = (card: CardType) => {
    if (!trump || phase !== "playing") return;
    
    const player = players[currentPlayer];
    if (!player || player.isCPU) return;
    
    if (!isValidPlay(card, player.hand, trickCards, trump)) {
      toast.error("Invalid play - you must follow suit if possible!");
      return;
    }

    if (learningMode) {
      const bestPlay = getBestPlay(player.hand, trickCards, trump);
      if (card.id === bestPlay.id) {
        toast.success("Great play! That was the optimal choice.");
      } else {
        toast.info(`Tip: Consider playing ${bestPlay.rank} of ${bestPlay.suit} instead.`);
      }
    }

    dispatch({ type: "PLAY_CARD", card });
  };

  const handlePass = () => {
    dispatch({ type: "PASS" });
  };

  const handleHelpRequest = () => {
    if (!learningMode || phase !== "playing") return;
    
    const player = players[currentPlayer];
    if (!player || player.isCPU) return;

    const bestPlay = getBestPlay(player.hand, trickCards, trump);
    toast.info(`Suggestion: Play the ${bestPlay.rank} of ${bestPlay.suit}`);
  };

  const handleNewGame = () => {
    localStorage.removeItem("euchre_game_state");
    window.location.reload();
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
              <div className="space-y-2">
                <p className="text-sm text-gray-600 italic">
                  Learning mode enabled! You'll receive tips and explanations as you play.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRules(true)}
                >
                  View Game Rules
                </Button>
              </div>
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

        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Euchre Rules</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {getGameRules().split('\n').filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-table p-2 md:p-4 relative">
      {/* Game controls - top left */}
      <div className="fixed top-4 left-4">
        <Button
          variant="secondary"
          onClick={handleNewGame}
          className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg"
          size={isMobile ? "sm" : "default"}
        >
          <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
          New Game
        </Button>
      </div>

      {/* Learning controls - bottom left */}
      <div className="fixed bottom-4 left-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: "TOGGLE_LEARNING_MODE" })}
          className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg"
          size={isMobile ? "sm" : "default"}
        >
          <Info className="w-3 h-3 md:w-4 md:h-4" />
          {learningMode ? "Disable" : "Enable"} Learning
        </Button>
        {learningMode && (
          <>
            <Button
              variant="secondary"
              onClick={() => setShowRules(true)}
              className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg"
              size={isMobile ? "sm" : "default"}
            >
              <Book className="w-3 h-3 md:w-4 md:h-4" />
              Game Rules
            </Button>
            {phase === "playing" && (
              <Button
                variant="secondary"
                onClick={handleHelpRequest}
                className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg"
                size={isMobile ? "sm" : "default"}
              >
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                Help Me
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Game info - bottom right */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {trump && (
          <div className="bg-white/90 p-2 rounded-lg shadow-lg text-xs md:text-sm text-center">
            <p className="font-bold">Trump</p>
            <p className="text-lg">{trump === "hearts" ? "♥" : trump === "diamonds" ? "♦" : trump === "spades" ? "♠" : "♣"}</p>
            <p className="text-xs text-gray-600 mt-1">Selected by {players[trumpSelector]?.name || "Unknown"}</p>
          </div>
        )}
        <div className="bg-white/90 p-2 rounded-lg shadow-lg text-xs md:text-sm">
          <p className="font-bold">Score</p>
          <p>Us: {scores[0]} | Them: {scores[1]}</p>
        </div>
      </div>

      {/* Player hands and game area */}
      <div className="flex justify-between mb-4 md:mb-8">
        {(players.slice(1) || []).map((player, i) => (
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
              {player.hand.map((card, cardIndex) => (
                <div
                  key={`${player.id}-card-${cardIndex}`}
                  className="w-8 h-12 md:w-16 md:h-24 bg-card-back rounded-lg shadow-md"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Center trick area */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex gap-4 md:gap-8">
          {trickCards.map((card, i) => (
            <div key={`trick-card-${i}`} className="text-center">
              <p className="text-white text-xs md:text-sm mb-1">
                {players[(currentPlayer - trickCards.length + i + 4) % 4]?.name || "Unknown"}
              </p>
              <Card
                card={card}
                isPlayable={false}
                className={`transform transition-all duration-300 ${
                  isMobile ? "scale-75" : "scale-90"
                } animate-card-deal`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Player's hand area */}
      <div className="fixed bottom-16 md:bottom-20 left-1/2 -translate-x-1/2">
        {currentPlayer === 0 && phase === "playing" && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg text-lg font-bold animate-bounce z-20">
            It's Your Turn!
          </div>
        )}
        <div className="flex items-center gap-1 md:gap-2 justify-center mb-1 md:mb-2">
          <p className="text-white text-xs md:text-base">Your Hand</p>
          {dealer === 0 && (
            <span className="bg-yellow-500 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded">
              Dealer
            </span>
          )}
        </div>
        <div className="flex gap-1 md:gap-2 justify-center">
          {players[0]?.hand?.map((card, index) => (
            <Card
              key={`player-card-${index}`}
              card={card}
              isPlayable={currentPlayer === 0 && phase === "playing"}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>

      {/* Bidding UI */}
      {phase === "bidding" && currentPlayer === 0 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 p-3 md:p-4 rounded-lg shadow-lg animate-fade-in z-30">
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

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Euchre Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {getGameRules().split('\n').filter(Boolean).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EuchreGame;
