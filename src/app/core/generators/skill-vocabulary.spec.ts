import { baseSkillVocabulary } from '../../../testing/base-skill-vocabulary';
import { PooledSource } from '../packs/pooled-domain';
import { buildSkillVocabulary } from './skill-vocabulary';

const KINDS = {
  attack: { type: 'active', effect: 'damage' },
  strike: { parent: 'attack' },
  hex: { parent: 'attack', effect: 'modify' },
  wild: { type: 'active' },
  trait: { type: 'passive' },
  toughness: { parent: 'trait' },
  silent: { parent: 'trait' },
};

const TEXTS = {
  version: 2,
  templates: ['{noun}', '{adjective} {noun}'],
  adjectives: ['Swift'],
  suffixes: ['Dawn'],
  kinds: {
    attack: { descriptions: ['A blow.'], adjectives: ['Fierce'], suffixes: ['Fury'] },
    strike: {
      nouns: [{ text: 'Strike' }, { text: 'Slash' }],
      descriptions: ['A strike.', 'A slash.'],
      adjectives: [{ m: 'Hard', f: 'Hard' }],
      names: ['{noun} of {suffix}'],
    },
    hex: { nouns: [{ text: 'Hex', gender: 'f' }] },
    wild: { nouns: [{ text: 'Surge' }] },
    trait: { descriptions: ['A trait.'] },
    toughness: { nouns: [{ text: 'Toughness', gender: 'f' }], suffixes: ['Iron'] },
  },
};

const source = (over: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-en',
  isBase: true,
  language: 'en',
  kinds: KINDS,
  texts: TEXTS,
  params: { place: ['the keep'] },
  ...over,
});

const vocabulary = buildSkillVocabulary([source()]);
const sorted = (list: string[]) => [...list].sort();

describe('buildSkillVocabulary kinds', () => {
  it('gives the type and the effect of a root, inherited by its children', () => {
    expect(vocabulary.kind('attack')).toMatchObject({ id: 'attack', type: 'active', effect: 'damage' });
    expect(vocabulary.kind('strike')).toMatchObject({ type: 'active', effect: 'damage' });
  });

  it('lets the nearest effect win', () => {
    expect(vocabulary.kind('hex')?.effect).toBe('modify');
  });

  it('gives an active chain without an effect no effect, and a passive chain none either', () => {
    expect(vocabulary.kind('wild')).toMatchObject({ type: 'active' });
    expect(vocabulary.kind('wild')?.effect).toBeUndefined();
    expect(vocabulary.kind('toughness')).toMatchObject({ type: 'passive' });
    expect(vocabulary.kind('toughness')?.effect).toBeUndefined();
  });

  it('gives the chain from the kind to its root', () => {
    expect(vocabulary.kind('strike')?.chain).toEqual(['strike', 'attack']);
  });

  it('does not know a kind that is not declared', () => {
    expect(vocabulary.kind('dragon')).toBeUndefined();
  });

  it('drops a root without a type, with its children, and reports it', () => {
    const dropped = buildSkillVocabulary([source({ kinds: { ...KINDS, spell: {}, bolt: { parent: 'spell' } } })]);
    expect(dropped.kind('spell')).toBeUndefined();
    expect(dropped.kind('bolt')).toBeUndefined();
    expect(dropped.conflicts.some((c) => c.includes('spell'))).toBe(true);
  });
});

describe('buildSkillVocabulary drawable kinds', () => {
  it('keeps the kinds that reach a noun on their chain, and no others', () => {
    expect(sorted(vocabulary.drawable())).toEqual(['hex', 'strike', 'toughness', 'wild']);
  });

  it('takes the noun of an ancestor', () => {
    const inherited = buildSkillVocabulary([
      source({ texts: { ...TEXTS, kinds: { ...TEXTS.kinds, trait: { nouns: [{ text: 'Trait' }] } } } }),
    ]);
    expect(inherited.drawable()).toContain('silent');
    expect(inherited.drawable()).toContain('trait');
  });

  it('draws nothing from a root without a type', () => {
    const dropped = buildSkillVocabulary([
      source({ kinds: { spell: {}, bolt: { parent: 'spell' } }, texts: { version: 2, kinds: { bolt: { nouns: [{ text: 'Bolt' }] } } } }),
    ]);
    expect(dropped.drawable()).toEqual([]);
  });
});

describe('buildSkillVocabulary texts', () => {
  it('takes the nouns and the descriptions of the nearest level that has some', () => {
    expect(vocabulary.nouns('strike')).toEqual([{ text: 'Strike' }, { text: 'Slash' }]);
    expect(vocabulary.nouns('attack')).toEqual([]);
    expect(vocabulary.descriptions('strike')).toEqual(['A strike.', 'A slash.']);
    expect(vocabulary.descriptions('hex')).toEqual(['A blow.']);
    expect(vocabulary.descriptions('toughness')).toEqual(['A trait.']);
  });

  it('gives the names of the nearest level that has some', () => {
    expect(vocabulary.names('strike')).toEqual(['{noun} of {suffix}']);
    expect(vocabulary.names('hex')).toEqual([]);
  });

  it('adds up the adjectives: the language ones and every level of the chain', () => {
    expect(vocabulary.adjectives('strike')).toHaveLength(3);
    expect(vocabulary.adjectives('strike')).toEqual(expect.arrayContaining(['Swift', 'Fierce', { m: 'Hard', f: 'Hard' }]));
    expect(vocabulary.adjectives('hex')).toEqual(expect.arrayContaining(['Swift', 'Fierce']));
    expect(vocabulary.adjectives('hex')).toHaveLength(2);
    expect(vocabulary.adjectives('wild')).toEqual(['Swift']);
  });

  it('adds up the suffixes: the language ones and every level of the chain', () => {
    expect(vocabulary.suffixes('strike')).toEqual(expect.arrayContaining(['Dawn', 'Fury']));
    expect(vocabulary.suffixes('strike')).toHaveLength(2);
    expect(vocabulary.suffixes('toughness')).toEqual(expect.arrayContaining(['Dawn', 'Iron']));
    expect(vocabulary.suffixes('toughness')).toHaveLength(2);
    expect(vocabulary.suffixes('wild')).toEqual(['Dawn']);
  });

  it('gives the templates and the params of the pool', () => {
    expect(vocabulary.templates()).toEqual(['{noun}', '{adjective} {noun}']);
    expect(vocabulary.params).toEqual({ place: ['the keep'] });
  });
});

describe('buildSkillVocabulary across packs', () => {
  const extra = (): PooledSource => ({
    packId: 'extra',
    isBase: false,
    language: 'en',
    kinds: { arrow: { parent: 'attack' }, cantrip: { type: 'passive' } },
    texts: {
      version: 2,
      templates: ['{noun} {suffix}'],
      adjectives: ['Grim'],
      suffixes: ['Night'],
      kinds: { arrow: { nouns: [{ text: 'Arrow' }] }, cantrip: { nouns: [{ text: 'Cantrip' }] } },
    },
    params: { place: ['the cave'] },
  });
  const pooled = buildSkillVocabulary([source(), extra()]);

  it('adds the kinds of another pack under the kinds of the first', () => {
    expect(pooled.kind('arrow')).toMatchObject({ type: 'active', effect: 'damage' });
    expect(pooled.drawable()).toEqual(expect.arrayContaining(['arrow', 'cantrip', 'strike']));
  });

  it('concatenates the templates, adjectives, suffixes and params', () => {
    expect(pooled.templates()).toEqual(['{noun}', '{adjective} {noun}', '{noun} {suffix}']);
    expect(pooled.adjectives('wild')).toEqual(['Swift', 'Grim']);
    expect(pooled.suffixes('wild')).toEqual(['Dawn', 'Night']);
    expect(pooled.params['place']).toEqual(['the keep', 'the cave']);
  });

  it('reports a kind declared differently, and the Base wins', () => {
    const clash = buildSkillVocabulary([
      source(),
      { packId: 'extra', isBase: false, language: 'en', kinds: { strike: { parent: 'trait' } } },
    ]);
    expect(clash.kind('strike')?.type).toBe('active');
    expect(clash.conflicts.some((c) => c.includes('strike'))).toBe(true);
  });
});

describe.each(['fr', 'en'] as const)('the real Base %s skill vocabulary', (lang) => {
  const base = baseSkillVocabulary(lang);
  const LEAVES = [
    'strike', 'shot', 'fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell',
    'prayer', 'remedy',
    'blessing', 'curse', 'war-cry', 'song',
    'toughness', 'focus', 'agility', 'presence',
  ];

  it('draws every leaf kind of the spec, with no conflict', () => {
    expect(base.drawable()).toEqual(expect.arrayContaining(LEAVES));
    expect(base.conflicts).toEqual([]);
  });

  it('gives the types and effects of the spec', () => {
    for (const id of ['strike', 'shot', 'fire-spell', 'shadow-spell'])
      expect(base.kind(id), id).toMatchObject({ type: 'active', effect: 'damage' });
    for (const id of ['prayer', 'remedy']) expect(base.kind(id), id).toMatchObject({ type: 'active', effect: 'heal' });
    for (const id of ['blessing', 'curse', 'war-cry', 'song'])
      expect(base.kind(id), id).toMatchObject({ type: 'active', effect: 'modify' });
    for (const id of ['toughness', 'focus', 'agility', 'presence']) {
      expect(base.kind(id)?.type, id).toBe('passive');
      expect(base.kind(id)?.effect, id).toBeUndefined();
    }
  });

  it('gives every leaf kind a noun and a description', () => {
    for (const id of LEAVES) {
      expect(base.nouns(id).length, `${id} nouns`).toBeGreaterThan(0);
      expect(base.descriptions(id).length, `${id} descriptions`).toBeGreaterThan(0);
    }
  });

  it('has templates, adjectives and suffixes', () => {
    expect(base.templates().length).toBeGreaterThan(0);
    expect(base.adjectives('strike').length).toBeGreaterThan(5);
    expect(base.suffixes('strike').length).toBeGreaterThan(5);
  });
});
