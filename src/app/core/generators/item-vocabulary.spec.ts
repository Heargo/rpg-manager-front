import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import frItems from '../../../../public/packs/base-fr/generators/items.json';
import { baseManifest } from '../../../testing/base-pack';
import { PooledSource } from '../packs/pooled-domain';
import { buildItemVocabulary } from './item-vocabulary';

const gradient = [
  { position: 0, color: '#5a0a0a' },
  { position: 1, color: '#fde047' },
];

const KINDS = {
  equipment: { type: 'equipment' as const },
  weapon: { parent: 'equipment', slot: 'weapon1' as const },
  sword: { parent: 'weapon' },
  rapier: { parent: 'sword' },
  shield: { parent: 'equipment', slot: 'weapon2' as const },
  chest: { parent: 'equipment', slot: 'chest' as const },
  coat: { parent: 'chest' },
  chainmail: { parent: 'chest' },
  hat: { parent: 'equipment', slot: 'head' as const },
  consumable: { type: 'consumable' as const },
  potion: { parent: 'consumable' },
  elixir: { parent: 'potion' },
};

const TEXTS = {
  version: 2,
  kinds: {
    weapon: { descriptions: ['Une arme.'] },
    sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
    rapier: { descriptions: ['Fine.'] },
    shield: { nouns: [{ text: 'Bouclier' }] },
    coat: { nouns: [{ text: 'Cotte' }] },
    chainmail: { nouns: [{ text: 'Cotte de mailles' }] },
    hat: { nouns: [{ text: 'Chapeau' }] },
    potion: { nouns: [{ text: 'Potion' }], names: { common: ['{base} de {effect}'] } },
  },
  tints: {
    fire: {
      adjectives: { rare: [{ m: 'ardent', f: 'ardente' }] },
      suffixes: { rare: ['des braises'] },
      descriptions: ['Tiède.'],
    },
  },
  adjectives: { rare: ['usé'] },
  suffixes: { rare: ['de vigueur'] },
  templates: { common: ['{base}'] },
};

const source = (extra: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: KINDS,
  texts: TEXTS,
  tints: { fire: { gradient } },
  params: { maker: ['un forgeron'] },
  ...extra,
});

describe('ItemVocabulary on pooled fixtures', () => {
  const vocabulary = buildItemVocabulary([source()]);

  it('gives the type, slot and chain of a kind', () => {
    expect(vocabulary.kind('rapier')).toEqual({
      id: 'rapier',
      type: 'equipment',
      slot: 'weapon1',
      chain: ['rapier', 'sword', 'weapon', 'equipment'],
    });
    expect(vocabulary.kind('elixir')).toMatchObject({ type: 'consumable', slot: 'none' });
    expect(vocabulary.kind('unknown')).toBeUndefined();
  });

  it('gives the nouns of the nearest level of the chain that has some', () => {
    expect(vocabulary.nouns('rapier')).toEqual([{ text: 'Épée', gender: 'f' }]);
    expect(vocabulary.nouns('elixir')).toEqual([{ text: 'Potion' }]);
    expect(vocabulary.nouns('weapon')).toEqual([]);
  });

  it('gives the descriptions of the nearest level that has some', () => {
    expect(vocabulary.descriptions('rapier')).toEqual(['Fine.']);
    expect(vocabulary.descriptions('sword')).toEqual(['Une arme.']);
    expect(vocabulary.descriptions('potion')).toEqual([]);
  });

  it('gives the names of the nearest level that has some for the rarity', () => {
    expect(vocabulary.names('potion', 'common')).toEqual(['{base} de {effect}']);
    expect(vocabulary.names('elixir', 'common')).toEqual(['{base} de {effect}']);
    expect(vocabulary.names('elixir', 'rare')).toEqual([]);
    expect(vocabulary.names('sword', 'common')).toEqual([]);
  });

  it('lists the drawable kinds, those whose chain gives a noun, filtered by type and slot', () => {
    const ids = (filter?: Parameters<typeof vocabulary.drawable>[0]) => [...vocabulary.drawable(filter)].sort();

    expect(ids({ type: 'consumable' })).toEqual(['elixir', 'potion']);
    expect(ids({ slot: 'weapon1' })).toEqual(['rapier', 'sword']);
    expect(ids({ type: 'equipment', slot: 'weapon2' })).toEqual(['shield']);
    expect(ids()).toEqual(['chainmail', 'coat', 'elixir', 'hat', 'potion', 'rapier', 'shield', 'sword']);
  });

  it('finds the kind for a noun inside a name, ignoring case, accents and plural', () => {
    expect(vocabulary.kindForName('Épée de feu')).toBe('sword');
    expect(vocabulary.kindForName('vieilles EPEES')).toBe('sword');
    expect(vocabulary.kindForName('Potions de soin')).toBe('potion');
    expect(vocabulary.kindForName('Chapeaux pointus')).toBe('hat');
    expect(vocabulary.kindForName('Hache rouillée')).toBeUndefined();
  });

  it('prefers the longest noun that matches', () => {
    expect(vocabulary.kindForName('Cotte de mailles runique')).toBe('chainmail');
    expect(vocabulary.kindForName('Cotte rouge')).toBe('coat');
  });

  it('gives untinted and tinted adjectives together', () => {
    const adjectives = vocabulary.adjectives('rare');

    expect(adjectives).toHaveLength(2);
    expect(adjectives).toContainEqual({ value: 'usé' });
    expect(adjectives).toContainEqual({ value: { m: 'ardent', f: 'ardente' }, tint: 'fire' });
    expect(vocabulary.adjectives('common')).toEqual([]);
  });

  it('gives untinted and tinted suffixes together', () => {
    const suffixes = vocabulary.suffixes('rare');

    expect(suffixes).toHaveLength(2);
    expect(suffixes).toContainEqual({ value: 'de vigueur' });
    expect(suffixes).toContainEqual({ value: 'des braises', tint: 'fire' });
  });

  it('gives the tints, their descriptions and their gradients', () => {
    expect(vocabulary.tints()).toEqual(['fire']);
    expect(vocabulary.tintDescriptions('fire')).toEqual(['Tiède.']);
    expect(vocabulary.tintDescriptions('ice')).toEqual([]);
    expect(vocabulary.gradients('fire')).toEqual([gradient]);
  });

  it('gives the pooled params, templates and conflicts', () => {
    const pooled = buildItemVocabulary([
      source(),
      source({
        packId: 'extra',
        isBase: false,
        kinds: { sword: { parent: 'consumable' } },
        texts: { version: 2, templates: { common: ['{base} {adjective}'] } },
        params: { maker: ['une naine'] },
      }),
    ]);

    expect(pooled.params['maker']).toEqual(['un forgeron', 'une naine']);
    expect(pooled.templates('common')).toEqual(['{base}', '{base} {adjective}']);
    expect(pooled.conflicts).toHaveLength(1);
    expect(pooled.conflicts[0]).toContain('sword');
  });
});

describe('ItemVocabulary on the real Base FR', () => {
  const manifest = baseManifest('base-fr');
  const vocabulary = buildItemVocabulary([
    {
      packId: 'base-fr',
      isBase: true,
      language: 'fr',
      kinds: manifest.domains.items.kinds as PooledSource['kinds'],
      texts: frItems,
      tints: manifest.tints as PooledSource['tints'],
      params: frCommon.params,
    },
  ]);

  it('has no conflict', () => {
    expect(vocabulary.conflicts).toEqual([]);
  });

  it('resolves a sword up to its weapon slot', () => {
    expect(vocabulary.kind('sword')).toMatchObject({ type: 'equipment', slot: 'weapon1' });
    expect(vocabulary.nouns('sword').map((n) => n.text)).toEqual(['Épée']);
  });

  it('finds kinds from hand-typed names', () => {
    expect(vocabulary.kindForName('Cotte de mailles ancienne')).toBe('chainmail');
    expect(vocabulary.kindForName('Épées jumelles')).toBe('sword');
  });

  it('draws weapons from the weapon slot and not from bare roots', () => {
    const weapons = vocabulary.drawable({ slot: 'weapon1' });

    expect(weapons).toContain('sword');
    expect(vocabulary.drawable({ type: 'consumable' })).toContain('potion');
    expect(vocabulary.drawable()).not.toContain('equipment');
  });

  it('gives the templates, tinted words and tint texts of the Base', () => {
    expect(vocabulary.templates('common')).toEqual(['{base} {adjective}', '{base}']);
    expect(vocabulary.adjectives('rare')).toContainEqual({ value: { m: 'ardent', f: 'ardente' }, tint: 'fire' });
    expect(vocabulary.suffixes('rare')).toContainEqual({ value: 'des braises', tint: 'fire' });
    expect(vocabulary.tints()).toContain('rust');
    expect(vocabulary.tintDescriptions('ice')).toEqual(['Un givre léger ne fond jamais tout à fait.']);
    expect(vocabulary.names('potion', 'common')).toEqual(['{base} de {effect}']);
    expect(vocabulary.params['maker'].length).toBeGreaterThan(0);
  });
});
