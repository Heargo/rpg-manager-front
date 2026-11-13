import { NpcNameList } from '../../../core/generators/npc-name-list';
import { seededRandomSource } from '../../../core/generators/random-source';
import { createSandboxWorld } from '../../world/helpers/default-world';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
import { World } from '../../world/models/world';
import { Npc } from '../models/npc';
import {
  generateNpc,
  learnNpcSkillsFromClass,
  npcSkillPoints,
  setNpcClass,
  setNpcSkill,
} from './npc-editor.rules';

const names: NpcNameList = {
  version: 1,
  given: [{ text: 'Aro', gender: 'm' }],
  epithets: ['Grim'],
  templates: ['{given} {epithet}'],
};

const skill = (id: string, maxLevel: number, pointCost: number): Skill => ({
  id,
  name: id,
  description: '',
  rarity: 'common',
  type: 'passive',
  maxLevel,
  pointCost,
  effects: [],
});
const skills = [
  skill('a', 2, 1),
  skill('b', 1, 1),
  skill('c', 1, 2),
  skill('d', 1, 3),
  skill('e', 2, 1),
  skill('free', 3, 1),
];

const warrior: CharacterClass = {
  id: 'warrior',
  name: 'Warrior',
  description: '',
  tree: [
    {
      skillId: 'c',
      requires: [{ skillId: 'a', level: 2 }],
      minLevel: 3,
      column: 1,
      row: 1,
    },
    {
      skillId: 'b',
      requires: [{ skillId: 'a', level: 1 }],
      minLevel: 1,
      column: 0,
      row: 1,
    },
    { skillId: 'a', requires: [], minLevel: 1, column: 0, row: 0 },
  ],
};
const brute: CharacterClass = {
  id: 'brute',
  name: 'Brute',
  description: '',
  tree: [
    { skillId: 'd', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 'e', requires: [], minLevel: 1, column: 1, row: 0 },
  ],
};

const world: World = {
  ...createSandboxWorld((key) => key),
  attributes: [
    {
      id: 'wit',
      name: 'Wit',
      baseValue: 5,
      formula: { preset: 'linear', step: 1 },
    },
  ],
  levelCurve: { preset: 'flat' },
  maxLevel: 10,
  startingSkillPoints: 2,
  skillPointsPerLevel: 1,
  skills,
  classes: [warrior, brute],
  items: [],
};

const npc = (overrides: Partial<Npc> = {}): Npc => ({
  id: 'n1',
  name: 'Goblin',
  description: '',
  roles: ['enemy'],
  level: 1,
  xp: 0,
  statPoints: 0,
  money: 0,
  updatedAt: 1,
  skillPoints: 0,
  skills: [],
  xpReward: 0,
  loot: [],
  attributes: [],
  inventory: [],
  classId: 'warrior',
  ...overrides,
});

describe('npcSkillPoints', () => {
  it('is the starting points plus the points per level after the first', () => {
    expect(npcSkillPoints(1, world)).toBe(2);
    expect(npcSkillPoints(4, world)).toBe(5);
    expect(
      npcSkillPoints(4, {
        ...world,
        startingSkillPoints: 0,
        skillPointsPerLevel: 2,
      }),
    ).toBe(6);
  });
});

describe('learnNpcSkillsFromClass', () => {
  const levels = (n: Npc) =>
    Object.fromEntries(n.skills.map((s) => [s.skillId, s.level]));

  it('raises the first node in tree order (row, then column) until it is maxed, then the next', () => {
    const learned = learnNpcSkillsFromClass(npc({ level: 1 }), world);
    expect(levels(learned)).toEqual({ a: 2 });
    expect(learned.skillPoints).toBe(0);
  });

  it('goes on to nodes the earlier ones unlocked, and stops when none is affordable', () => {
    const learned = learnNpcSkillsFromClass(npc({ level: 3 }), world);
    expect(levels(learned)).toEqual({ a: 2, b: 1 });
    expect(learned.skillPoints).toBe(1);
  });

  it('learns a node whose minimum level the NPC reaches', () => {
    const learned = learnNpcSkillsFromClass(npc({ level: 4 }), world);
    expect(levels(learned)).toEqual({ a: 2, b: 1, c: 1 });
    expect(learned.skillPoints).toBe(0);
  });

  it('refuses a node below its minimum level even with points left', () => {
    const rich = { ...world, startingSkillPoints: 6, skillPointsPerLevel: 0 };
    const learned = learnNpcSkillsFromClass(npc({ level: 2 }), rich);
    expect(levels(learned)).toEqual({ a: 2, b: 1 });
    expect(learned.skillPoints).toBe(3);
  });

  it('skips a node it cannot afford for a cheaper one later in the tree', () => {
    const learned = learnNpcSkillsFromClass(
      npc({ classId: 'brute', level: 1 }),
      world,
    );
    expect(levels(learned)).toEqual({ e: 2 });
    expect(learned.skillPoints).toBe(0);
  });

  it('keeps the skills already on the sheet, including those outside the tree', () => {
    const learned = learnNpcSkillsFromClass(
      npc({ level: 1, skills: [{ skillId: 'free', level: 2 }] }),
      world,
    );
    expect(levels(learned)).toMatchObject({ free: 2, a: 2 });
  });

  it('does nothing without a class', () => {
    const base = npc({ classId: undefined, level: 5 });
    expect(learnNpcSkillsFromClass(base, world)).toEqual(base);
  });
});

describe('setNpcSkill', () => {
  it('adds any catalogue skill at any level up to its max, in or out of the tree', () => {
    expect(setNpcSkill(npc(), 'free', 3, world).skills).toEqual([
      { skillId: 'free', level: 3 },
    ]);
    expect(setNpcSkill(npc(), 'c', 1, world).skills).toEqual([
      { skillId: 'c', level: 1 },
    ]);
  });

  it('re-levels a skill the NPC has and leaves the others', () => {
    const base = npc({
      skills: [
        { skillId: 'a', level: 1 },
        { skillId: 'free', level: 1 },
      ],
    });
    expect(setNpcSkill(base, 'free', 3, world).skills).toEqual([
      { skillId: 'a', level: 1 },
      { skillId: 'free', level: 3 },
    ]);
  });

  it('removes the skill at level 0', () => {
    const base = npc({
      skills: [
        { skillId: 'a', level: 1 },
        { skillId: 'free', level: 1 },
      ],
    });
    expect(setNpcSkill(base, 'a', 0, world).skills).toEqual([
      { skillId: 'free', level: 1 },
    ]);
  });

  it('ignores an unknown skill and a level above the max or below 0', () => {
    const base = npc({ skills: [{ skillId: 'a', level: 1 }] });
    expect(setNpcSkill(base, 'ghost', 1, world)).toEqual(base);
    expect(setNpcSkill(base, 'a', 3, world)).toEqual(base);
    expect(setNpcSkill(base, 'a', -1, world)).toEqual(base);
  });

  it('does not touch the skill points', () => {
    expect(
      setNpcSkill(npc({ skillPoints: 4 }), 'free', 2, world).skillPoints,
    ).toBe(4);
  });
});

describe('setNpcClass', () => {
  it('sets the class, and clears it with undefined', () => {
    expect(setNpcClass(npc({ classId: undefined }), 'brute').classId).toBe(
      'brute',
    );
    expect(setNpcClass(npc(), undefined).classId).toBeUndefined();
  });
});

describe('generateNpc with classes', () => {
  const draw = (seed: string, classId?: string, w = world) =>
    generateNpc(w, seededRandomSource(seed), names, classId);

  it('uses the chosen class and learns along its tree with the points of its level', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const npcOut = draw(seed, 'warrior');
      expect(npcOut.classId).toBe('warrior');
      const level = (id: string) =>
        npcOut.skills.find((s) => s.skillId === id)?.level ?? 0;
      const cost = npcOut.skills.reduce(
        (sum, s) =>
          sum + s.level * skills.find((k) => k.id === s.skillId)!.pointCost,
        0,
      );
      expect(cost + npcOut.skillPoints).toBe(2 + (npcOut.level - 1));
      expect(
        npcOut.skills.every((s) => ['a', 'b', 'c'].includes(s.skillId)),
      ).toBe(true);
      if (level('b') > 0) expect(level('a')).toBeGreaterThanOrEqual(1);
      if (level('c') > 0) {
        expect(level('a')).toBe(2);
        expect(npcOut.level).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('picks a class of the world at random when none is chosen, deterministically for a seed', () => {
    const seen = new Set(
      ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'].map(
        (s) => draw(s).classId,
      ),
    );
    expect(seen).toEqual(new Set(['warrior', 'brute']));
    expect(draw('same')).toEqual(draw('same'));
  });

  it('generates no class and no skills when the world has no classes', () => {
    const out = draw('none', undefined, { ...world, classes: [] });
    expect(out.classId).toBeUndefined();
    expect(out.skills).toEqual([]);
  });
});
