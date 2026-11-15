import { baseClassVocabulary } from '../../../testing/base-class-vocabulary';
import { PooledSource } from '../packs/pooled-domain';
import { buildClassVocabulary } from './class-vocabulary';

const KINDS = {
  martial: { skills: ['attack', 'trait'] },
  warrior: { parent: 'martial' },
  brute: { parent: 'martial', skills: ['toughness'] },
  hermit: {},
  silent: { parent: 'martial' },
};

const TEXTS = {
  version: 2,
  templates: ['{noun}', '{adjective} {noun}'],
  adjectives: ['Swift'],
  suffixes: ['Dawn'],
  kinds: {
    martial: { descriptions: ['Fights.'], adjectives: ['Fierce'], suffixes: ['Fury'] },
    warrior: {
      nouns: [{ text: 'Warrior' }, { text: 'Knight' }],
      descriptions: ['A warrior.', 'A knight.'],
      adjectives: [{ m: 'Hard', f: 'Hard' }],
      names: ['{noun} of {suffix}'],
    },
    brute: { nouns: [{ text: 'Brute', gender: 'f' }] },
    hermit: { nouns: [{ text: 'Hermit' }], suffixes: ['Silence'] },
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

const vocabulary = buildClassVocabulary([source()]);
const sorted = (list: string[]) => [...list].sort();

describe('buildClassVocabulary kinds', () => {
  it('gives the favoured skill kinds of a kind, inherited by its children', () => {
    expect(vocabulary.kind('martial')).toMatchObject({ id: 'martial', skills: ['attack', 'trait'] });
    expect(vocabulary.kind('warrior')?.skills).toEqual(['attack', 'trait']);
  });

  it('lets the nearest level that has skills win', () => {
    expect(vocabulary.kind('brute')?.skills).toEqual(['toughness']);
  });

  it('gives no favoured skill to a kind whose chain has none', () => {
    expect(vocabulary.kind('hermit')).toMatchObject({ id: 'hermit', skills: [] });
  });

  it('gives the chain from the kind to its root', () => {
    expect(vocabulary.kind('warrior')?.chain).toEqual(['warrior', 'martial']);
  });

  it('does not know a kind that is not declared', () => {
    expect(vocabulary.kind('dragon')).toBeUndefined();
  });
});

describe('buildClassVocabulary drawable kinds', () => {
  it('keeps the kinds that reach a noun on their chain, and no others', () => {
    expect(sorted(vocabulary.drawable())).toEqual(['brute', 'hermit', 'warrior']);
  });

  it('takes the noun of an ancestor', () => {
    const inherited = buildClassVocabulary([
      source({ texts: { ...TEXTS, kinds: { ...TEXTS.kinds, martial: { nouns: [{ text: 'Fighter' }] } } } }),
    ]);
    expect(inherited.drawable()).toContain('silent');
    expect(inherited.drawable()).toContain('martial');
  });
});

describe('buildClassVocabulary texts', () => {
  it('takes the nouns and the descriptions of the nearest level that has some', () => {
    expect(vocabulary.nouns('warrior')).toEqual([{ text: 'Warrior' }, { text: 'Knight' }]);
    expect(vocabulary.nouns('martial')).toEqual([]);
    expect(vocabulary.descriptions('warrior')).toEqual(['A warrior.', 'A knight.']);
    expect(vocabulary.descriptions('brute')).toEqual(['Fights.']);
  });

  it('gives the names of the nearest level that has some', () => {
    expect(vocabulary.names('warrior')).toEqual(['{noun} of {suffix}']);
    expect(vocabulary.names('brute')).toEqual([]);
  });

  it('adds up the adjectives: the language ones and every level of the chain', () => {
    expect(vocabulary.adjectives('warrior')).toHaveLength(3);
    expect(vocabulary.adjectives('warrior')).toEqual(expect.arrayContaining(['Swift', 'Fierce', { m: 'Hard', f: 'Hard' }]));
    expect(vocabulary.adjectives('brute')).toHaveLength(2);
    expect(vocabulary.adjectives('hermit')).toEqual(['Swift']);
  });

  it('adds up the suffixes: the language ones and every level of the chain', () => {
    expect(vocabulary.suffixes('warrior')).toHaveLength(2);
    expect(vocabulary.suffixes('warrior')).toEqual(expect.arrayContaining(['Dawn', 'Fury']));
    expect(vocabulary.suffixes('hermit')).toHaveLength(2);
    expect(vocabulary.suffixes('hermit')).toEqual(expect.arrayContaining(['Dawn', 'Silence']));
  });

  it('gives the templates and the params of the pool', () => {
    expect(vocabulary.templates()).toEqual(['{noun}', '{adjective} {noun}']);
    expect(vocabulary.params).toEqual({ place: ['the keep'] });
  });
});

describe('buildClassVocabulary across packs', () => {
  const extra = (): PooledSource => ({
    packId: 'extra',
    isBase: false,
    language: 'en',
    kinds: { champion: { parent: 'martial' }, seer: { skills: ['focus'] } },
    texts: {
      version: 2,
      templates: ['{noun} {suffix}'],
      adjectives: ['Grim'],
      suffixes: ['Night'],
      kinds: { champion: { nouns: [{ text: 'Champion' }] }, seer: { nouns: [{ text: 'Seer' }] } },
    },
    params: { place: ['the cave'] },
  });
  const pooled = buildClassVocabulary([source(), extra()]);

  it('adds the kinds of another pack under the kinds of the first', () => {
    expect(pooled.kind('champion')?.skills).toEqual(['attack', 'trait']);
    expect(pooled.kind('seer')?.skills).toEqual(['focus']);
    expect(pooled.drawable()).toEqual(expect.arrayContaining(['champion', 'seer', 'warrior']));
  });

  it('concatenates the templates, adjectives, suffixes and params', () => {
    expect(pooled.templates()).toEqual(['{noun}', '{adjective} {noun}', '{noun} {suffix}']);
    expect(pooled.adjectives('hermit')).toEqual(['Swift', 'Grim']);
    expect(pooled.suffixes('hermit')).toEqual(expect.arrayContaining(['Dawn', 'Night', 'Silence']));
    expect(pooled.params['place']).toEqual(['the keep', 'the cave']);
  });

  it('reports a kind declared differently, and the Base wins', () => {
    const clash = buildClassVocabulary([
      source(),
      { packId: 'extra', isBase: false, language: 'en', kinds: { warrior: { parent: 'hermit' } } },
    ]);
    expect(clash.kind('warrior')?.chain).toEqual(['warrior', 'martial']);
    expect(clash.conflicts.some((c) => c.includes('warrior'))).toBe(true);
  });
});

describe.each(['fr', 'en'] as const)('the real Base %s class vocabulary', (lang) => {
  const base = baseClassVocabulary(lang);
  const LEAVES = [
    'warrior', 'berserker', 'knight',
    'mage', 'warlock', 'sorcerer',
    'cleric', 'paladin',
    'druid', 'ranger', 'shaman',
    'rogue', 'assassin', 'bard',
  ];

  it('draws every leaf kind of the spec, and only them, with no conflict', () => {
    expect(sorted(base.drawable())).toEqual(sorted(LEAVES));
    expect(base.conflicts).toEqual([]);
  });

  it('gives the favoured skill kinds of the spec', () => {
    expect(base.kind('knight')?.skills).toEqual(['strike', 'shot', 'war-cry', 'toughness']);
    expect(base.kind('sorcerer')?.skills).toEqual(['fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell', 'focus']);
    expect(base.kind('paladin')?.skills).toEqual(['healing', 'blessing', 'prayer']);
    expect(base.kind('shaman')?.skills).toEqual(['remedy', 'frost-spell', 'agility']);
    expect(base.kind('bard')?.skills).toEqual(['shot', 'curse', 'agility', 'presence']);
  });

  it('gives every leaf kind a noun and a description', () => {
    for (const id of LEAVES) {
      expect(base.nouns(id).length, `${id} nouns`).toBeGreaterThan(0);
      expect(base.descriptions(id).length, `${id} descriptions`).toBeGreaterThan(0);
    }
  });

  it('has templates, adjectives and suffixes', () => {
    expect(base.templates().length).toBeGreaterThan(0);
    expect(base.adjectives('warrior').length).toBeGreaterThan(5);
    expect(base.suffixes('warrior').length).toBeGreaterThan(5);
  });
});
