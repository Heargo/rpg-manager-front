import { CharacterClass } from '../../class/models/class';
import {
  applyCharacterAction,
  CHARACTER_ACTION_KINDS,
  GAME_MASTER_ACTIONS,
  LevelRules,
  parseCharacterAction,
} from '../../character/helpers/character-actions.rules';
import { isOfflineAllowed } from '../../character/helpers/offline-actions.rules';
import { validateWorldDraft } from '../../world/helpers/world-draft.rules';
import { createWorld } from '../../world/helpers/world.factory';
import { Character } from '../../world/models/world';
import { Skill } from '../models/skill';

const skill = (id: string, maxRank: number, pointCost: number, type: Skill['type'] = 'active'): Skill => ({
  id, name: id, description: '', rarity: 'common', type, maxRank, pointCost,
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'rank' }],
});

const skills = [skill('bolt', 3, 2), skill('strike', 2, 1), skill('aura', 1, 1, 'passive'), skill('taught', 5, 4), skill('other', 1, 1)];

const mage: CharacterClass = {
  id: 'mage',
  name: 'Mage',
  description: '',
  tree: [
    { skillId: 'bolt', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 'strike', requires: [{ skillId: 'bolt', rank: 2 }], minLevel: 2, column: 1, row: 0 },
    { skillId: 'aura', requires: [{ skillId: 'strike', rank: 1 }], minLevel: 1, column: 2, row: 0 },
  ],
};
const warrior: CharacterClass = {
  id: 'warrior', name: 'Warrior', description: '',
  tree: [{ skillId: 'other', requires: [], minLevel: 1, column: 0, row: 0 }],
};
const catalogue = { skills, classes: [mage, warrior] };

const rules: LevelRules & { skillPointsPerLevel: number } = {
  levelCurve: { preset: 'growing' },
  statPointsPerLevel: 3,
  skillPointsPerLevel: 2,
  maxLevel: 20,
  barAttributes: {},
};

const sheet = (patch: Partial<Character> = {}): Character => ({
  id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 0, level: 1, money: 0,
  attributes: [], inventory: [], rev: 1, updatedAt: 0,
  classId: 'mage', skillPoints: 4, skills: [],
  ...patch,
});

// Loosely typed: the new actions and the catalogue argument do not exist yet (red); the green step types them.
const apply = applyCharacterAction as unknown as (...args: unknown[]) => { ok: boolean; character?: Character; error?: string };
const act = (character: Character, action: { kind: string; [key: string]: unknown }) =>
  apply([], character, action, rules, catalogue);

describe('skill point world rules', () => {
  it('default to 1 and 1 on a new world', () => {
    let n = 0;
    const world = createWorld({ name: 'W', attributes: [] }, () => `id${n++}`, 0);
    expect(world).toMatchObject({ startingSkillPoints: 1, skillPointsPerLevel: 1 });
  });

  it('accept integers of at least 0 and reject negative and fractional values', () => {
    const draft = { name: 'W', attributes: [] };
    expect(validateWorldDraft({ ...draft, startingSkillPoints: 0, skillPointsPerLevel: 5 } as never)).toEqual({});
    const errors = (patch: object) => validateWorldDraft({ ...draft, ...patch } as never) as Record<string, string>;
    expect(errors({ startingSkillPoints: -1 })['startingSkillPoints']).toBe('world.errors.nonNegativeInteger');
    expect(errors({ skillPointsPerLevel: 1.5 })['skillPointsPerLevel']).toBe('world.errors.nonNegativeInteger');
  });
});

const parse = parseCharacterAction as unknown as (kind: string, payload: unknown) => unknown;

describe('skill action kinds', () => {
  it('are known, and all but learn-skill are game master only', () => {
    for (const kind of ['learn-skill', 'refund-skill', 'grant-skill-points', 'set-skill', 'set-class'] as const)
      expect(CHARACTER_ACTION_KINDS as readonly string[]).toContain(kind);
    const gmOnly = GAME_MASTER_ACTIONS as readonly string[];
    expect(gmOnly).toEqual(expect.arrayContaining(['refund-skill', 'grant-skill-points', 'set-skill', 'set-class']));
    expect(gmOnly).not.toContain('learn-skill');
  });

  it('are parsed from payloads', () => {
    expect(parse('learn-skill', { characterId: 'c', skillId: 'bolt' })).toEqual({ kind: 'learn-skill', skillId: 'bolt' });
    expect(parse('refund-skill', { skillId: 'bolt' })).toEqual({ kind: 'refund-skill', skillId: 'bolt' });
    expect(parse('grant-skill-points', { amount: 3 })).toEqual({ kind: 'grant-skill-points', amount: 3 });
    expect(parse('set-skill', { skillId: 'bolt', rank: 2 })).toEqual({ kind: 'set-skill', skillId: 'bolt', rank: 2 });
    expect(parse('set-class', { classId: 'mage' })).toEqual({ kind: 'set-class', classId: 'mage' });
    expect(parse('learn-skill', { skillId: 3 })).toBeNull();
    expect(parse('set-skill', { skillId: 'bolt', rank: 1.5 })).toBeNull();
    expect(parse('set-class', {})).toBeNull();
  });

  it('only learn-skill can be done offline, and only with the learnSkills toggle', () => {
    const features = { dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false, learnSkills: false };
    const allowed = (f: object, kind: string) => (isOfflineAllowed as (f: unknown, k: string) => boolean)(f, kind);
    expect(allowed(features, 'learn-skill')).toBe(false);
    expect(allowed({ ...features, learnSkills: true }, 'learn-skill')).toBe(true);
    expect(allowed({ ...features, learnSkills: true }, 'set-skill')).toBe(false);
  });
});

describe('level-up skill points', () => {
  it('grants skillPointsPerLevel per level gained', () => {
    const one = act(sheet({ skillPoints: 1 }), { kind: 'grant-xp', amount: 200 });
    expect(one).toMatchObject({ ok: true, character: { level: 2, skillPoints: 3, statPoints: 3 } });
    const two = act(sheet({ skillPoints: 0 }), { kind: 'grant-xp', amount: 500 });
    expect(two).toMatchObject({ ok: true, character: { level: 3, skillPoints: 4, statPoints: 6 } });
    // No level gained, no skill points.
    expect(act(sheet(), { kind: 'grant-xp', amount: 50 })).toMatchObject({ ok: true, character: { level: 1, skillPoints: 4 } });
    expect(act(sheet(), { kind: 'grant-xp', amount: 50 }).character).toHaveProperty('skillPoints', 4);
    expect(two.character).toHaveProperty('skillPoints', 4);
  });
});

describe('learn-skill', () => {
  it('raises the rank by 1 and spends pointCost', () => {
    expect(act(sheet(), { kind: 'learn-skill', skillId: 'bolt' })).toMatchObject({
      ok: true,
      character: { skillPoints: 2, skills: [{ skillId: 'bolt', rank: 1 }] },
    });
    const second = act(sheet({ skills: [{ skillId: 'bolt', rank: 1 }] }), { kind: 'learn-skill', skillId: 'bolt' });
    expect(second).toMatchObject({ ok: true, character: { skillPoints: 2, skills: [{ skillId: 'bolt', rank: 2 }] } });
  });

  it('is refused without a class or for a skill outside the class tree', () => {
    expect(act(sheet({ classId: undefined }), { kind: 'learn-skill', skillId: 'bolt' })).toEqual({ ok: false, error: 'character.errors.notInTree' });
    expect(act(sheet(), { kind: 'learn-skill', skillId: 'other' })).toEqual({ ok: false, error: 'character.errors.notInTree' });
    expect(act(sheet(), { kind: 'learn-skill', skillId: 'nope' })).toEqual({ ok: false, error: 'character.errors.notInTree' });
  });

  it('is refused while a prerequisite or the min level is missing', () => {
    const level2 = sheet({ level: 2, skillPoints: 9, skills: [{ skillId: 'bolt', rank: 1 }] });
    expect(act(level2, { kind: 'learn-skill', skillId: 'strike' })).toEqual({ ok: false, error: 'character.errors.skillLocked' });
    const level1 = sheet({ level: 1, skillPoints: 9, skills: [{ skillId: 'bolt', rank: 2 }] });
    expect(act(level1, { kind: 'learn-skill', skillId: 'strike' })).toEqual({ ok: false, error: 'character.errors.skillLocked' });
    const ready = sheet({ level: 2, skillPoints: 9, skills: [{ skillId: 'bolt', rank: 2 }] });
    expect(act(ready, { kind: 'learn-skill', skillId: 'strike' })).toMatchObject({ ok: true });
  });

  it('is refused at max rank and without enough points', () => {
    const maxed = sheet({ skillPoints: 9, skills: [{ skillId: 'bolt', rank: 3 }] });
    expect(act(maxed, { kind: 'learn-skill', skillId: 'bolt' })).toEqual({ ok: false, error: 'character.errors.skillMaxRank' });
    expect(act(sheet({ skillPoints: 1 }), { kind: 'learn-skill', skillId: 'bolt' })).toEqual({ ok: false, error: 'character.errors.noSkillPoints' });
  });
});

describe('refund-skill', () => {
  it('lowers the rank and gives pointCost back; the last rank removes the skill', () => {
    const two = sheet({ skillPoints: 0, skills: [{ skillId: 'bolt', rank: 2 }] });
    const once = act(two, { kind: 'refund-skill', skillId: 'bolt' });
    expect(once).toMatchObject({ ok: true, character: { skillPoints: 2, skills: [{ skillId: 'bolt', rank: 1 }] } });
    const last = act(sheet({ skillPoints: 0, skills: [{ skillId: 'bolt', rank: 1 }] }), { kind: 'refund-skill', skillId: 'bolt' });
    expect(last).toMatchObject({ ok: true, character: { skillPoints: 2, skills: [] } });
  });

  it('is refused while another learned node needs that rank', () => {
    const learned = sheet({ level: 2, skills: [{ skillId: 'bolt', rank: 2 }, { skillId: 'strike', rank: 1 }] });
    expect(act(learned, { kind: 'refund-skill', skillId: 'bolt' })).toEqual({ ok: false, error: 'character.errors.skillNeeded' });
    const higher = sheet({ level: 2, skills: [{ skillId: 'bolt', rank: 3 }, { skillId: 'strike', rank: 1 }] });
    expect(act(higher, { kind: 'refund-skill', skillId: 'bolt' })).toMatchObject({ ok: true });
  });

  it('gives no points back for a skill taught outside the tree, and refuses an unlearned one', () => {
    const taught = sheet({ skillPoints: 0, skills: [{ skillId: 'taught', rank: 2 }] });
    expect(act(taught, { kind: 'refund-skill', skillId: 'taught' })).toMatchObject({
      ok: true,
      character: { skillPoints: 0, skills: [{ skillId: 'taught', rank: 1 }] },
    });
    expect(act(sheet(), { kind: 'refund-skill', skillId: 'bolt' })).toEqual({ ok: false, error: 'character.errors.skillNotLearned' });
  });
});

describe('grant-skill-points', () => {
  it('adds points, from 1 to 100', () => {
    expect(act(sheet(), { kind: 'grant-skill-points', amount: 5 })).toMatchObject({ ok: true, character: { skillPoints: 9 } });
    expect(act(sheet(), { kind: 'grant-skill-points', amount: 0 })).toEqual({ ok: false, error: 'character.errors.invalidAmount' });
    expect(act(sheet(), { kind: 'grant-skill-points', amount: 101 })).toEqual({ ok: false, error: 'character.errors.invalidAmount' });
  });
});

describe('set-skill', () => {
  it('gives any catalogue skill at any rank for free; 0 removes it', () => {
    const given = act(sheet(), { kind: 'set-skill', skillId: 'taught', rank: 4 });
    expect(given).toMatchObject({ ok: true, character: { skillPoints: 4, skills: [{ skillId: 'taught', rank: 4 }] } });
    const other = act(sheet({ classId: undefined }), { kind: 'set-skill', skillId: 'strike', rank: 2 });
    expect(other).toMatchObject({ ok: true, character: { skills: [{ skillId: 'strike', rank: 2 }] } });
    const removed = act(sheet({ skills: [{ skillId: 'taught', rank: 4 }] }), { kind: 'set-skill', skillId: 'taught', rank: 0 });
    expect(removed).toMatchObject({ ok: true, character: { skills: [], skillPoints: 4 } });
  });

  it('is refused for an unknown skill or a rank above max or below 0', () => {
    expect(act(sheet(), { kind: 'set-skill', skillId: 'nope', rank: 1 })).toEqual({ ok: false, error: 'character.errors.unknownSkill' });
    expect(act(sheet(), { kind: 'set-skill', skillId: 'bolt', rank: 4 })).toEqual({ ok: false, error: 'character.errors.invalidRank' });
    expect(act(sheet(), { kind: 'set-skill', skillId: 'bolt', rank: -1 })).toEqual({ ok: false, error: 'character.errors.invalidRank' });
  });
});

describe('set-class', () => {
  it('changes the class and refunds every tree skill, keeping skills taught outside the tree', () => {
    const learned = sheet({
      level: 2,
      skillPoints: 1,
      skills: [{ skillId: 'bolt', rank: 2 }, { skillId: 'strike', rank: 1 }, { skillId: 'taught', rank: 3 }],
    });
    expect(act(learned, { kind: 'set-class', classId: 'warrior' })).toMatchObject({
      ok: true,
      character: { classId: 'warrior', skillPoints: 1 + 2 * 2 + 1 * 1, skills: [{ skillId: 'taught', rank: 3 }] },
    });
  });

  it('is refused for an unknown class, and sets a first class without refunds', () => {
    expect(act(sheet(), { kind: 'set-class', classId: 'nope' })).toEqual({ ok: false, error: 'character.errors.unknownClass' });
    expect(act(sheet({ classId: undefined }), { kind: 'set-class', classId: 'mage' })).toMatchObject({
      ok: true,
      character: { classId: 'mage', skillPoints: 4 },
    });
  });
});
