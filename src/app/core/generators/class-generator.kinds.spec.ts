import { baseClassVocabulary } from '../../../testing/base-class-vocabulary';
import { baseSkillVocabulary } from '../../../testing/base-skill-vocabulary';
import { validateClass } from '../../modules/class/helpers/class.rules';
import { ClassDraft } from '../../modules/class/models/class';
import { Skill } from '../../modules/skill/models/skill';
import { PooledSource } from '../packs/pooled-domain';
import { buildClassVocabulary } from './class-vocabulary';
import { generateClass } from './class-generator';
import { seededRandomSource } from './random-source';
import { buildSkillVocabulary } from './skill-vocabulary';

const SKILL_KINDS = {
  attack: { type: 'active', effect: 'damage' },
  strike: { parent: 'attack' },
  trait: { type: 'passive' },
  toughness: { parent: 'trait' },
};
const skillVocabulary = buildSkillVocabulary([
  { packId: 'base-en', isBase: true, language: 'en', kinds: SKILL_KINDS, texts: { version: 2 }, params: {} },
]);

const CLASS_KINDS = {
  martial: { skills: ['attack'] },
  warrior: { parent: 'martial' },
  arcane: { skills: ['trait'] },
  mage: { parent: 'arcane' },
  hermit: {},
};
const TEXTS = {
  version: 2,
  templates: ['{adjective} {noun}'],
  adjectives: [{ m: 'Cruel', f: 'Cruelle' }],
  suffixes: ['Dawn'],
  kinds: {
    martial: { descriptions: ['Fights.'] },
    warrior: {
      nouns: [{ text: 'Warrior', gender: 'm' }],
      names: ['{noun} of {suffix}'],
      suffixes: ['Fury'],
    },
    mage: {
      nouns: [{ text: 'Mage', gender: 'f' }],
      descriptions: ['{g:Il|Elle} lit à {place}.'],
    },
    hermit: { nouns: [{ text: 'Hermit' }], names: ['{noun}'], descriptions: ['Alone.'] },
  },
};
const source = (): PooledSource => ({
  packId: 'base-en',
  isBase: true,
  language: 'en',
  kinds: CLASS_KINDS,
  texts: TEXTS,
  params: { place: ['the keep'] },
});
const vocabulary = buildClassVocabulary([source()]);

const attributes = ['Strength', 'Life', 'Mana'];
const skill = (id: string, kind?: string): Skill => ({
  id,
  name: id,
  description: '',
  rarity: 'common',
  type: 'passive',
  maxLevel: 2,
  pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
  ...(kind ? { kind } : {}),
});
const ids = (prefix: string, n: number, kind?: string) =>
  Array.from({ length: n }, (_, i) => skill(`${prefix}${i}`, kind));
const world: Skill[] = [...ids('st', 4, 'strike'), ...ids('to', 4, 'toughness'), ...ids('plain', 2)];

type Drawn = ClassDraft & { kind?: string };
const draw = (seed: string, skills = world, vocab = vocabulary): Drawn =>
  generateClass(seededRandomSource(seed), attributes, skills, vocab, skillVocabulary) as Drawn;
const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const drawn = (n = 300, skills = world) => seeds(n).map((seed) => draw(seed, skills));
const ofKind = (id: string, n = 300, skills = world) => drawn(n, skills).filter((c) => c.kind === id);
const treeIds = (c: ClassDraft) => c.tree.map((node) => node.skillId);

describe('generateClass on kinds', () => {
  it('draws a kind among the drawable kinds and keeps it on the class', () => {
    const classes = drawn();
    for (const c of classes) expect(vocabulary.drawable()).toContain(c.kind);
    for (const id of ['warrior', 'mage', 'hermit']) expect(classes.some((c) => c.kind === id), id).toBe(true);
  });

  it('never draws a kind that has no noun', () => {
    const kinds = new Set(drawn().map((c) => c.kind));
    for (const id of ['martial', 'arcane']) expect(kinds.has(id), id).toBe(false);
  });

  it('names a class from the kind names first, with its suffixes adding up to the language ones', () => {
    const warriors = ofKind('warrior');
    for (const c of warriors) expect(['Warrior of Dawn', 'Warrior of Fury']).toContain(c.name);
    expect(new Set(warriors.map((c) => c.name)).size).toBe(2);
    for (const c of ofKind('hermit')) expect(c.name).toBe('Hermit');
  });

  it('names a class from the language templates when the kind has no names, the adjective agreeing with the noun', () => {
    const mages = ofKind('mage');
    expect(mages.length).toBeGreaterThan(10);
    for (const c of mages) expect(c.name).toBe('Cruelle Mage');
  });

  it('takes the description of the nearest level, expanded with its params and the gender of the noun', () => {
    for (const c of ofKind('warrior')) expect(c.description).toBe('Fights.');
    for (const c of ofKind('mage')) expect(c.description).toBe('Elle lit à the keep.');
    for (const c of ofKind('hermit')) expect(c.description).toBe('Alone.');
  });

  it('puts bonuses only on the given attributes', () => {
    for (const c of drawn(100)) {
      expect((c.bonuses ?? []).length).toBeGreaterThan(0);
      for (const bonus of c.bonuses ?? []) expect(attributes).toContain(bonus.attribute);
    }
  });

  it('gives the same class for the same seed, packs and world skills, and another for another seed', () => {
    expect(draw('same')).toEqual(draw('same'));
    expect(draw('same')).toEqual(draw('same', world, buildClassVocabulary([source()])));
    expect(new Set(drawn(30).map((c) => c.name)).size).toBeGreaterThan(2);
    expect(new Set(drawn(30).map((c) => c.kind)).size).toBeGreaterThan(1);
  });
});

describe('generateClass tree on kinds', () => {
  it('prefers the world skills whose kind chain contains a favoured skill kind', () => {
    const warriors = ofKind('warrior');
    expect(warriors.length).toBeGreaterThan(10);
    for (const c of warriors) {
      expect(c.tree.length).toBeGreaterThanOrEqual(3);
      for (const id of treeIds(c)) expect(id, 'warrior tree').toMatch(/^st\d$/);
    }
    for (const c of ofKind('mage')) for (const id of treeIds(c)) expect(id, 'mage tree').toMatch(/^to\d$/);
  });

  it('takes the skills through the skill vocabulary chain, a parent kind counting for its children', () => {
    // "attack" is only the parent of "strike": the favoured kind matches through the chain.
    const only = [...ids('st', 3, 'strike'), ...ids('to', 3, 'toughness')];
    for (const c of ofKind('warrior', 300, only)) expect(treeIds(c).sort()).toEqual(['st0', 'st1', 'st2']);
  });

  it('draws the whole world when the kind favours nothing', () => {
    const seen = new Set(ofKind('hermit').flatMap(treeIds));
    expect(seen.size).toBe(world.length);
  });

  it('tops up with other skills when fewer than 3 are preferred, keeping the preferred ones', () => {
    const few = [...ids('st', 2, 'strike'), ...ids('to', 3, 'toughness'), ...ids('plain', 2)];
    const warriors = ofKind('warrior', 300, few);
    expect(warriors.length).toBeGreaterThan(10);
    for (const c of warriors) {
      expect(c.tree.length).toBeGreaterThanOrEqual(3);
      expect(treeIds(c)).toEqual(expect.arrayContaining(['st0', 'st1']));
    }
  });

  it('keeps a single preferred skill and fills up from the others', () => {
    const one = [skill('st0', 'strike'), ...ids('plain', 5)];
    for (const c of ofKind('warrior', 300, one)) {
      expect(treeIds(c)).toContain('st0');
      expect(c.tree.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws from the other skills when none is preferred', () => {
    const none = ids('to', 5, 'toughness');
    const warriors = ofKind('warrior', 300, none);
    expect(warriors.length).toBeGreaterThan(10);
    for (const c of warriors) {
      expect(c.tree.length).toBeGreaterThanOrEqual(3);
      for (const id of treeIds(c)) expect(id).toMatch(/^to\d$/);
    }
  });

  it('does not count a skill without a kind, or of an unknown kind, as preferred', () => {
    const odd = [...ids('st', 3, 'strike'), skill('ghost', 'dragon'), skill('plain')];
    for (const c of ofKind('warrior', 300, odd)) expect(treeIds(c).sort()).toEqual(['st0', 'st1', 'st2']);
  });

  it('keeps a valid, reachable tree', () => {
    for (const c of drawn(100)) {
      expect(c.tree.length).toBeGreaterThan(0);
      expect(validateClass(c, world, attributes)).toEqual([]);
    }
  });
});

describe.each(['fr', 'en'] as const)('generateClass on the real Base %s', (lang) => {
  const base = baseClassVocabulary(lang);
  const skillBase = baseSkillVocabulary(lang);
  const LEAVES = [
    'strike', 'shot', 'fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell',
    'prayer', 'remedy', 'blessing', 'curse', 'war-cry', 'song',
    'toughness', 'focus', 'agility', 'presence',
  ];
  const baseWorld: Skill[] = LEAVES.flatMap((kind) => [skill(`${kind}-1`, kind), skill(`${kind}-2`, kind)]);
  const FAVOURED: Record<string, string[]> = {
    warrior: ['strike', 'shot', 'war-cry', 'toughness'],
    berserker: ['strike', 'shot', 'war-cry', 'toughness'],
    knight: ['strike', 'shot', 'war-cry', 'toughness'],
    mage: ['fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell', 'focus'],
    warlock: ['fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell', 'focus'],
    sorcerer: ['fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell', 'focus'],
    cleric: ['prayer', 'remedy', 'blessing'],
    paladin: ['prayer', 'remedy', 'blessing'],
    druid: ['remedy', 'frost-spell', 'agility'],
    ranger: ['remedy', 'frost-spell', 'agility'],
    shaman: ['remedy', 'frost-spell', 'agility'],
    rogue: ['shot', 'curse', 'agility', 'presence'],
    assassin: ['shot', 'curse', 'agility', 'presence'],
    bard: ['shot', 'curse', 'agility', 'presence'],
  };
  const classes = seeds(400, `real-${lang}`).map(
    (seed) =>
      generateClass(seededRandomSource(seed), attributes, baseWorld, base, skillBase) as ClassDraft & { kind: string },
  );

  it('draws the kinds of the spec, and only drawable ones', () => {
    const kinds = new Set(classes.map((c) => c.kind));
    for (const id of Object.keys(FAVOURED)) expect(kinds.has(id), id).toBe(true);
    for (const id of kinds) expect(base.drawable()).toContain(id);
  });

  it('builds the tree from the skills the kind favours', () => {
    const kindOf = (id: string) => baseWorld.find((s) => s.id === id)!.kind!;
    for (const c of classes) {
      expect(c.tree.length, c.kind).toBeGreaterThanOrEqual(3);
      for (const node of c.tree) {
        const kind = kindOf(node.skillId);
        const chain = skillBase.kind(kind)!.chain;
        expect(
          FAVOURED[c.kind].some((fav) => chain.includes(fav)),
          `${c.kind} took ${kind}`,
        ).toBe(true);
      }
    }
  });

  it('writes a name and a description with nothing left to expand, and a valid class', () => {
    for (const c of classes) {
      expect(c.name.trim(), c.kind).not.toBe('');
      expect(c.description.trim(), c.kind).not.toBe('');
      expect(c.name).not.toMatch(/[{}[\]|]/);
      expect(c.description).not.toMatch(/[{}[\]|]/);
      expect(validateClass(c, baseWorld, attributes)).toEqual([]);
    }
  });

  it('is deterministic', () => {
    const again = generateClass(seededRandomSource(`real-${lang}-7`), attributes, baseWorld, base, skillBase);
    expect(again).toEqual(
      generateClass(seededRandomSource(`real-${lang}-7`), attributes, baseWorld, baseClassVocabulary(lang), baseSkillVocabulary(lang)),
    );
  });
});
