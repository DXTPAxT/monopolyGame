import { describe, it, expect } from 'vitest';
import { CHANCE_CARDS } from '../src/game/cards/chance';
import { COMMUNITY_CARDS } from '../src/game/cards/community';
import { CardEffectKind } from '../src/game/types';

const ALL_CARDS = [...CHANCE_CARDS, ...COMMUNITY_CARDS];

const EXPECTED_KINDS: CardEffectKind[] = [
  'money',
  'moneyPerPlayer',
  'moveTo',
  'moveBy',
  'goToJail',
  'getOutOfJail',
  'repairs',
  'advanceToGo',
  'nearest'
];

describe('Card Data', () => {
  it('chance deck has exactly 16 cards', () => {
    expect(CHANCE_CARDS).toHaveLength(16);
  });

  it('community deck has exactly 16 cards', () => {
    expect(COMMUNITY_CARDS).toHaveLength(16);
  });

  it('every card has non-empty id', () => {
    ALL_CARDS.forEach(card => {
      expect(card.id).toBeTruthy();
      expect(card.id.length).toBeGreaterThan(0);
    });
  });

  it('every card has non-empty text', () => {
    ALL_CARDS.forEach(card => {
      expect(card.text).toBeTruthy();
      expect(card.text.length).toBeGreaterThan(0);
    });
  });

  it('every card has an effect with valid kind', () => {
    ALL_CARDS.forEach(card => {
      expect(card.effect).toBeDefined();
      expect(EXPECTED_KINDS).toContain(card.effect.kind);
    });
  });

  it('covers all effect kinds across both decks', () => {
    const foundKinds = new Set<CardEffectKind>();
    ALL_CARDS.forEach(card => {
      foundKinds.add(card.effect.kind);
    });

    EXPECTED_KINDS.forEach(kind => {
      expect(foundKinds).toContain(kind);
    });
  });

  it('money effects have amount field', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'money').forEach(card => {
      expect(card.effect.amount).toBeDefined();
      expect(typeof card.effect.amount).toBe('number');
    });
  });

  it('moneyPerPlayer effects have amount field', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'moneyPerPlayer').forEach(card => {
      expect(card.effect.amount).toBeDefined();
      expect(typeof card.effect.amount).toBe('number');
    });
  });

  it('moveTo effects have target field', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'moveTo').forEach(card => {
      expect(card.effect.target).toBeDefined();
      expect(typeof card.effect.target).toBe('number');
    });
  });

  it('moveBy effects have amount field', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'moveBy').forEach(card => {
      expect(card.effect.amount).toBeDefined();
      expect(typeof card.effect.amount).toBe('number');
    });
  });

  it('repairs effects have amount and perHotel fields', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'repairs').forEach(card => {
      expect(card.effect.amount).toBeDefined();
      expect(typeof card.effect.amount).toBe('number');
      expect(card.effect.perHotel).toBeDefined();
      expect(typeof card.effect.perHotel).toBe('number');
    });
  });

  it('nearest effects have nearest field', () => {
    ALL_CARDS.filter(c => c.effect.kind === 'nearest').forEach(card => {
      expect(card.effect.nearest).toBeDefined();
      expect(['railroad', 'utility']).toContain(card.effect.nearest);
    });
  });

  it('all card ids are unique', () => {
    const ids = ALL_CARDS.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('chance and community decks each have getOutOfJail card', () => {
    const chanceHasGetOutOfJail = CHANCE_CARDS.some(c => c.effect.kind === 'getOutOfJail');
    const communityHasGetOutOfJail = COMMUNITY_CARDS.some(c => c.effect.kind === 'getOutOfJail');
    expect(chanceHasGetOutOfJail).toBe(true);
    expect(communityHasGetOutOfJail).toBe(true);
  });
});
