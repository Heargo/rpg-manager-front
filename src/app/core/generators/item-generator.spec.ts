import { baseItemVocabulary } from '../../../testing/base-vocabulary';
import { EQUIPMENT_SLOTS, ITEM_RARITIES, ITEM_TYPES } from '../models/item';
import { PooledSource } from '../packs/pooled-domain';
import { CONSUMABLE_VALUE_MULTIPLIER, generateItem, RARITY_RULES } from './item-generator';
import { buildItemVocabulary } from './item-vocabulary';
import { seededRandomSource } from './random-source';

const attributes = ['Strength', 'Agility', 'Life', 'Mana', 'Charisma'];
const gradient = (from: string, to: string) => [
  { position: 0, color: from },
  { position: 1, color: to },
];

const KINDS = {
  equipment: { type: 'equipment' as const },
  weapon: { parent: 'equipment', slot: 'weapon1' as const },
  sword: { parent: 'weapon' },
  foot: { parent: 'equipment', slot: 'foot' as const },
  boots: { parent: 'foot' },
  hand: { parent: 'equipment', slot: 'hand' as const },
  glove: { parent: 'hand' },
  ring: { parent: 'equipment', slot: 'ring' as const },
  item: { type: 'item' as const },
  key: { parent: 'item' },
  consumable: { type: 'consumable' as const },
  potion: { parent: 'consumable' },
};

const TEXTS = {
  version: 2,
  kinds: {
    weapon: { descriptions: ['Une arme.'] },
    sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
    boots: {
      nouns: [{ text: 'Bottes', gender: 'f', plural: true }],
      descriptions: ['{g:Il|Elle|Ils|Elles} sont solides.'],
    },
    glove: { nouns: [{ text: 'Gants', gender: 'm', plural: true }] },
    key: {
      nouns: [{ text: 'Clé', gender: 'f' }],
      descriptions: ['{g:Il|Elle} ouvre une porte, forgée par {maker}.'],
    },
    potion: { nouns: [{ text: 'Potion', gender: 'f' }], names: { common: ['{base} de {effect}'] } },
  },
  tints: {
    fire: {
      adjectives: { rare: [{ m: 'ardent', f: 'ardente' }], legendary: [{ m: 'ardent', f: 'ardente' }] },
      descriptions: ['Tiède.'],
    },
    frost: { suffixes: { legendary: ['du givre'] } },
  },
  adjectives: {
    common: [{ m: 'usé', f: 'usée' }],
    uncommon: [{ m: 'beau', f: 'belle', mp: 'beaux', fp: 'belles' }],
    mythic: [{ m: 'gris', f: 'grise' }],
  },
  templates: {
    common: ['{base} {adjective}'],
    uncommon: ['{base} {adjective}'],
    rare: ['{base} {adjective}'],
    mythic: ['{base} {adjective}'],
    legendary: ['{base} {adjective} {suffix}'],
  },
};

const source = (over: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: KINDS,
  texts: TEXTS,
  tints: { fire: { gradient: gradient('#5a0a0a', '#fde047') }, frost: { gradient: gradient('#000000', '#ffffff') } },
  params: { maker: ['un forgeron'], effect: ['vigueur'] },
  ...over,
});

const fixture = buildItemVocabulary([source()]);
const draw = (seed: string, options: Partial<Parameters<typeof generateItem>[2]> = {}, vocabulary = fixture) =>
  generateItem(seededRandomSource(seed), vocabulary, { attributes, ...options });
const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

describe('generateItem on a fixture vocabulary', () => {
  it('gives the same item for the same seed', () => {
    expect(draw('reroll-42')).toEqual(draw('reroll-42'));
  });

  it('draws a kind whose type and slot are the item type and slot, with a noun of that kind in the name', () => {
    for (const seed of seeds(80)) {
      const item = draw(seed, { rarity: 'rare' });
      const kind = fixture.kind(item.kind!)!;
      expect(kind.type).toBe(item.type);
      expect(kind.slot).toBe(item.slot);
      const nouns = fixture.nouns(item.kind!).map((n) => n.text.toLowerCase());
      expect(nouns.some((noun) => item.name.toLowerCase().includes(noun))).toBe(true);
    }
  });

  it('draws the slot among the slots that have a drawable kind', () => {
    const slots = new Set(seeds(80).map((seed) => draw(seed, { type: 'equipment' }).slot));
    expect(slots).toEqual(new Set(['weapon1', 'foot', 'hand']));
  });

  it('honours a fixed rarity, type and slot, and draws a kind of that slot', () => {
    const item = draw('fixed', { rarity: 'mythic', type: 'equipment', slot: 'foot' });
    expect(item).toMatchObject({ rarity: 'mythic', type: 'equipment', slot: 'foot', kind: 'boots' });
  });

  it('treats a slot without a type as equipment, and ignores the slot for other types', () => {
    expect(draw('a', { slot: 'weapon1' })).toMatchObject({ type: 'equipment', slot: 'weapon1', kind: 'sword' });
    expect(draw('a', { type: 'consumable', slot: 'head' })).toMatchObject({ slot: 'none', kind: 'potion' });
  });

  it('falls back to any drawable kind of the type when the slot has none', () => {
    const item = draw('fb', { type: 'equipment', slot: 'ring' });
    expect(item.type).toBe('equipment');
    expect(['sword', 'boots', 'glove']).toContain(item.kind);
    expect(item.slot).toBe(fixture.kind(item.kind!)!.slot);
  });

  it('falls back to any drawable kind when the type has none', () => {
    const swordOnly = buildItemVocabulary([
      source({
        kinds: { equipment: { type: 'equipment' }, weapon: { parent: 'equipment', slot: 'weapon1' }, sword: { parent: 'weapon' } },
        texts: { version: 2, kinds: { sword: { nouns: [{ text: 'Épée', gender: 'f' }] } }, templates: { common: ['{base}'] } },
      }),
    ]);
    expect(draw('any', { type: 'item', rarity: 'common' }, swordOnly)).toMatchObject({ kind: 'sword', type: 'equipment' });
  });

  it('builds the name on the kind names first, with the pooled params', () => {
    expect(draw('n', { type: 'consumable', rarity: 'common' }).name).toBe('Potion de vigueur');
  });

  it('builds the name on the language template when the kind has none', () => {
    expect(draw('t', { slot: 'weapon1', rarity: 'common' }).name).toBe('Épée usée');
  });

  it('uses {base} alone when no template is given', () => {
    const bare = buildItemVocabulary([source({ texts: { ...TEXTS, templates: undefined } as never })]);
    expect(draw('b', { slot: 'weapon1', rarity: 'rare' }, bare).name).toBe('Épée');
  });

  it('keeps the tint of the adjective, then of the suffix, on the item', () => {
    const rare = draw('r', { slot: 'weapon1', rarity: 'rare' });
    expect(rare.name).toBe('Épée ardente');
    expect(rare.tints).toEqual(['fire']);
    const legendary = draw('l', { slot: 'weapon1', rarity: 'legendary' });
    expect(legendary.name).toBe('Épée ardente du givre');
    expect(legendary.tints).toEqual(['fire', 'frost']);
  });

  it('has no tint for an untinted adjective', () => {
    expect(draw('u', { slot: 'weapon1', rarity: 'common' }).tints ?? []).toEqual([]);
  });

  it('draws the description from the nearest level of the kind chain plus the tint', () => {
    const descriptions = new Set(seeds(60).map((seed) => draw(seed, { slot: 'weapon1', rarity: 'rare' }).description));
    expect(descriptions).toEqual(new Set(['Une arme.', 'Tiède.']));
    const plain = new Set(seeds(30).map((seed) => draw(seed, { slot: 'weapon1', rarity: 'common' }).description));
    expect(plain).toEqual(new Set(['Une arme.']));
  });

  it('expands description params and agrees them with the noun gender', () => {
    expect(draw('k', { type: 'item', rarity: 'common' }).description).toBe('Elle ouvre une porte, forgée par un forgeron.');
  });

  it('does not give a kind description to another kind', () => {
    const potion = draw('p', { type: 'consumable', rarity: 'common' });
    expect(potion.description).toBe('');
  });

  it('agrees a plural noun and its adjective, in the plural gender', () => {
    expect(draw('pl1', { slot: 'foot', rarity: 'rare' }).name).toBe('Bottes ardentes');
    expect(draw('pl2', { slot: 'hand', rarity: 'common' }).name).toBe('Gants usés');
    expect(draw('pl3', { slot: 'foot', rarity: 'common' }).name).toBe('Bottes usées');
  });

  it('uses the irregular plural forms of an adjective, and keeps a plural that already ends in s', () => {
    expect(draw('i1', { slot: 'hand', rarity: 'uncommon' }).name).toBe('Gants beaux');
    expect(draw('i2', { slot: 'foot', rarity: 'uncommon' }).name).toBe('Bottes belles');
    expect(draw('i3', { slot: 'weapon1', rarity: 'uncommon' }).name).toBe('Épée belle');
    expect(draw('i4', { slot: 'hand', rarity: 'mythic' }).name).toBe('Gants gris');
    expect(draw('i5', { slot: 'foot', rarity: 'mythic' }).name).toBe('Bottes grises');
  });

  it('agrees the plural in the description', () => {
    expect(draw('d', { slot: 'foot', rarity: 'common' }).description).toBe('Elles sont solides.');
  });

  it('leaves the description empty when no phrase expands, and skips those that cannot', () => {
    const texts = (descriptions: string[]) =>
      buildItemVocabulary([
        source({
          kinds: { consumable: { type: 'consumable' }, potion: { parent: 'consumable' } },
          texts: { version: 2, kinds: { potion: { nouns: [{ text: 'Potion' }], descriptions } }, templates: { common: ['{base}'] } },
        }),
      ]);
    expect(draw('e1', { rarity: 'common' }, texts(['Un {nothing}.'])).description).toBe('');
    for (const seed of seeds(20))
      expect(draw(seed, { rarity: 'common' }, texts(['Un {nothing}.', 'Fine.'])).description).toBe('Fine.');
  });

  it('draws modifiers within the rarity rules, on distinct world attributes', () => {
    for (const rarity of ITEM_RARITIES) {
      for (const seed of seeds(30, rarity)) {
        const item = draw(seed, { rarity, type: 'equipment' });
        const [minCount, maxCount] = RARITY_RULES[rarity].modifierCount;
        const [minValue, maxValue] = RARITY_RULES[rarity].modifierValue;
        expect(item.modifiers.length).toBeGreaterThanOrEqual(minCount);
        expect(item.modifiers.length).toBeLessThanOrEqual(maxCount);
        expect(new Set(item.modifiers.map((m) => m.attribute)).size).toBe(item.modifiers.length);
        for (const modifier of item.modifiers) {
          expect(attributes).toContain(modifier.attribute);
          expect(modifier.value).toBeGreaterThanOrEqual(minValue);
          expect(modifier.value).toBeLessThanOrEqual(maxValue);
        }
      }
    }
  });

  it('makes consumables stronger and gives plain items no modifiers', () => {
    expect(draw('p', { rarity: 'common', type: 'consumable' }).modifiers[0].value % CONSUMABLE_VALUE_MULTIPLIER).toBe(0);
    expect(draw('k', { type: 'item' }).modifiers).toEqual([]);
  });

  it('has no modifiers when the world has no attributes', () => {
    expect(draw('x', { attributes: [], rarity: 'legendary', type: 'equipment' }).modifiers).toEqual([]);
  });

  it('prices higher rarities higher', () => {
    const median = (rarity: (typeof ITEM_RARITIES)[number]) =>
      seeds(41, rarity)
        .map((seed) => draw(seed, { rarity, type: 'equipment' }).price)
        .sort((a, b) => a - b)[20];
    const medians = ITEM_RARITIES.map(median);
    expect([...medians].sort((a, b) => a - b)).toEqual(medians);
  });
});

describe.each(['fr', 'en'] as const)('generateItem on the Base %s', (lang) => {
  const base = baseItemVocabulary(lang);

  it('gives the same item for the same seed', () => {
    expect(draw('reroll-42', {}, base)).toEqual(draw('reroll-42', {}, base));
  });

  it('draws a kind coherent with the type and slot, and named after one of its nouns', () => {
    for (const seed of seeds(120, lang)) {
      const item = draw(seed, {}, base);
      const kind = base.kind(item.kind!)!;
      expect(kind.type).toBe(item.type);
      expect(kind.slot).toBe(item.slot);
      const nouns = base.nouns(item.kind!).map((n) => n.text.toLowerCase());
      expect(nouns.some((noun) => item.name.toLowerCase().includes(noun))).toBe(true);
    }
  });

  it('produces a complete draft for every rarity, type and slot', () => {
    let n = 0;
    for (const rarity of ITEM_RARITIES) {
      for (const type of ITEM_TYPES) {
        const slots = type === 'equipment' ? EQUIPMENT_SLOTS : [undefined];
        for (const slot of slots) {
          const item = draw(`all-${n++}`, { rarity, type, slot }, base);
          expect(item.kind).toBeTruthy();
          expect(item.name.length).toBeGreaterThan(0);
          expect(item.description.length).toBeGreaterThan(0);
          expect(item.slot).toBe(slot ?? 'none');
          expect(item.price % 500).toBe(0);
        }
      }
    }
  });

  it('keeps tints only from drawn tinted words, all known to the vocabulary', () => {
    for (const seed of seeds(80, `t${lang}`)) {
      const item = draw(seed, { rarity: 'legendary' }, base);
      for (const tint of item.tints ?? []) expect(base.tints()).toContain(tint);
    }
  });
});

describe('generateItem on the Base fr wording', () => {
  const base = baseItemVocabulary('fr');

  it('puts plural nouns with plural adjectives', () => {
    let boots = 0;
    let gloves = 0;
    for (const seed of seeds(300, 'plural')) {
      const item = draw(seed, { type: 'equipment', rarity: 'common' }, base);
      if (item.kind === 'boots') {
        boots++;
        expect(item.name).toMatch(/^Bottes( (usées|simples|rapiécées|robustes|ordinaires))?$/);
      }
      if (item.kind === 'glove') {
        gloves++;
        expect(item.name).toMatch(/^Gants( (usés|simples|rapiécés|robustes|ordinaires))?$/);
      }
    }
    expect(boots).toBeGreaterThan(0);
    expect(gloves).toBeGreaterThan(0);
  });

  it('only gives a key description to a key', () => {
    let keys = 0;
    for (const seed of seeds(300, 'keys')) {
      const item = draw(seed, { type: 'item' }, base);
      if (item.kind === 'key') keys++;
      else expect(item.description).not.toContain('Elle ouvre');
    }
    expect(keys).toBeGreaterThan(0);
  });
});
