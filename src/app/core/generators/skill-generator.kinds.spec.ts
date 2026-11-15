import { baseSkillVocabulary } from '../../../testing/base-skill-vocabulary';
import { validateSkill } from '../../modules/skill/helpers/skill.rules';
import { SKILL_TARGETS, SkillDraft } from '../../modules/skill/models/skill';
import { PooledSource } from '../packs/pooled-domain';
import { seededRandomSource } from './random-source';
import { generateSkill } from './skill-generator';
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
  templates: ['{adjective} {noun}'],
  adjectives: [{ m: 'Cruel', f: 'Cruelle' }],
  suffixes: ['Dawn'],
  kinds: {
    attack: { descriptions: ['A blow.'] },
    strike: {
      nouns: [{ text: 'Strike', gender: 'm' }],
      names: ['{noun} of {suffix}'],
      suffixes: ['Fury'],
    },
    hex: {
      nouns: [{ text: 'Hex', gender: 'f' }],
      descriptions: ['{g:Il|Elle} brûle à {place}.'],
    },
    wild: { nouns: [{ text: 'Surge' }], names: ['{noun}'], descriptions: ['Wild.'] },
    trait: { descriptions: ['Tough.'] },
    toughness: { nouns: [{ text: 'Toughness' }] },
  },
};

const source = (): PooledSource => ({
  packId: 'base-en',
  isBase: true,
  language: 'en',
  kinds: KINDS,
  texts: TEXTS,
  params: { place: ['the keep'] },
});

const vocabulary = buildSkillVocabulary([source()]);
const attributes = ['Strength', 'Agility', 'Life', 'Mana'];

type Drawn = SkillDraft & { kind?: string };
const draw = (seed: string, vocab = vocabulary): Drawn =>
  generateSkill(seededRandomSource(seed), attributes, vocab) as Drawn;
const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const drawn = (n = 300) => seeds(n).map((seed) => draw(seed));
const ofKind = (id: string, n = 300) => drawn(n).filter((skill) => skill.kind === id);

describe('generateSkill on kinds', () => {
  it('draws a kind among the drawable kinds and keeps it on the skill', () => {
    const skills = drawn();
    for (const skill of skills) expect(vocabulary.drawable()).toContain(skill.kind);
    for (const id of ['strike', 'hex', 'wild', 'toughness']) expect(skills.some((s) => s.kind === id), id).toBe(true);
  });

  it('never draws a kind that has no noun', () => {
    const kinds = new Set(drawn().map((s) => s.kind));
    for (const id of ['attack', 'trait', 'silent']) expect(kinds.has(id), id).toBe(false);
  });

  it('takes the type from the kind', () => {
    for (const skill of ofKind('strike')) expect(skill.type).toBe('active');
    for (const skill of ofKind('wild')) expect(skill.type).toBe('active');
    for (const skill of ofKind('toughness')) expect(skill.type).toBe('passive');
  });

  it('takes the effect from the kind, the nearest one winning', () => {
    const strikes = ofKind('strike');
    expect(strikes.length).toBeGreaterThan(10);
    for (const skill of strikes) {
      expect(skill.effects[0].kind).toBe('damage');
      expect(['one-enemy', 'all-enemies', 'area']).toContain(skill.target);
    }
    const hexes = ofKind('hex');
    expect(hexes.length).toBeGreaterThan(10);
    for (const skill of hexes) {
      expect(skill.effects[0].kind).toBe('modify');
      expect(SKILL_TARGETS).toContain(skill.target);
    }
  });

  it('draws the effect when the kind sets none, and all three come up', () => {
    const wild = ofKind('wild');
    expect(wild.length).toBeGreaterThan(10);
    expect(new Set(wild.map((s) => s.effects[0].kind))).toEqual(new Set(['damage', 'heal', 'modify']));
  });

  it('gives a passive kind modifiers and no target, cost or cooldown', () => {
    const passives = ofKind('toughness');
    expect(passives.length).toBeGreaterThan(10);
    for (const skill of passives) {
      for (const effect of skill.effects) expect(effect.kind).toBe('modify');
      expect(skill.target).toBeUndefined();
      expect(skill.cost).toBeUndefined();
      expect(skill.cooldown).toBeUndefined();
    }
  });

  it('names a skill from the kind names first, with its suffixes adding up to the language ones', () => {
    const strikes = ofKind('strike');
    for (const skill of strikes) expect(['Strike of Dawn', 'Strike of Fury']).toContain(skill.name);
    expect(new Set(strikes.map((s) => s.name)).size).toBe(2);
  });

  it('names a skill from the language templates when the kind has no names, the adjective agreeing with the noun', () => {
    const hexes = ofKind('hex');
    for (const skill of hexes) expect(skill.name).toBe('Cruelle Hex');
    for (const skill of ofKind('toughness')) expect(skill.name).toBe('Cruel Toughness');
  });

  it('takes the description of the nearest level, expanded with its params and the gender of the noun', () => {
    for (const skill of ofKind('strike')) expect(skill.description).toBe('A blow.');
    for (const skill of ofKind('hex')) expect(skill.description).toBe('Elle brûle à the keep.');
    for (const skill of ofKind('toughness')) expect(skill.description).toBe('Tough.');
    for (const skill of ofKind('wild')) expect(skill.description).toBe('Wild.');
  });

  it('keeps the rest of the skill valid, on the given attributes', () => {
    for (const skill of drawn(100)) {
      expect(validateSkill(skill, attributes)).toEqual([]);
      for (const effect of skill.effects) expect(attributes).toContain(effect.attribute);
    }
  });

  it('gives the same skill for the same seed and the same packs, and another for another seed', () => {
    expect(draw('same')).toEqual(draw('same'));
    expect(draw('same')).toEqual(draw('same', buildSkillVocabulary([source()])));
    expect(new Set(drawn(30).map((s) => s.name)).size).toBeGreaterThan(3);
    expect(new Set(drawn(30).map((s) => s.kind)).size).toBeGreaterThan(1);
  });
});

describe.each(['fr', 'en'] as const)('generateSkill on the real Base %s', (lang) => {
  const base = baseSkillVocabulary(lang);
  const skills = seeds(400, `real-${lang}`).map(
    (seed) => generateSkill(seededRandomSource(seed), attributes, base) as Drawn & { kind: string },
  );

  it('draws the kinds of the spec, and only drawable ones', () => {
    const kinds = new Set(skills.map((s) => s.kind));
    for (const id of ['strike', 'shot', 'fire-spell', 'prayer', 'remedy', 'blessing', 'curse', 'war-cry', 'song', 'toughness', 'focus', 'agility', 'presence'])
      expect(kinds.has(id), id).toBe(true);
    for (const id of kinds) expect(base.drawable()).toContain(id);
  });

  it('takes the type and the effect of the kind', () => {
    for (const skill of skills) {
      const info = base.kind(skill.kind)!;
      expect(skill.type, skill.kind).toBe(info.type);
      if (info.effect) expect(skill.effects[0].kind, skill.kind).toBe(info.effect);
    }
    for (const skill of skills.filter((s) => s.kind === 'remedy')) expect(skill.effects[0].kind).toBe('heal');
    for (const skill of skills.filter((s) => s.kind === 'focus')) expect(skill.type).toBe('passive');
  });

  it('writes a name and a description with nothing left to expand, and a valid skill', () => {
    for (const skill of skills) {
      expect(skill.name.trim(), skill.kind).not.toBe('');
      expect(skill.description.trim(), skill.kind).not.toBe('');
      expect(skill.name).not.toMatch(/[{}[\]|]/);
      expect(skill.description).not.toMatch(/[{}[\]|]/);
      expect(validateSkill(skill, attributes)).toEqual([]);
    }
  });

  it('is deterministic', () => {
    const again = generateSkill(seededRandomSource(`real-${lang}-7`), attributes, base);
    expect(again).toEqual(generateSkill(seededRandomSource(`real-${lang}-7`), attributes, baseSkillVocabulary(lang)));
  });
});
