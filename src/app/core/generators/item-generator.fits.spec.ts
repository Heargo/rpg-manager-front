import { baseItemVocabulary } from '../../../testing/base-vocabulary';
import { PooledSource } from '../packs/pooled-domain';
import { generateItem } from './item-generator';
import { buildItemVocabulary } from './item-vocabulary';
import { seededRandomSource } from './random-source';

const attributes = ['Strength', 'Agility'];
const seeds = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const draw = (seed: string, vocabulary: ReturnType<typeof baseItemVocabulary>, options = {}) =>
  generateItem(seededRandomSource(seed), vocabulary, { attributes, ...options });

describe('generateItem on the Base fr, words that fit the item', () => {
  const base = baseItemVocabulary('fr');
  const items = seeds(4000, 'fit').map((seed) => draw(seed, base));
  const of = (...kinds: string[]) => items.filter((item) => kinds.includes(item.kind!));

  it('never gives a scroll or a parchment a rusty name', () => {
    const scrolls = of('scroll', 'scroll-case', 'letter', 'map');
    expect(scrolls.length).toBeGreaterThan(0);
    for (const item of scrolls) expect(item.name, item.name).not.toMatch(/rouillé/);
  });

  it('never gives a hood or a diadem a sharpened name', () => {
    const worn = of('hood', 'diadem');
    expect(worn.length).toBeGreaterThan(0);
    for (const item of worn) expect(item.name, item.name).not.toMatch(/affûté/);
    // …while a weapon still can, and the draw is deterministic.
    expect(items.filter((item) => item.slot === 'weapon1').some((item) => /affûté/.test(item.name))).toBe(true);
    expect(draw('fit-same', base)).toEqual(draw('fit-same', base));
  });

  it('never gives an ointment a reinforced name', () => {
    const ointments = of('ointment');
    expect(ointments.length).toBeGreaterThan(0);
    for (const item of ointments) expect(item.name, item.name).not.toMatch(/renforcé/);
  });

});

const gradient = [
  { position: 0, color: '#000000' },
  { position: 1, color: '#ffffff' },
];

const source = (fits?: string[]): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: {
    equipment: { type: 'equipment' },
    weapon: { parent: 'equipment', slot: 'weapon1' },
    sword: { parent: 'weapon' },
  },
  texts: {
    version: 2,
    kinds: {
      weapon: { descriptions: ['Une arme.', 'Une lame.', 'Un outil de guerre.'] },
      sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
    },
    tints: {
      fire: { adjectives: { rare: [{ m: 'ardent', f: 'ardente' }] }, descriptions: ['Tiède.'] },
    },
    templates: { rare: ['{base} {adjective}'] },
  },
  tints: { fire: fits ? { gradient, fits } : { gradient } } as PooledSource['tints'],
  params: {},
});

describe('generateItem tint descriptions', () => {
  const run = (fits?: string[]) => {
    const vocabulary = buildItemVocabulary([source(fits)]);
    return seeds(600, 'desc').map((seed) => draw(seed, vocabulary, { slot: 'weapon1', rarity: 'rare' }));
  };

  it('draws the tint description about one time in two, not in proportion to the pool size', () => {
    const items = run(['weapon']);
    expect(items.every((item) => item.tints?.includes('fire'))).toBe(true);
    const share = items.filter((item) => item.description === 'Tiède.').length / items.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
    expect(new Set(items.map((item) => item.description))).toEqual(
      new Set(['Tiède.', 'Une arme.', 'Une lame.', 'Un outil de guerre.']),
    );
    expect(run(['weapon'])).toEqual(items);
  });

  it('also draws it for a tint without fits', () => {
    const share = run().filter((item) => item.description === 'Tiède.').length / 600;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it('never draws it when the tint does not fit the kind', () => {
    const items = run(['shield']);
    expect(items.some((item) => item.description === 'Tiède.')).toBe(false);
    expect(items.some((item) => item.tints?.includes('fire'))).toBe(false);
  });
});
