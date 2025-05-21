import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { type Card as CardType, type Suit } from "@/types/game";
import Card from "@/components/Card";
import { isValidPlay, getTip, getGameRules, getBestPlay } from "@/utils/gameUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Info, Play, HelpCircle, Book, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
// import { Checkbox } from "@/components/ui/checkbox"; // No longer directly used here
// import type { CheckedState } from "@radix-ui/react-checkbox"; // No longer directly used here
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BiddingPanel from "@/components/game/BiddingPanel";
import PlayerHand from "@/components/game/PlayerHand";

const EuchreGame: React.FC = () => {
  const {
    state,
    dispatch
  } = useGame();
  const {
    players = [],
    currentPlayer = 0, // This is the index of the current player
    dealer = 0, // This is the index of the dealer
    trickCards = [],
    trump,
    phase = "pre-game",
    learningMode = false,
    scores = [0, 0],
    trumpSelector = 0,
    shouldClearTrick = false
  } = state || {};
  const isMobile = useIsMobile();
  const [showRules, setShowRules] = useState(false);
  // const [goingAlone, setGoingAlone] = useState(false); // Moved to BiddingPanel

  // Determine the human player's ID (assuming player at index 0 is human)
  const humanPlayerId = players[0]?.id; // Example: "p1"

  useEffect(() => {
    if (phase === "dealing") {
      dispatch({
        type: "DEAL"
      });
    }
  }, [phase]);
  useEffect(() => {
    if (players[currentPlayer]?.isCPU && phase !== "pre-game") {
      const timer = setTimeout(() => {
        dispatch({
          type: "CPU_PLAY"
        });
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
    dispatch({
      type: "PLAY_CARD",
      card
    });
  };

  // Callback for BiddingPanel when a trump suit is set
  const handleSetTrump = (suit: Suit, isGoingAlone: boolean) => {
    dispatch({
      type: "SET_TRUMP",
      suit,
      goingAlone: isGoingAlone,
    });
  };

  // Callback for BiddingPanel when player passes
  const handlePass = () => {
    dispatch({
      type: "PASS"
    });
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
  const handleNextTrick = () => {
    dispatch({
      type: "CLEAR_TRICK"
    });
  };
  if (phase === "pre-game") {
    return <div className="min-h-screen bg-table flex items-center justify-center p-4">
        <div className="bg-white/90 p-6 md:p-8 rounded-lg shadow-lg max-w-md w-full space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-center mb-6">Welcome to Euchre!</h1>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <label className="font-medium text-sm md:text-base">Learning Mode</label>
              <Switch checked={learningMode} onCheckedChange={() => dispatch({
              type: "TOGGLE_LEARNING_MODE"
            })} />
            </div>
            {learningMode && <div className="space-y-2">
                <p className="text-sm text-gray-600 italic">
                  Learning mode enabled! You'll receive tips and explanations as you play.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setShowRules(true)}>
                  View Game Rules
                </Button>
              </div>}
            <Button className="w-full" size="lg" onClick={() => dispatch({
            type: "START_GAME"
          })}>
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
              {getGameRules().split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </DialogContent>
        </Dialog>
      </div>;
  }
  return <div className="min-h-screen bg-table p-2 md:p-4 relative">
      {/* Learning controls - bottom left */}
      <div className="fixed bottom-4 left-4 flex flex-col gap-2">
        <Button variant="secondary" onClick={handleNewGame} className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg" size={isMobile ? "sm" : "default"}>
          <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
          New Game
        </Button>
        <Button variant="secondary" onClick={() => dispatch({
        type: "TOGGLE_LEARNING_MODE"
      })} className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg" size={isMobile ? "sm" : "default"}>
          <Info className="w-3 h-3 md:w-4 md:h-4" />
          {learningMode ? "Disable" : "Enable"} Learning
        </Button>
        {learningMode && <>
            <Button variant="secondary" onClick={() => setShowRules(true)} className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg" size={isMobile ? "sm" : "default"}>
              <Book className="w-3 h-3 md:w-4 md:h-4" />
              Game Rules
            </Button>
            {phase === "playing" && <Button variant="secondary" onClick={handleHelpRequest} className="flex items-center gap-2 text-xs md:text-sm bg-white/90 shadow-lg" size={isMobile ? "sm" : "default"}>
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                Help Me
              </Button>}
          </>}
      </div>
      
      {/* Game info - bottom right */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {trump && <div className="bg-white/90 p-2 rounded-lg shadow-lg text-xs md:text-sm text-center">
            <p className="font-bold">Trump</p>
            <p className="text-lg">{trump === "hearts" ? "♥" : trump === "diamonds" ? "♦" : trump === "spades" ? "♠" : "♣"}</p>
            <p className="text-xs text-gray-600 mt-1">Selected by {players[trumpSelector]?.name || "Unknown"}</p>
          </div>}
        <div className="bg-white/90 p-2 rounded-lg shadow-lg text-xs md:text-sm">
          <p className="font-bold">Score</p>
          <p>Us: {scores[0]} | Them: {scores[1]}</p>
        </div>
      </div>

      {/* Player hands and game area */}
      <div className="flex justify-between mb-4 md:mb-8">
        {(players.slice(1) || []).map((player, i) => <div key={player.id} className="text-center">
            <div className="flex items-center gap-1 md:gap-2 justify-center mb-1 md:mb-2">
              <p className="text-white text-xs md:text-base">{player.name}</p>
              {i + 1 === dealer && <span className="bg-yellow-500 text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded">
                  Dealer
                </span>}
            </div>
            <div className="flex gap-1 md:gap-2">
              {player.hand.map((card, cardIndex) => <div key={`${player.id}-card-${cardIndex}`} className="w-8 h-12 md:w-16 md:h-24 bg-card-back rounded-lg shadow-md" />)}
            </div>
          </div>)}
      </div>

      {/* Center trick area */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4 md:gap-8">
            {trickCards.map((card, i) => {
            const leadingPlayer = (currentPlayer - trickCards.length + 4) % 4;
            const playerIndex = (leadingPlayer + i) % 4;
            return <div key={`trick-card-${i}`} className="text-center">
                  <p className="text-white text-xs md:text-sm mb-1">
                    {players[playerIndex]?.name || "Unknown"}
                  </p>
                  <Card card={card} isPlayable={false} className={`transform transition-all duration-300 ${isMobile ? "scale-75" : "scale-90"} animate-card-deal`} />
                </div>;
          })}
          </div>
          
          {/* Next Trick Button */}
          {trickCards.length === 4 && currentPlayer === 0 && <Button onClick={handleNextTrick} size={isMobile ? "sm" : "default"} className="mt-4 bg-white/90 hover:bg-white shadow-lg text-slate-950">
              Next Trick
            </Button>}
        </div>
      </div>

      {/* Player's hand area - Replaced with PlayerHand component */}
      {players[0] && humanPlayerId && (
        <PlayerHand
          hand={players[0].hand}
          isCurrentPlayer={currentPlayer === 0} // Assuming player 0 is human
          onCardClick={handleCardClick}
          phase={phase}
          playerId={humanPlayerId}
          dealerId={players[dealer]?.id}
          isHumanPlayer={true}
          isMobile={isMobile}
        />
      )}

      {/* Bidding UI - Replaced with BiddingPanel component */}
      {/* Ensure humanPlayerId and players[currentPlayer] are valid before rendering */}
      {humanPlayerId && players[currentPlayer] && (
          <BiddingPanel
            phase={phase}
            currentPlayerId={players[currentPlayer].id}
            dealerId={players[dealer]?.id}
            onSetTrump={handleSetTrump}
            onPass={handlePass}
            isMobile={isMobile}
            isHumanPlayerTurn={currentPlayer === 0 && !players[currentPlayer].isCPU} // Player 0 is human and it's their turn
          />
      )}

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Euchre Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {getGameRules().split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default EuchreGame;