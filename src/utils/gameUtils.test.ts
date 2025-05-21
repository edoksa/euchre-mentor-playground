import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  getEffectiveSuit,
  getRankValue,
  isValidPlay,
  determineWinner,
  getBestPlay,
  getLeftBowerSuit
} from './gameUtils'; // Assuming your utils are directly exported
import type { Card, Suit, Rank } from '@/types/game';

describe('gameUtils', () => {
  describe('createDeck', () => {
    it('should create a deck with 24 unique cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(24);
      const cardIds = deck.map(card => card.id);
      const uniqueCardIds = new Set(cardIds);
      expect(uniqueCardIds.size).toBe(24);
    });
  });

  describe('shuffleDeck', () => {
    it('should return a deck of the same length', () => {
      const deck = createDeck();
      const shuffledDeck = shuffleDeck(deck);
      expect(shuffledDeck.length).toBe(24);
    });

    it('should return a deck with the same cards', () => {
      const deck = createDeck();
      const shuffledDeck = shuffleDeck(deck);
      const originalCardIds = deck.map(c => c.id).sort();
      const shuffledCardIds = shuffledDeck.map(c => c.id).sort();
      expect(shuffledCardIds).toEqual(originalCardIds);
    });

    it('should likely change the order of cards', () => {
      const deck = createDeck();
      const shuffledDeck = shuffleDeck([...deck]); // Use a copy
      // It's probabilistic, but for 24 cards, a shuffle should almost always change the order.
      // A more robust test might check if multiple shuffles produce different orders,
      // or if specific cards change position.
      expect(shuffledDeck).not.toEqual(deck); 
    });
  });

  describe('dealCards', () => {
    it('should deal 5 cards to each of the 4 hands and leave 4 cards in the remaining deck', () => {
      const deck = createDeck();
      const result = dealCards(deck);
      expect(result).not.toBeNull();
      if (result) {
        result.hands.forEach(hand => {
          expect(hand.length).toBe(5);
        });
        expect(result.remainingDeck.length).toBe(4); // 24 - (4 * 5) = 4
      }
    });

    it('should return null if the input deck is too small (less than 20 cards)', () => {
      const smallDeck: Card[] = createDeck().slice(0, 19); // 19 cards
      const result = dealCards(smallDeck);
      expect(result).toBeNull();
    });
    
    it('should return null if the input deck is null or undefined', () => {
        expect(dealCards(null as any)).toBeNull();
        expect(dealCards(undefined as any)).toBeNull();
    });

    it('should deal all unique cards', () => {
        const deck = createDeck();
        const result = dealCards(deck);
        expect(result).not.toBeNull();
        if (result) {
            const allDealtCards = result.hands.flat();
            const allCards = [...allDealtCards, ...result.remainingDeck];
            const cardIds = allCards.map(card => card.id);
            const uniqueCardIds = new Set(cardIds);
            expect(uniqueCardIds.size).toBe(24);
            expect(allCards.length).toBe(24);
        }
    });
  });

  describe('getEffectiveSuit', () => {
    const nineOfHearts: Card = { id: '9-H', rank: '9', suit: 'hearts' };
    const jackOfHearts: Card = { id: 'J-H', rank: 'J', suit: 'hearts' }; // Right Bower if hearts is trump
    const jackOfDiamonds: Card = { id: 'J-D', rank: 'J', suit: 'diamonds' }; // Left Bower if hearts is trump
    const jackOfSpades: Card = { id: 'J-S', rank: 'J', suit: 'spades' };

    it('should return the card\'s suit for regular cards', () => {
      expect(getEffectiveSuit(nineOfHearts, 'spades')).toBe('hearts');
      expect(getEffectiveSuit(jackOfSpades, 'hearts')).toBe('spades');
    });

    it('should return trump suit for the Right Bower', () => {
      expect(getEffectiveSuit(jackOfHearts, 'hearts')).toBe('hearts');
    });

    it('should return trump suit for the Left Bower', () => {
      expect(getEffectiveSuit(jackOfDiamonds, 'hearts')).toBe('hearts'); // J♦ is Left Bower when ♥ is trump
      expect(getEffectiveSuit(jackOfHearts, 'diamonds')).toBe('diamonds'); // J♥ is Left Bower when ♦ is trump
      expect(getEffectiveSuit(jackOfSpades, 'clubs')).toBe('clubs'); // J♠ is Left Bower when ♣ is trump
      expect(getEffectiveSuit({id:'J-C', rank:'J', suit:'clubs'}, 'spades')).toBe('spades'); // J♣ is Left Bower when ♠ is trump
    });
    
    it('should not change suit if Jack is not a bower', () => {
        expect(getEffectiveSuit(jackOfSpades, 'hearts')).toBe('spades'); // J♠ is not a bower when ♥ is trump
        expect(getEffectiveSuit(jackOfDiamonds, 'spades')).toBe('diamonds'); // J♦ is not a bower when ♠ is trump
    });
  });

  describe('getRankValue', () => {
    // Adjusted expected values based on the implementation in the previous step (overwrite_file_with_block)
    // Right Bower: 18, Left Bower: 17
    // Trump A: 16, K: 15, Q: 14, (J not bower: 13), 10: 12, 9: 11
    // Non-trump A: 10, K: 9, Q: 8, J: 7, 10: 6, 9: 5

    const nineH: Card = { id: '9-H', rank: '9', suit: 'hearts' };
    const tenH: Card = { id: '10-H', rank: '10', suit: 'hearts' };
    const jackH: Card = { id: 'J-H', rank: 'J', suit: 'hearts' }; // Right Bower (hearts trump) / Regular Jack (other trump)
    const queenH: Card = { id: 'Q-H', rank: 'Q', suit: 'hearts' };
    const kingH: Card = { id: 'K-H', rank: 'K', suit: 'hearts' };
    const aceH: Card = { id: 'A-H', rank: 'A', suit: 'hearts' };

    const nineD: Card = { id: '9-D', rank: '9', suit: 'diamonds' };
    const jackD: Card = { id: 'J-D', rank: 'J', suit: 'diamonds' }; // Left Bower (hearts trump) / Right Bower (diamonds trump)

    it('should rank non-trump cards correctly', () => {
      const trump: Suit = 'spades';
      expect(getRankValue(nineH, trump)).toBe(5); // 9 of non-trump
      expect(getRankValue(tenH, trump)).toBe(6);  // 10 of non-trump
      expect(getRankValue(jackH, trump)).toBe(7);  // J of non-trump
      expect(getRankValue(queenH, trump)).toBe(8); // Q of non-trump
      expect(getRankValue(kingH, trump)).toBe(9);  // K of non-trump
      expect(getRankValue(aceH, trump)).toBe(10); // A of non-trump
    });

    it('should rank trump cards (non-Bowers) correctly', () => {
      const trump: Suit = 'hearts';
      expect(getRankValue(nineH, trump)).toBe(11);  // 9 of trump
      expect(getRankValue(tenH, trump)).toBe(12);   // 10 of trump
      // Jack of Hearts is Right Bower if Hearts is trump, so it's not tested here as "non-Bower"
      expect(getRankValue(queenH, trump)).toBe(14); // Q of trump
      expect(getRankValue(kingH, trump)).toBe(15);  // K of trump
      expect(getRankValue(aceH, trump)).toBe(16);   // A of trump
    });
    
    it('should rank Jack of trump (if not Right Bower, i.e. different suit but same effective suit due to being Left Bower) as trump', () => {
      // This case is tricky: if Jack of Diamonds is Left Bower (hearts trump), its effective suit is hearts.
      // The getRankValue logic should correctly identify it as Left Bower (17) not a regular trump Jack (13).
      // So, a "non-Bower Jack of trump" means a Jack of a different suit that is *not* the Left Bower.
      // This scenario doesn't exist if the Jack is trump. A Jack of trump is always a Right Bower or not trump at all.
      // The only Jack that is trump but not Right Bower is the Left Bower.
      // Let's test a Jack that becomes trump because it's a Left Bower, but its original suit is not trump.
      // This is covered by Left Bower test.
      // A Jack of *another* suit that is also trump (not possible)
      // A Jack of the trump suit is the Right Bower.
      // A Jack of the *same color* as trump is the Left Bower.
      // A Jack of a *different color* is just a regular card if that suit is not trump.
      // Let's clarify: "Jack of trump" implies its *effective suit* is trump.
      const trump: Suit = 'clubs'; // Spades is its left bower color
      const jackSpades: Card = { id: 'J-S', rank: 'J', suit: 'spades' }; // Left bower for clubs trump
      expect(getRankValue(jackSpades, trump)).toBe(17); // Left Bower

      const jackClubs: Card = {id: 'J-C', rank: 'J', suit: 'clubs'}; // Right bower for clubs trump
      expect(getRankValue(jackClubs, trump)).toBe(18);

      // A jack that is trump but not a bower isn't possible.
      // Re-evaluating the ranks: 9,10,Q,K,A of trump are below bowers.
      // STD_RANKS_ORDER.indexOf(card.rank) + 11;
      // J (idx 2) + 11 = 13. This rank is for a Jack OF THE TRUMP SUIT that is NOT a bower.
      // This is only possible if the trump suit is e.g. Hearts, and we are evaluating Jack of Hearts,
      // AND the logic for Right Bower (if card.suit === trump) was NOT met.
      // The current implementation: if (card.rank === "J") { if (card.suit === trump) return 18 (Right Bower) }
      // So a Jack of the trump suit will always be 18. The rank 13 is unreachable for a Jack of the actual trump suit.
      // This means the comment "J (if not bower, 13)" in getRankValue might be misleading or refer to an impossible state.
      // The logic `rankOrder + 11` for trumps (where rankOrder for J is 2) would give 13.
      // This value is shadowed by the Bower checks.
      // For the purpose of testing current code:
      // A Jack of the trump suit is Right Bower (18).
      // A Jack of same color is Left Bower (17).
      // Other Jacks are non-trump (7).
      // There is no Jack that evaluates to 13 with current code.
    });

    it('should rank Left Bower correctly', () => {
      expect(getRankValue(jackD, 'hearts')).toBe(17); // J♦ is Left Bower when ♥ is trump
      expect(getRankValue(jackH, 'diamonds')).toBe(17); // J♥ is Left Bower when ♦ is trump
    });

    it('should rank Right Bower correctly', () => {
      expect(getRankValue(jackH, 'hearts')).toBe(18); // J♥ is Right Bower when ♥ is trump
      expect(getRankValue(jackD, 'diamonds')).toBe(18); // J♦ is Right Bower when ♦ is trump
    });
  });

  describe('isValidPlay', () => {
    const P1Hand: Card[] = [
      { id: '9-H', rank: '9', suit: 'hearts' },
      { id: 'J-D', rank: 'J', suit: 'diamonds' }, // Potential Left Bower
      { id: 'A-S', rank: 'A', suit: 'spades' },
      { id: 'K-C', rank: 'K', suit: 'clubs' },
      { id: '10-H', rank: '10', suit: 'hearts' },
    ];

    it('should allow any card if trick is empty', () => {
      const trick: Card[] = [];
      const trump: Suit = 'clubs';
      expect(isValidPlay(P1Hand[0], P1Hand, trick, trump)).toBe(true);
    });

    it('must follow suit if possible (regular suit)', () => {
      const trick: Card[] = [{ id: 'Q-H', rank: 'Q', suit: 'hearts' }]; // Lead hearts
      const trump: Suit = 'spades';
      expect(isValidPlay(P1Hand[0], P1Hand, trick, trump)).toBe(true); // Play 9H (follows)
      expect(isValidPlay(P1Hand[4], P1Hand, trick, trump)).toBe(true); // Play 10H (follows)
      expect(isValidPlay(P1Hand[2], P1Hand, trick, trump)).toBe(false); // Play AS (doesn't follow, has hearts)
    });
    
    it('must follow suit if possible (lead is trump)', () => {
      const trick: Card[] = [{ id: 'Q-S', rank: 'Q', suit: 'spades' }]; // Lead spades (trump)
      const trump: Suit = 'spades';
      const hand: Card[] = [ P1Hand[2], {id: '9-S', rank: '9', suit: 'spades'}]; // AS, 9S
      expect(isValidPlay({id: '9-S', rank: '9', suit: 'spades'}, hand, trick, trump)).toBe(true); // Play 9S (follows trump)
      expect(isValidPlay(P1Hand[2], hand, trick, trump)).toBe(false); // Play AS (doesn't follow, has spades)
    });

    it('can play any card if unable to follow suit', () => {
      const trick: Card[] = [{ id: 'Q-S', rank: 'Q', suit: 'spades' }]; // Lead spades
      const trump: Suit = 'clubs'; // Clubs is trump, spades is just a suit
      const handWithoutSpades: Card[] = [P1Hand[0], P1Hand[1], P1Hand[3]]; // 9H, JD, KC
      expect(isValidPlay(P1Hand[0], handWithoutSpades, trick, trump)).toBe(true); // Play 9H
      expect(isValidPlay(P1Hand[1], handWithoutSpades, trick, trump)).toBe(true); // Play JD
      expect(isValidPlay(P1Hand[3], handWithoutSpades, trick, trump)).toBe(true); // Play KC (trump)
    });

    it('must play Left Bower if it is the only card of the effective lead suit (trump)', () => {
      const trump: Suit = 'hearts'; // Hearts is trump
      const handWithOnlyLeftBowerForSuit: Card[] = [
        P1Hand[1], // JD (Left Bower, effective suit hearts)
        { id: 'A-S', rank: 'A', suit: 'spades' },
        { id: 'K-C', rank: 'K', suit: 'clubs' },
      ];
      const trick: Card[] = [{ id: 'Q-H', rank: 'Q', suit: 'hearts' }]; // Lead hearts
      expect(getEffectiveSuit(P1Hand[1], trump)).toBe('hearts');
      expect(isValidPlay(P1Hand[1], handWithOnlyLeftBowerForSuit, trick, trump)).toBe(true);
      expect(isValidPlay({ id: 'A-S', rank: 'A', suit: 'spades' }, handWithOnlyLeftBowerForSuit, trick, trump)).toBe(false);
    });

    it('must play Jack of Diamonds (not Left Bower) if Diamonds are led and no other Diamonds', () => {
      const trump: Suit = 'spades'; // Spades is trump, JD is just a diamond
      const handWithOnlyJackOfDiamonds: Card[] = [
        P1Hand[1], // JD
        { id: 'A-H', rank: 'A', suit: 'hearts' },
        { id: 'K-C', rank: 'K', suit: 'clubs' },
      ];
      const trick: Card[] = [{ id: 'Q-D', rank: 'Q', suit: 'diamonds' }]; // Lead diamonds
      expect(getEffectiveSuit(P1Hand[1], trump)).toBe('diamonds');
      expect(isValidPlay(P1Hand[1], handWithOnlyJackOfDiamonds, trick, trump)).toBe(true);
      expect(isValidPlay({ id: 'A-H', rank: 'A', suit: 'hearts' }, handWithOnlyJackOfDiamonds, trick, trump)).toBe(false);
    });
  });

  describe('determineWinner', () => {
    const Jdiamonds: Card = { id: 'J-D', rank: 'J', suit: 'diamonds' };
    const Qdiamonds: Card = { id: 'Q-D', rank: 'Q', suit: 'diamonds' };
    const Adiamonds: Card = { id: 'A-D', rank: 'A', suit: 'diamonds' };
    const nineSpades: Card = { id: '9-S', rank: '9', suit: 'spades' };
    const tenSpades: Card = { id: '10-S', rank: '10', suit: 'spades' };
    const ASpades: Card = { id: 'A-S', rank: 'A', suit: 'spades' };
    const nineHearts: Card = { id: '9-H', rank: '9', suit: 'hearts' };
    const jackHearts: Card = { id: 'J-H', rank: 'J', suit: 'hearts' }; // Potential Right Bower
    const jackClubs: Card = { id: 'J-C', rank: 'J', suit: 'clubs' }; // Potential Left Bower if Spades is trump

    it('should determine winner with only non-trump cards (highest of led suit)', () => {
      const trick: Card[] = [Qdiamonds, nineSpades, Adiamonds, tenSpades]; // Lead: Q♦
      const trump: Suit = 'hearts';
      expect(determineWinner(trick, trump)).toBe(2); // A♦ wins
    });

    it('should determine winner with one trump card', () => {
      const trick: Card[] = [Qdiamonds, nineHearts, Adiamonds, tenSpades]; // nineHearts is trump
      const trump: Suit = 'hearts';
      expect(determineWinner(trick, trump)).toBe(1); // 9♥ wins
    });

    it('should determine winner with multiple trump cards (highest trump wins)', () => {
      const trick: Card[] = [Qdiamonds, jackHearts, Adiamonds, nineHearts]; // J♥ and 9♥ are trump
      const trump: Suit = 'hearts'; // J♥ is Right Bower
      expect(getRankValue(jackHearts, trump)).toBe(18);
      expect(getRankValue(nineHearts, trump)).toBe(11);
      expect(determineWinner(trick, trump)).toBe(1); // J♥ wins
    });

    it('should determine winner with Right Bower winning', () => {
      const trick: Card[] = [ASpades, jackHearts, Adiamonds, nineHearts]; // J♥ is Right Bower
      const trump: Suit = 'hearts';
      expect(determineWinner(trick, trump)).toBe(1); // J♥ (Right Bower) wins
    });

    it('should determine winner with Left Bower winning over other trumps (non-Right Bower)', () => {
      // Spades trump: J♣ is Left Bower. A♠ is regular trump Ace.
      const trick: Card[] = [ASpades, Qdiamonds, jackClubs, tenSpades]; 
      const trump: Suit = 'spades';
      expect(getRankValue(jackClubs, trump)).toBe(17); // Left Bower
      expect(getRankValue(ASpades, trump)).toBe(16);   // Ace of trump
      expect(getRankValue(tenSpades, trump)).toBe(12); // 10 of trump
      expect(determineWinner(trick, trump)).toBe(2); // J♣ (Left Bower) wins
    });
    
    it('should handle a trick where only non-trump cards of different suits are played (first card wins)', () => {
      const trick: Card[] = [Qdiamonds, nineSpades, nineHearts];
      const trump: Suit = 'clubs'; // No trump played
      expect(determineWinner(trick, trump)).toBe(0); // Q♦ wins as it was led
    });

    it('Left Bower wins if only Bower and lower trump are played', () => {
        const trump: Suit = 'hearts'; // Jack of Diamonds is Left Bower
        const trick: Card[] = [nineHearts, Jdiamonds];
        expect(determineWinner(trick, trump)).toBe(1); // Jack of Diamonds
    });

    it('Right Bower wins if only Bower and lower trump are played', () => {
        const trump: Suit = 'hearts'; // Jack of Hearts is Right Bower
        const trick: Card[] = [nineHearts, jackHearts];
        expect(determineWinner(trick, trump)).toBe(1); // Jack of Hearts
    });
  });
  
  describe('getBestPlay', () => {
    const P1Hand: Card[] = [
      { id: '9-H', rank: '9', suit: 'hearts' },
      { id: 'J-D', rank: 'J', suit: 'diamonds' }, // Left Bower if H is trump, regular J if D is trump
      { id: 'A-S', rank: 'A', suit: 'spades' },
      { id: 'K-C', rank: 'K', suit: 'clubs' },
      { id: '10-H', rank: '10', suit: 'hearts' },
    ];

    it('when leading: should pick a high-value card (e.g., Right Bower, then Left, then high trump, then off-suit Ace)', () => {
      const trick: Card[] = [];
      // Scenario 1: Has Right Bower
      let hand1 = [{ id: 'J-H', rank: 'J', suit: 'hearts' }, { id: '9-C', rank: '9', suit: 'clubs' }];
      expect(getBestPlay(hand1, trick, 'hearts').id).toBe('J-H');
      
      // Scenario 2: Has Left Bower (no Right)
      let hand2 = [{ id: 'J-D', rank: 'J', suit: 'diamonds' }, { id: '9-C', rank: '9', suit: 'clubs' }];
      expect(getBestPlay(hand2, trick, 'hearts').id).toBe('J-D');

      // Scenario 3: Has high trump (no Bowers)
      let hand3 = [{ id: 'A-H', rank: 'A', suit: 'hearts' }, { id: '9-C', rank: '9', suit: 'clubs' }];
      expect(getBestPlay(hand3, trick, 'hearts').id).toBe('A-H');
      
      // Scenario 4: Has off-suit Ace (no trump)
      let hand4 = [{ id: 'A-S', rank: 'A', suit: 'spades' }, { id: '9-C', rank: '9', suit: 'clubs' }];
      expect(getBestPlay(hand4, trick, 'hearts').id).toBe('A-S');

       // Scenario 5: Default to highest card if no specific strategy fits (as per current getBestPlay leading logic)
      let hand5 = [{ id: 'Q-S', rank: 'Q', suit: 'spades' }, { id: '9-C', rank: '9', suit: 'clubs' }];
      expect(getBestPlay(hand5, trick, 'hearts').id).toBe('Q-S');
    });

    it('when following suit and can win: should pick the lowest winning card', () => {
      const trump: Suit = 'clubs';
      const trick: Card[] = [{ id: '9-H', rank: '9', suit: 'hearts' }]; // Hearts led
      // Hand has 10H (wins, lower) and AH (wins, higher)
      const hand: Card[] = [
        { id: '10-H', rank: '10', suit: 'hearts' }, 
        { id: 'A-H', rank: 'A', suit: 'hearts' },
        { id: '9-S', rank: '9', suit: 'spades' }
      ];
      expect(getBestPlay(hand, trick, trump).id).toBe('10-H');
    });

    it('when following suit and cannot win: should pick the lowest card of that suit', () => {
      const trump: Suit = 'clubs';
      const trick: Card[] = [{ id: 'A-H', rank: 'A', suit: 'hearts' }]; // Ace of Hearts led
      // Hand has 9H and 10H, neither can win
      const hand: Card[] = [
        { id: '10-H', rank: '10', suit: 'hearts' }, 
        { id: '9-H', rank: '9', suit: 'hearts' },
        { id: '9-S', rank: '9', suit: 'spades' }
      ];
      expect(getBestPlay(hand, trick, trump).id).toBe('9-H');
    });

    it('when not following suit and can trump to win: should pick the lowest trump to win', () => {
      const trump: Suit = 'spades'; // Spades is trump
      const trick: Card[] = [{ id: 'A-H', rank: 'A', suit: 'hearts' }]; // Hearts led
      // Hand has 9S (wins, lower trump) and AS (wins, higher trump), no Hearts
      const hand: Card[] = [
        { id: '9-S', rank: '9', suit: 'spades' }, 
        { id: 'A-S', rank: 'A', suit: 'spades' },
        { id: 'K-D', rank: 'K', suit: 'diamonds' }
      ];
      expect(getBestPlay(hand, trick, trump).id).toBe('9-S');
    });
    
    it('when not following suit, partner not winning, cannot win by trumping (e.g. higher trump already played): should discard low off-suit', () => {
      const trump: Suit = 'spades'; // Spades is trump
      // KS is current winning card in trick
      const trick: Card[] = [{ id: 'A-H', rank: 'A', suit: 'hearts' }, { id: 'K-S', rank: 'K', suit: 'spades' }];
      // Hand has 9S (cannot beat KS), and some off-suit cards
      const hand: Card[] = [
        { id: '9-S', rank: '9', suit: 'spades' }, 
        { id: '10-D', rank: '10', suit: 'diamonds' }, // discard this
        { id: 'Q-C', rank: 'Q', suit: 'clubs' }
      ];
      // The logic in getBestPlay for this case:
      // "Play lowest non-trump card to save trump, or lowest trump if only trumps available."
      expect(getBestPlay(hand, trick, trump, undefined, false).id).toBe('10-D');

      const handOnlyTrump: Card[] = [ { id: '9-S', rank: '9', suit: 'spades' }, {id: '10-S', rank: '10', suit: 'spades'} ];
      expect(getBestPlay(handOnlyTrump, trick, trump, undefined, false).id).toBe('9-S'); // play lowest trump
    });

    it('when partner is winning and player is last: should discard lowest card', () => {
        const trump: Suit = 'spades';
        const trick: Card[] = [
            { id: 'A-H', rank: 'A', suit: 'hearts' }, // Player 0 (lead)
            { id: '9-D', rank: '9', suit: 'diamonds' }, // Player 1
            { id: 'K-H', rank: 'K', suit: 'hearts' }  // Player 2 (partner, currently winning with KH as H is not trump)
        ];
        // Player 3's hand (current player)
        const hand: Card[] = [
            { id: 'J-S', rank: 'J', suit: 'spades' }, // Right Bower
            { id: '10-C', rank: '10', suit: 'clubs' }, // Lowest card
            { id: 'Q-D', rank: 'Q', suit: 'diamonds' }
        ];
        // Partner (P2) is winning with KH because H is not trump, and trick[0] (AH) is the card to beat for that suit.
        // Actually, the current winning card is KH.
        // The logic for partnerIsWinning should make it play 10C.
        expect(getBestPlay(hand, trick, trump, [5], true).id).toBe('10-C');
    });
  });
});
