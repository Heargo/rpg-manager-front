import { baseItemVocabulary } from '../../../testing/base-vocabulary';
import { PooledSource } from '../packs/pooled-domain';
import { buildItemVocabulary as build } from './item-vocabulary';

// Typed loosely: the kind-aware signatures do not exist yet.
interface Wide {
  adjectives(rarity: string, kind: string): { value: unknown; tint?: string }[];
  suffixes(rarity: string, kind: string): { value: unknown; tint?: string }[];
  tintDescriptions(tint: string, kind: string): string[];
}
const buildItemVocabulary = (sources: PooledSource[]): Wide => build(sources) as unknown as Wide;

const gradient = [
  { position: 0, color: '#000000' },
  { position: 1, color: '#ffffff' },
];

const KINDS = {
  equipment: { type: 'equipment' as const },
  weapon: { parent: 'equipment', slot: 'weapon1' as const },
  sword: { parent: 'weapon' },
  rapier: { parent: 'sword' },
  head: { parent: 'equipment', slot: 'head' as const },
  hood: { parent: 'head' },
  consumable: { type: 'consumable' as const },
  potion: { parent: 'consumable' },
};

const TEXTS = {
  version: 2,
  kinds: {
    equipment: { adjectives: { rare: [{ m: 'porté', f: 'portée' }] } },
    weapon: {
      adjectives: { rare: [{ m: 'affûté', f: 'affûtée' }] },
      suffixes: { rare: ['du boucher'] },
    },
    sword: {
      adjectives: {
        rare: [
          { m: 'équilibré', f: 'équilibrée' },
          { m: 'rouillé', f: 'rouillée', tint: 'rust' },
          { text: 'en acier', tint: 'steel' },
        ],
      },
      suffixes: { rare: [{ text: 'du duel', tint: 'steel' }] },
    },
    rapier: { adjectives: { rare: [{ m: 'fin', f: 'fine' }] } },
    hood: { adjectives: { rare: [{ m: 'cousu', f: 'cousue' }] } },
  },
  tints: {
    rust: {
      adjectives: { rare: [{ m: 'oxydé', f: 'oxydée' }] },
      suffixes: { rare: ['des ruines'] },
      descriptions: ['Rongée par le temps.'],
    },
    fire: { adjectives: { rare: [{ m: 'ardent', f: 'ardente' }] }, descriptions: ['Tiède.'] },
  },
  adjectives: { rare: ['simple'] },
  suffixes: { rare: ['de vigueur'] },
};

const source = (over: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: KINDS,
  texts: TEXTS,
  tints: {
    rust: { gradient, fits: ['weapon'] },
    steel: { gradient, fits: ['weapon'] },
    fire: { gradient },
  } as PooledSource['tints'],
  ...over,
});

const vocabulary = buildItemVocabulary([source()]);
const values = (list: { value: unknown }[]) => list.map((entry) => entry.value);

describe('ItemVocabulary kind-aware words', () => {
  it('adds up the adjectives along the chain and the top-level ones', () => {
    const adjectives = values(vocabulary.adjectives('rare', 'rapier'));

    expect(adjectives).toContainEqual({ m: 'fin', f: 'fine' });
    expect(adjectives).toContainEqual({ m: 'équilibré', f: 'équilibrée' });
    expect(adjectives).toContainEqual({ m: 'affûté', f: 'affûtée' });
    expect(adjectives).toContainEqual({ m: 'porté', f: 'portée' });
    expect(adjectives).toContain('simple');
  });

  it('does not give the words of a kind to another branch of the tree', () => {
    const adjectives = values(vocabulary.adjectives('rare', 'hood'));

    expect(adjectives).toContainEqual({ m: 'cousu', f: 'cousue' });
    expect(adjectives).toContainEqual({ m: 'porté', f: 'portée' });
    expect(adjectives).toContain('simple');
    expect(adjectives).not.toContainEqual({ m: 'affûté', f: 'affûtée' });
    expect(adjectives).not.toContainEqual({ m: 'fin', f: 'fine' });
  });

  it('gives only the top-level words to a kind whose chain has none', () => {
    expect(values(vocabulary.adjectives('rare', 'potion'))).toEqual(['simple', { m: 'ardent', f: 'ardente' }]);
    expect(values(vocabulary.suffixes('rare', 'potion'))).toEqual(['de vigueur']);
  });

  it('adds up the suffixes along the chain and the top-level ones', () => {
    const suffixes = values(vocabulary.suffixes('rare', 'rapier'));

    expect(suffixes).toContain('du boucher');
    expect(suffixes).toContain('de vigueur');
    expect(suffixes).toContain('du duel');
  });

  it('keeps the tint of a tinted kind word, in its object or string form', () => {
    const adjectives = vocabulary.adjectives('rare', 'sword');

    expect(adjectives).toContainEqual({ value: { m: 'rouillé', f: 'rouillée' }, tint: 'rust' });
    expect(adjectives).toContainEqual({ value: 'en acier', tint: 'steel' });
    expect(adjectives).toContainEqual({ value: { m: 'équilibré', f: 'équilibrée' } });
    expect(vocabulary.suffixes('rare', 'sword')).toContainEqual({ value: 'du duel', tint: 'steel' });
  });

  it('gives the tinted words only to a kind the tint fits', () => {
    const forSword = vocabulary.adjectives('rare', 'sword');
    const forHood = vocabulary.adjectives('rare', 'hood');

    expect(forSword).toContainEqual({ value: { m: 'oxydé', f: 'oxydée' }, tint: 'rust' });
    expect(forHood.some((entry) => entry.tint === 'rust')).toBe(false);
    // a tint without fits fits any kind, and a rarity without words gives nothing
    expect(forHood).toContainEqual({ value: { m: 'ardent', f: 'ardente' }, tint: 'fire' });
    expect(forSword).toContainEqual({ value: { m: 'ardent', f: 'ardente' }, tint: 'fire' });
    expect(vocabulary.adjectives('common', 'sword')).toEqual([]);
    expect(vocabulary.suffixes('common', 'sword')).toEqual([]);
    expect(vocabulary.suffixes('rare', 'sword')).toContainEqual({ value: 'des ruines', tint: 'rust' });
    expect(vocabulary.suffixes('rare', 'hood').some((entry) => entry.tint === 'rust')).toBe(false);
  });

  it('drops a tinted kind word when its tint does not fit the kind', () => {
    const narrow = buildItemVocabulary([
      source({ tints: { rust: { gradient, fits: ['shield'] }, steel: { gradient } } as PooledSource['tints'] }),
    ]);

    expect(narrow.adjectives('rare', 'sword').some((entry) => entry.tint === 'rust')).toBe(false);
    expect(narrow.adjectives('rare', 'sword')).toContainEqual({ value: 'en acier', tint: 'steel' });
  });

  it('fits a kind through any level of its chain', () => {
    expect(vocabulary.adjectives('rare', 'rapier').some((entry) => entry.tint === 'rust')).toBe(true);
    expect(vocabulary.adjectives('rare', 'weapon').some((entry) => entry.tint === 'rust')).toBe(true);
    expect(vocabulary.adjectives('rare', 'equipment').some((entry) => entry.tint === 'rust')).toBe(false);
  });

  it('pools the fits of a tint across packs as a union', () => {
    const pooled = buildItemVocabulary([
      source(),
      source({
        packId: 'extra',
        isBase: false,
        kinds: {},
        texts: { version: 2 },
        tints: { rust: { gradient, fits: ['head'] } } as PooledSource['tints'],
      }),
    ]);

    expect(pooled.adjectives('rare', 'hood').some((entry) => entry.tint === 'rust')).toBe(true);
    expect(pooled.adjectives('rare', 'sword').some((entry) => entry.tint === 'rust')).toBe(true);
    expect(pooled.adjectives('rare', 'potion').some((entry) => entry.tint === 'rust')).toBe(false);
  });

  it('gives the descriptions of a tint only for a kind it fits', () => {
    expect(vocabulary.tintDescriptions('rust', 'sword')).toEqual(['Rongée par le temps.']);
    expect(vocabulary.tintDescriptions('rust', 'hood')).toEqual([]);
    expect(vocabulary.tintDescriptions('fire', 'hood')).toEqual(['Tiède.']);
    expect(vocabulary.tintDescriptions('ice', 'sword')).toEqual([]);
  });
});

describe('ItemVocabulary on the real Base FR, words that fit', () => {
  const lookup = (kind: string) => {
    const base = (baseItemVocabulary('fr') as unknown as Wide);
    const all = [
      ...(['common', 'uncommon', 'rare', 'mythic', 'legendary'] as const).flatMap((r) => [
        ...base.adjectives(r, kind).map((e) => JSON.stringify(e.value)),
      ]),
    ];
    return all.join(' ');
  };

  it('gives "affûté" to a sword and not to a hood', () => {
    expect(lookup('sword')).toContain('affûté');
    expect(lookup('hood')).not.toContain('affûté');
    expect(lookup('scroll')).not.toContain('affûté');
  });

  it('keeps "rouillé" away from a scroll and "renforcé" away from an ointment', () => {
    expect(lookup('scroll')).not.toContain('rouillé');
    expect(lookup('ointment')).not.toContain('renforcé');
  });
});
