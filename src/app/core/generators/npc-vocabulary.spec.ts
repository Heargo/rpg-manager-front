import { baseNpcVocabulary } from '../../../testing/base-vocabulary';
import { PooledSource } from '../packs/pooled-domain';
import { buildNpcVocabulary } from './npc-vocabulary';

const KINDS = {
  townsfolk: { roles: ['story'] },
  peasant: { parent: 'townsfolk' },
  priest: { parent: 'townsfolk' },
  smuggler: { parent: 'townsfolk', roles: ['merchant', 'enemy'] },
  beast: { roles: ['enemy'], person: false },
  wolf: { parent: 'beast' },
  ghost: { parent: 'beast' },
};

const TEXTS = {
  version: 2,
  given: [{ text: 'Aldo', gender: 'm' }, { text: 'Mila', gender: 'f' }],
  epithets: ['le Sage'],
  templates: ['{given}', '{given} {epithet}'],
  kinds: {
    townsfolk: { descriptions: ['Un habitant.'], adjectives: ['simple'] },
    peasant: { nouns: [{ text: 'Paysan', gender: 'm' }, { text: 'Paysanne', gender: 'f' }] },
    priest: {
      nouns: [{ text: 'Prêtre' }],
      descriptions: ['Un homme de foi.', 'Une femme de foi.'],
      adjectives: [{ m: 'pieux', f: 'pieuse' }],
      names: ['{given} le {noun}'],
    },
    beast: { adjectives: ['sauvage'], descriptions: ['Une bête.'] },
    wolf: { nouns: [{ text: 'Louve', gender: 'f' }], adjectives: ['gris'], names: ['{noun} {adjective}'] },
  },
};

const source = (over: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: KINDS,
  texts: TEXTS,
  params: { place: ['le temple'] },
  ...over,
});

const vocabulary = buildNpcVocabulary([source()]);
const sorted = (list: string[]) => [...list].sort();

describe('buildNpcVocabulary kinds', () => {
  it('gives the roles of a root, inherited by its children', () => {
    expect(vocabulary.kind('townsfolk')).toMatchObject({ id: 'townsfolk', roles: ['story'], person: true });
    expect(vocabulary.kind('peasant')).toMatchObject({ roles: ['story'], person: true });
  });

  it('lets a child override the roles of its root', () => {
    expect(vocabulary.kind('smuggler')?.roles).toEqual(['merchant', 'enemy']);
  });

  it('inherits person, and a creature is not a person', () => {
    expect(vocabulary.kind('beast')).toMatchObject({ roles: ['enemy'], person: false });
    expect(vocabulary.kind('wolf')).toMatchObject({ roles: ['enemy'], person: false });
  });

  it('gives the chain from the kind to its root', () => {
    expect(vocabulary.kind('priest')?.chain).toEqual(['priest', 'townsfolk']);
  });

  it('does not know a kind that is not declared', () => {
    expect(vocabulary.kind('dragon')).toBeUndefined();
  });

  it('drops a root without roles, with its children, and reports it', () => {
    const dropped = buildNpcVocabulary([
      source({ kinds: { ...KINDS, rogue: {}, thief: { parent: 'rogue' } } }),
    ]);
    expect(dropped.kind('rogue')).toBeUndefined();
    expect(dropped.kind('thief')).toBeUndefined();
    expect(dropped.conflicts.some((c) => c.includes('rogue'))).toBe(true);
  });
});

describe('buildNpcVocabulary drawable kinds', () => {
  it('keeps persons whatever their nouns, creatures with a noun only', () => {
    expect(sorted(vocabulary.drawable())).toEqual(['peasant', 'priest', 'smuggler', 'townsfolk', 'wolf']);
  });

  it('takes the noun of an ancestor for a creature', () => {
    const inherited = buildNpcVocabulary([
      source({
        texts: { ...TEXTS, kinds: { ...TEXTS.kinds, beast: { nouns: [{ text: 'Bête' }] }, wolf: {} } },
      }),
    ]);
    expect(inherited.drawable()).toContain('wolf');
    expect(inherited.drawable()).toContain('ghost');
  });

  it('draws nothing from a root without roles', () => {
    const dropped = buildNpcVocabulary([source({ kinds: { rogue: {}, thief: { parent: 'rogue' } } })]);
    expect(dropped.drawable()).toEqual([]);
  });
});

describe('buildNpcVocabulary texts', () => {
  it('takes the nouns and the descriptions of the nearest level that has some', () => {
    expect(vocabulary.nouns('priest')).toEqual([{ text: 'Prêtre' }]);
    expect(vocabulary.nouns('peasant')).toHaveLength(2);
    expect(vocabulary.nouns('townsfolk')).toEqual([]);
    expect(vocabulary.descriptions('priest')).toEqual(['Un homme de foi.', 'Une femme de foi.']);
    expect(vocabulary.descriptions('peasant')).toEqual(['Un habitant.']);
    expect(vocabulary.descriptions('wolf')).toEqual(['Une bête.']);
  });

  it('adds up the adjectives along the chain', () => {
    expect(vocabulary.adjectives('priest')).toHaveLength(2);
    expect(vocabulary.adjectives('priest')).toEqual(
      expect.arrayContaining(['simple', { m: 'pieux', f: 'pieuse' }]),
    );
    expect(vocabulary.adjectives('peasant')).toEqual(['simple']);
    expect(vocabulary.adjectives('wolf')).toEqual(expect.arrayContaining(['sauvage', 'gris']));
    expect(vocabulary.adjectives('wolf')).toHaveLength(2);
  });

  it('gives the names of the nearest level that has some', () => {
    expect(vocabulary.names('priest')).toEqual(['{given} le {noun}']);
    expect(vocabulary.names('wolf')).toEqual(['{noun} {adjective}']);
    expect(vocabulary.names('peasant')).toEqual([]);
  });

  it('gives the given names, epithets, templates and params of the pool', () => {
    expect(vocabulary.given()).toEqual(TEXTS.given);
    expect(vocabulary.epithets()).toEqual(['le Sage']);
    expect(vocabulary.templates()).toEqual(['{given}', '{given} {epithet}']);
    expect(vocabulary.params).toEqual({ place: ['le temple'] });
  });
});

describe('buildNpcVocabulary across packs', () => {
  const extra = (): PooledSource => ({
    packId: 'extra',
    isBase: false,
    language: 'fr',
    kinds: { troll: { parent: 'beast' }, hermit: { parent: 'townsfolk' } },
    texts: {
      version: 2,
      given: [{ text: 'Zorg', gender: 'm' }],
      epithets: ['le Vert'],
      templates: ['{epithet} {given}'],
      kinds: { troll: { nouns: [{ text: 'Troll' }] }, hermit: { nouns: [{ text: 'Ermite' }] } },
    },
    params: { place: ['la grotte'] },
  });
  const pooled = buildNpcVocabulary([source(), extra()]);

  it('adds the kinds of another pack under the kinds of the first', () => {
    expect(pooled.kind('troll')).toMatchObject({ roles: ['enemy'], person: false });
    expect(pooled.drawable()).toEqual(expect.arrayContaining(['troll', 'hermit', 'wolf']));
  });

  it('concatenates the given names, epithets, templates and params', () => {
    expect(pooled.given().map((g) => g.text)).toEqual(['Aldo', 'Mila', 'Zorg']);
    expect(pooled.epithets()).toEqual(['le Sage', 'le Vert']);
    expect(pooled.templates()).toEqual(['{given}', '{given} {epithet}', '{epithet} {given}']);
    expect(pooled.params['place']).toEqual(['le temple', 'la grotte']);
  });

  it('reports a kind declared differently, and the Base wins', () => {
    const clash = buildNpcVocabulary([
      source(),
      { packId: 'extra', isBase: false, language: 'fr', kinds: { wolf: { parent: 'townsfolk' } } },
    ]);
    expect(clash.kind('wolf')?.person).toBe(false);
    expect(clash.conflicts.some((c) => c.includes('wolf'))).toBe(true);
  });
});

describe.each(['fr', 'en'] as const)('the real Base %s NPC vocabulary', (lang) => {
  const base = baseNpcVocabulary(lang);
  const LEAVES = [
    'peasant', 'noble', 'scholar', 'priest',
    'merchant', 'innkeeper', 'blacksmith', 'peddler',
    'guard',
    'bandit', 'cultist', 'mercenary',
    'wolf', 'bear', 'giant-spider', 'boar',
  ];

  it('draws every kind of the spec that is not a bare root', () => {
    expect(base.drawable()).toEqual(expect.arrayContaining(LEAVES));
    expect(base.conflicts).toEqual([]);
  });

  it('gives the roles of the spec', () => {
    expect(base.kind('peasant')?.roles).toEqual(['story']);
    expect(base.kind('innkeeper')?.roles).toEqual(['merchant']);
    expect(base.kind('guard')?.roles).toEqual(['story', 'enemy']);
    expect(base.kind('mercenary')?.roles).toEqual(['enemy']);
    expect(base.kind('boar')).toMatchObject({ roles: ['enemy'], person: false });
    expect(base.kind('priest')?.person).toBe(true);
  });

  it('gives every kind a noun and a description', () => {
    for (const id of LEAVES) {
      expect(base.nouns(id).length, `${id} nouns`).toBeGreaterThan(0);
      expect(base.descriptions(id).length, `${id} descriptions`).toBeGreaterThan(0);
    }
  });

  it('names each creature from its noun and an adjective', () => {
    for (const id of ['wolf', 'bear', 'giant-spider', 'boar']) {
      expect(base.adjectives(id).length, `${id} adjectives`).toBeGreaterThan(0);
      expect(base.names(id).some((n) => n.includes('{noun}')), `${id} names`).toBe(true);
    }
  });

  it('has given names, epithets and person templates', () => {
    expect(base.given().length).toBeGreaterThanOrEqual(40);
    expect(base.epithets().length).toBeGreaterThanOrEqual(20);
    expect(base.templates().length).toBeGreaterThan(0);
  });
});
