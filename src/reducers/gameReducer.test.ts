import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameReducer, initialState, GameAction } from './gameReducer'; // Adjust path as necessary
import type { GameState, Card, Suit, Player } from '@/types/game';
import * as gameUtils from '@/utils/gameUtils'; // To mock functions from gameUtils

// Mock an entire module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock gameUtils if needed for specific tests, e.g., getBestPlay for CPU_PLAY
vi.mock('@/utils/gameUtils', async () => {
  const actual = await vi.importActual('@/utils/gameUtils');
  return {
    ...actual, // Import and retain default behavior
    createDeck: vi.fn(() => { // Example: always return a predictable deck for testing deal
      const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
      const ranks: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
      const deck: Card[] = [];
      for (let i = 0; i < 24; i++) { // Simple predictable deck
        deck.push({ id: `${ranks[i%6]}-${suits[i%4]}`, rank: ranks[i%6], suit: suits[i%4] });
      }
      return deck;
    }),
    dealCards: vi.fn((deck: Card[]) => { // Predictable deal
        if (!deck || deck.length < 20) return null;
        const hands: Card[][] = [deck.slice(0,5), deck.slice(5,10), deck.slice(10,15), deck.slice(15,20)];
        const remainingDeck = deck.slice(20);
        return { hands, remainingDeck };
    }),
    getBestPlay: vi.fn((hand: Card[], trick: Card[], trump: Suit) => {
      // Return a predictable "best play" for CPU tests, e.g., the first valid card.
      const validPlays = hand.filter(card => gameUtils.isValidPlay(card, hand, trick, trump));
      return validPlays.length > 0 ? validPlays[0] : hand[0]; // Fallback to first card if no valid plays (shouldn't happen in tests)
    }),
    isValidPlay: vi.fn(gameUtils.isValidPlay), // Use actual isValidPlay by default
    determineWinner: vi.fn(gameUtils.determineWinner), // Use actual determineWinner
  };
});


describe('gameReducer', () => {
  let testState: GameState;

  beforeEach(() => {
    // Reset to a fresh initial state before each test
    testState = JSON.parse(JSON.stringify(initialState)); // Deep copy
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Predictable random for dealer, CPU decisions
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore Math.random and other mocks
  });

  it('should return current state for unknown action', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
    const newState = gameReducer(testState, unknownAction);
    expect(newState).toEqual(testState);
  });

  describe('START_GAME', () => {
    it('should set phase to "dealing" and assign a dealer', () => {
      const action: GameAction = { type: 'START_GAME' };
      const newState = gameReducer(testState, action);
      expect(newState.phase).toBe('dealing');
      expect(newState.dealer).toBeGreaterThanOrEqual(0);
      expect(newState.dealer).toBeLessThanOrEqual(3); // Dealer index 0-3
      expect(Math.random).toHaveBeenCalled();
    });
  });

  describe('DEAL', () => {
    it('should deal cards, set phase to "bidding", and set currentPlayer', () => {
      testState.phase = 'dealing'; // Prerequisite for DEAL action in reducer
      testState.dealer = 0; // Example dealer
      const action: GameAction = { type: 'DEAL' };
      const newState = gameReducer(testState, action);

      expect(gameUtils.createDeck).toHaveBeenCalled();
      expect(gameUtils.dealCards).toHaveBeenCalled();
      expect(newState.players.every(p => p.hand.length === 5)).toBe(true);
      expect(newState.deck.length).toBe(4); // 24 - 20 cards dealt
      expect(newState.phase).toBe('bidding');
      expect(newState.currentPlayer).toBe((testState.dealer + 1) % 4);
      expect(newState.passCount).toBe(0);
      expect(newState.trickCards).toEqual([]);
    });
  });

  describe('PASS', () => {
    beforeEach(() => {
        testState.phase = 'bidding';
        testState.dealer = 0;
        testState.currentPlayer = 1; // Player 1's turn to bid
        testState.passCount = 0;
    });

    it('should increment passCount and advance currentPlayer', () => {
      const action: GameAction = { type: 'PASS' };
      const newState = gameReducer(testState, action);
      expect(newState.passCount).toBe(1);
      expect(newState.currentPlayer).toBe(2);
    });

    it('should trigger toast if 3 passes and next player is dealer (human)', () => {
      testState.currentPlayer = 3; // Player 3 is about to pass
      testState.passCount = 2;     // Making it the 3rd pass
      testState.players[0].isCPU = false; // Dealer (player 0) is human
      
      const action: GameAction = { type: 'PASS' };
      gameReducer(testState, action); // newState.currentPlayer will be 0 (dealer)
      // The reducer's handlePass itself doesn't show toast; it's the CPU_PLAY or UI after.
      // The test in gameReducer for handlePass only checks if passCount ===3 and next is dealer.
      // The actual toast "Dealer must select trump!" is in handlePass directly.
      expect(vi.mocked(global.toast.info)).toHaveBeenCalledWith("Dealer must select trump!");
    });
    
    it('should allow dealer to pass if it is not the forced bid scenario', () => {
        testState.currentPlayer = 0; // Dealer's turn
        testState.passCount = 0; // Not a forced bid
        const action: GameAction = { type: 'PASS' };
        const newState = gameReducer(testState, action);
        expect(newState.passCount).toBe(1);
        expect(newState.currentPlayer).toBe(1);
    });
  });

  describe('SET_TRUMP', () => {
    beforeEach(() => {
        testState.phase = 'bidding';
        testState.currentPlayer = 1; // Player 1 calls trump
        testState.dealer = 0;
    });

    it('should set trump, phase, trumpSelector, currentPlayer, and goingAlone status', () => {
      const action: GameAction = { type: 'SET_TRUMP', suit: 'hearts', goingAlone: true };
      const newState = gameReducer(testState, action);
      expect(newState.trump).toBe('hearts');
      expect(newState.trumpSelector).toBe(1); // Player 1 called it
      expect(newState.phase).toBe('playing');
      expect(newState.currentPlayer).toBe((testState.dealer + 1) % 4); // Player left of dealer starts play
      expect(newState.goingAlone).toBe(true);
      expect(newState.passCount).toBe(0); // Pass count reset
      // Check if partner is sitting out
      const partnerIndex = (1 + 2) % 4; // Partner of player 1 is player 3
      expect(newState.players[partnerIndex].sittingOut).toBe(true);
    });
  });

  describe('PLAY_CARD', () => {
    let playingState: GameState;
    const cardToPlay: Card = { id: '9-H', rank: '9', suit: 'hearts' };

    beforeEach(() => {
      playingState = JSON.parse(JSON.stringify(initialState));
      playingState.phase = 'playing';
      playingState.trump = 'spades';
      playingState.dealer = 0;
      playingState.currentPlayer = 0; // Human player's turn
      playingState.players[0].hand = [
        cardToPlay,
        { id: '10-H', rank: '10', suit: 'hearts' },
        { id: 'K-S', rank: 'K', suit: 'spades' }, // Trump card
        { id: 'A-C', rank: 'A', suit: 'clubs' },
        { id: 'Q-D', rank: 'Q', suit: 'diamonds' },
      ];
      playingState.trickCards = [];
      // Mock isValidPlay to always return true for these tests to focus on reducer logic
      vi.mocked(gameUtils.isValidPlay).mockReturnValue(true);
    });

    it('should remove card from hand and add to trickCards, then advance player', () => {
      const action: GameAction = { type: 'PLAY_CARD', card: cardToPlay };
      const newState = gameReducer(playingState, action);

      expect(newState.players[0].hand.some(c => c.id === cardToPlay.id)).toBe(false);
      expect(newState.players[0].hand.length).toBe(4);
      expect(newState.trickCards.length).toBe(1);
      expect(newState.trickCards[0].id).toBe(cardToPlay.id);
      expect(newState.currentPlayer).toBe(1); // Next player
      expect(newState.shouldClearTrick).toBe(false);
    });

    it('should complete trick, update scores, set trick winner as currentPlayer, and set shouldClearTrick', () => {
      // Simulate 3 cards already in trick
      playingState.trickCards = [
        { id: '9-D', rank: '9', suit: 'diamonds' }, // P1
        { id: '10-D', rank: '10', suit: 'diamonds' },// P2
        { id: 'J-D', rank: 'J', suit: 'diamonds' }, // P3
      ];
      // Player 0 (currentPlayer) plays the 4th card
      playingState.currentPlayer = 0;
      playingState.dealer = 3; // So player 0 leads this trick ( (3+1)%4 = 0 )
                               // Or rather, currentPlayer for PLAY_CARD is who is playing now.
                               // The reducer calculates leader based on trickCards.length
                               // If trick has 3 cards, current player is last player of trick.
                               // Lead player was (currentPlayer - 3 + 4) % 4

      vi.mocked(gameUtils.determineWinner).mockReturnValue(0); // Assume the card played by P0 wins the trick (index 0 of the newTrickCards which includes P0 card)
                                                              // This means index 0 of the *final* trick array.
                                                              // If P0 is last to play, their card is at index 3.
                                                              // Let's say P0's card makes them win.
                                                              // determineWinner returns index *within the trick array*.
                                                              // If P0 (currentPlayer=0) plays last card, card is trick[3].
                                                              // determineWinner([c1,c2,c3,P0card], trump) returns 3.
                                                              // trickWinner = (leadPlayerIndex + 3) % 4
      
      // Let's refine: P0 plays cardToPlay. Trick becomes [c1,c2,c3,cardToPlay]
      // Assume cardToPlay makes P0 win.
      // So determineWinner will return 3 (index of cardToPlay in the full trick)
      vi.mocked(gameUtils.determineWinner).mockImplementation((trick) => trick.length - 1);


      const action: GameAction = { type: 'PLAY_CARD', card: cardToPlay };
      const newState = gameReducer(playingState, action);
      
      expect(newState.trickCards.length).toBe(4);
      expect(newState.scores[0]).toBe(1); // Player 0 is team 0 (scores[0])
      expect(newState.currentPlayer).toBe(0); // Player 0 won, so P0 leads next
      expect(newState.shouldClearTrick).toBe(true);
    });
    
    it('handles "going alone" correctly for trick size and next player', () => {
        playingState.goingAlone = true;
        playingState.players[(playingState.currentPlayer + 2) % 4].sittingOut = true; // Partner sits out
        // Simulate 2 cards in trick, current player (P0) plays 3rd and final card for "going alone"
        playingState.trickCards = [
            { id: '9-D', rank: '9', suit: 'diamonds' },
            { id: '10-D', rank: '10', suit: 'diamonds' },
        ];
        vi.mocked(gameUtils.determineWinner).mockReturnValue(2); // P0's card is at index 2 and wins

        const action: GameAction = { type: 'PLAY_CARD', card: cardToPlay };
        const newState = gameReducer(playingState, action);

        expect(newState.trickCards.length).toBe(3); // Trick size is 3
        expect(newState.scores[0]).toBe(1);
        expect(newState.currentPlayer).toBe(0); // P0 won
        expect(newState.shouldClearTrick).toBe(true);

        // Test advancing player when trick is not complete and next is sitting out
        playingState.trickCards = [{ id: '9-D', rank: '9', suit: 'diamonds' }]; // P0 plays, trick has 1 card
        playingState.shouldClearTrick = false;
        playingState.goingAlone = true;
        playingState.players[1].sittingOut = false; // P1 active
        playingState.players[2].sittingOut = true;  // P2 (partner of P0 if P0 called alone) sitting out
        playingState.players[3].sittingOut = false; // P3 active

        const stateAfterP0Plays = gameReducer(playingState, action); // P0 plays cardToPlay
        expect(stateAfterP0Plays.currentPlayer).toBe(1); // P1 is next

        // Now P1 plays. Assume P2 is sitting out (partner of current leader if they went alone)
        // This requires more setup of who called alone. Let's assume P0 called alone.
        // If P0 (currentPlayer) plays, next is P1. If P1 plays, next should be P3 (skipping P2).
        let stateAfterP1Plays = JSON.parse(JSON.stringify(stateAfterP0Plays));
        stateAfterP1Plays.currentPlayer = 1; // P1's turn
        stateAfterP1Plays.players[1].hand = [{id: 'K-D', rank: 'K', suit: 'diamonds'}, ...stateAfterP1Plays.players[1].hand.slice(1)];

        const p1Card = stateAfterP1Plays.players[1].hand[0];
        const newStateAfterP1Plays = gameReducer(stateAfterP1Plays, {type: 'PLAY_CARD', card: p1Card});
        expect(newStateAfterP1Plays.currentPlayer).toBe(3); // Should skip P2
    });
  });

  describe('CLEAR_TRICK', () => {
    beforeEach(() => {
        testState.phase = 'playing';
        testState.trump = 'spades';
        testState.trickCards = [{}, {}, {}, {}] as Card[]; // Dummy full trick
        testState.shouldClearTrick = true; // Assume it was set
        testState.currentPlayer = 1; // Player 1 won the last trick
    });

    it('should clear trickCards and keep current player if hand is not over', () => {
      testState.players.forEach(p => p.hand = [{}] as Card[]); // Each player still has cards
      const action: GameAction = { type: 'CLEAR_TRICK' };
      const newState = gameReducer(testState, action);

      expect(newState.trickCards.length).toBe(0);
      expect(newState.shouldClearTrick).toBe(false);
      expect(newState.currentPlayer).toBe(1); // Winner leads next trick
      expect(newState.phase).toBe('playing');
    });

    it('should transition to "dealing" phase if all hands are empty', () => {
      testState.players.forEach(p => p.hand = []); // All hands empty
      const originalDealer = testState.dealer;
      const action: GameAction = { type: 'CLEAR_TRICK' };
      const newState = gameReducer(testState, action);

      expect(newState.trickCards.length).toBe(0);
      expect(newState.phase).toBe('dealing'); // Switches to dealing for next hand
      expect(newState.dealer).toBe((originalDealer + 1) % 4); // Dealer rotates
      // The reducer itself doesn't auto-dispatch DEAL, that's handled by recursive call if CPU or useEffect
    });
  });

  describe('TOGGLE_LEARNING_MODE', () => {
    it('should toggle learningMode flag', () => {
      testState.learningMode = false;
      let action: GameAction = { type: 'TOGGLE_LEARNING_MODE' };
      let newState = gameReducer(testState, action);
      expect(newState.learningMode).toBe(true);

      action = { type: 'TOGGLE_LEARNING_MODE' };
      newState = gameReducer(newState, action); // Pass the already modified state
      expect(newState.learningMode).toBe(false);
    });
  });
  
  describe('CPU_PLAY', () => {
    beforeEach(() => {
        testState.dealer = 0;
        testState.players[1].isCPU = true; // Player 1 is CPU
        testState.currentPlayer = 1; // CPU's turn
        testState.players[1].hand = [
            { id: '9-H', rank: '9', suit: 'hearts' },
            { id: 'J-D', rank: 'J', suit: 'diamonds' },
            { id: 'A-S', rank: 'A', suit: 'spades' },
        ];
        vi.mocked(gameUtils.getBestPlay).mockClear(); // Clear mock calls
        vi.mocked(global.toast.info).mockClear();
    });

    it('CPU bidding: should make a call (SET_TRUMP) or pass (PASS)', () => {
        testState.phase = 'bidding';
        // Mock Math.random for bidding decisions if CPU bidding logic uses it heavily
        // For the refactored CPU bidding (score-based), Math.random is less critical unless for tie-breaking
        // Let's assume CPU hand is strong enough to call hearts
        vi.spyOn(Math, 'random').mockReturnValue(0.1); // Make it likely to call if random is used

        const action: GameAction = { type: 'CPU_PLAY' };
        const newState = gameReducer(testState, action); // gameReducer calls handleCpuPlay which calls gameReducer again

        // Check if either SET_TRUMP or PASS was the outcome.
        // The handleCpuPlay dispatches another action.
        // So newState is the result of that *second* action.
        expect(newState.phase === 'playing' || newState.passCount > 0).toBe(true);
        if (newState.phase === 'playing') {
            expect(newState.trump).toBeDefined();
        }
    });

    it('CPU playing: should play a card (PLAY_CARD)', () => {
        testState.phase = 'playing';
        testState.trump = 'spades'; // Spades is trump
        testState.trickCards = []; // Leading a trick
        
        // Mock getBestPlay to return the Ace of Spades from CPU's hand
        const bestCardToPlay = testState.players[1].hand[2]; // A-S
        vi.mocked(gameUtils.getBestPlay).mockReturnValue(bestCardToPlay);

        const action: GameAction = { type: 'CPU_PLAY' };
        const newState = gameReducer(testState, action); // Results in PLAY_CARD action

        expect(gameUtils.getBestPlay).toHaveBeenCalledWith(testState.players[1].hand, testState.trickCards, testState.trump, expect.anything(), expect.anything());
        expect(newState.trickCards.length).toBe(1);
        expect(newState.trickCards[0].id).toBe(bestCardToPlay.id);
        expect(newState.players[1].hand.some(c => c.id === bestCardToPlay.id)).toBe(false);
    });

    it('CPU dealer forced to call trump if passCount is 3', () => {
        testState.phase = 'bidding';
        testState.dealer = 1; // CPU is dealer
        testState.currentPlayer = 1; // CPU's turn
        testState.passCount = 3; // All others passed
        // CPU hand is weak, but should still be forced to call something
        testState.players[1].hand = [
            { id: '9-H', rank: '9', suit: 'hearts' },
            { id: '10-D', rank: '10', suit: 'diamonds' },
        ];

        const action: GameAction = { type: 'CPU_PLAY' };
        const newState = gameReducer(testState, action);

        expect(newState.phase).toBe('playing');
        expect(newState.trump).toBeDefined(); // Trump must be set
        expect(newState.trumpSelector).toBe(1); // CPU (dealer) selected trump
        expect(newState.goingAlone).toBe(false); // Typically don't go alone if forced
        expect(vi.mocked(global.toast.info)).toHaveBeenCalledWith("CPU 1 (Dealer) is forced to call trump.");
    });
  });
});
