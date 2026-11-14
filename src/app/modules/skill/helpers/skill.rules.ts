import {
  FormulaError,
  FormulaResult,
  evaluateFormula,
  validateFormula,
} from '../../../core/helpers/formula';
import { ITEM_RARITIES } from '../../../core/models/item';
import { Sheet } from '../../world/models/world';
import {
  Skill,
  SKILL_MAX_LEVEL,
  SKILL_ROLL_COUNT_MAX,
  SKILL_SUCCESS_MODES,
  SKILL_ROLL_FACES_MAX,
  SKILL_TARGETS,
  SKILL_TYPES,
  SkillDraft,
  SkillFilter,
  SkillUsage,
} from '../models/skill';

export interface SkillIssue {
  field: string;
  code: 'required' | 'invalid' | 'formula';
}

export interface SkillAmountScope {
  skillLevel: number;
  /** The caster's level. */
  level: number;
  /** The caster's attribute maxima, by name. */
  maxima: Record<string, number>;
  /** The target's attribute maxima, by name; absent reads 0. */
  targetMaxima?: Record<string, number>;
  /** The dice total of the use (0 when none). */
  roll?: number;
}

export const TARGET_PREFIX = 'target_';

/**
 * The `target_<name>` variables for a formula: one per attribute of the caster or the target (the caster and the target
 * share the world's attributes), valued at the target's maximum, or 0 without a target.
 */
export function targetVariables(
  maxima: Record<string, number>,
  targetMaxima?: Record<string, number>,
): Record<string, number> {
  const names = new Set([
    ...Object.keys(maxima),
    ...Object.keys(targetMaxima ?? {}),
  ]);
  return Object.fromEntries(
    [...names].map((name) => [TARGET_PREFIX + name, targetMaxima?.[name] ?? 0]),
  );
}

const amountFormula = (amount: string) => ({
  preset: 'custom' as const,
  expression: amount,
});

/** The checks of the catalogue: name, levels, cost, active-only fields and every effect amount formula. */
export function validateSkill(
  skill: SkillDraft,
  attributeNames: string[],
): SkillIssue[] {
  const issues: SkillIssue[] = [];
  if (!skill.name.trim()) issues.push({ field: 'name', code: 'required' });
  if (
    !Number.isInteger(skill.maxLevel) ||
    skill.maxLevel < 1 ||
    skill.maxLevel > SKILL_MAX_LEVEL
  ) {
    issues.push({ field: 'maxLevel', code: 'invalid' });
  }
  if (!Number.isInteger(skill.pointCost) || skill.pointCost < 1)
    issues.push({ field: 'pointCost', code: 'invalid' });
  if (skill.type === 'active' && !skill.target)
    issues.push({ field: 'target', code: 'required' });
  if (skill.type === 'passive' && skill.target)
    issues.push({ field: 'target', code: 'invalid' });
  if (
    skill.actionType !== undefined &&
    (skill.type !== 'active' ||
      typeof skill.actionType !== 'string' ||
      !skill.actionType.trim())
  )
    issues.push({ field: 'actionType', code: 'invalid' });
  if (
    skill.range !== undefined &&
    (skill.type !== 'active' ||
      !Number.isInteger(skill.range) ||
      skill.range < 1)
  )
    issues.push({ field: 'range', code: 'invalid' });
  skill.effects.forEach((effect, index) => {
    if (
      validateFormula(
        amountFormula(effect.amount),
        [
          ...attributeNames,
          ...attributeNames.map((name) => TARGET_PREFIX + name),
          'skillLevel',
          'roll',
        ],
        ['level'],
      )
    ) {
      issues.push({ field: `effects.${index}.amount`, code: 'formula' });
    }
  });
  if (skill.type === 'active') {
    const { roll, success } = skill;
    if (roll) {
      if (
        !Number.isInteger(roll.count) ||
        roll.count < 1 ||
        roll.count > SKILL_ROLL_COUNT_MAX
      )
        issues.push({ field: 'roll.count', code: 'invalid' });
      if (
        !Number.isInteger(roll.faces) ||
        roll.faces < 2 ||
        roll.faces > SKILL_ROLL_FACES_MAX
      )
        issues.push({ field: 'roll.faces', code: 'invalid' });
    }
    if (success?.mode === 'threshold' && !Number.isInteger(success.value))
      issues.push({ field: 'success.value', code: 'invalid' });
    if (
      success?.mode === 'formula' &&
      (typeof success.formula !== 'string' ||
        !success.formula.trim() ||
        validateFormula(
          amountFormula(success.formula),
          [
            ...attributeNames,
            ...attributeNames.map((name) => TARGET_PREFIX + name),
            'skillLevel',
            'roll',
          ],
          ['level'],
        ))
    )
      issues.push({ field: 'success.formula', code: 'formula' });
  }
  return issues;
}

/** An effect amount for a caster: `skillLevel`, `level` and the caster's attribute maxima by name. */
export function evaluateSkillAmount(
  amount: string,
  scope: SkillAmountScope,
): FormulaResult {
  return evaluateFormula(amountFormula(amount), {
    level: scope.level,
    base: 0,
    playerLevel: scope.level,
    levels: {
      ...scope.maxima,
      ...targetVariables(scope.maxima, scope.targetMaxima),
      skillLevel: scope.skillLevel,
      roll: scope.roll ?? 0,
    },
  });
}

export type SkillAmountPreview =
  | { ok: true; level1: number; maxLevel: number }
  | { ok: false; error: FormulaError };

/** The amount at skillLevel 1 and at max skillLevel for a level 1 caster whose attribute maxima are 1. */
export function previewSkillAmount(
  amount: string,
  attributeNames: string[],
  maxLevel: number,
): SkillAmountPreview {
  const maxima = Object.fromEntries(attributeNames.map((name) => [name, 1]));
  const at = (skillLevel: number) =>
    evaluateSkillAmount(amount, {
      skillLevel,
      level: 1,
      maxima,
      targetMaxima: maxima,
    });
  const first = at(1);
  if (!first.ok) return { ok: false, error: first.error };
  const last = at(maxLevel);
  if (!last.ok) return { ok: false, error: last.error };
  return { ok: true, level1: first.value, maxLevel: last.value };
}

export function filterSkills(skills: Skill[], filter: SkillFilter): Skill[] {
  const search = filter.search.trim().toLocaleLowerCase();
  return skills.filter(
    (skill) =>
      (!search || skill.name.toLocaleLowerCase().includes(search)) &&
      (!filter.type || skill.type === filter.type),
  );
}

/** The characters and NPCs that have the skill, then the classes whose tree has it. */
export function skillUsages(
  skillId: string,
  sheets: {
    characters: Sheet[];
    npcs: Sheet[];
    classes?: { id: string; name: string; tree: { skillId: string }[] }[];
  },
): SkillUsage[] {
  const has = (sheet: Sheet) =>
    sheet.skills.some((entry) => entry.skillId === skillId);
  return [
    ...sheets.characters
      .filter(has)
      .map((s) => ({ kind: 'character' as const, id: s.id, name: s.name })),
    ...sheets.npcs
      .filter(has)
      .map((s) => ({ kind: 'npc' as const, id: s.id, name: s.name })),
    ...(sheets.classes ?? [])
      .filter((c) => c.tree.some((node) => node.skillId === skillId))
      .map((c) => ({ kind: 'class' as const, id: c.id, name: c.name })),
  ];
}

/** Adds the skill (new id) or replaces it (same id). */
export function upsertSkill(
  skills: Skill[],
  input: SkillDraft,
  newId: () => string,
): { skills: Skill[]; skill: Skill } {
  const trimmed = { ...input, name: input.name.trim() };
  if (input.id && skills.some((entry) => entry.id === input.id)) {
    const skill = { ...trimmed, id: input.id };
    return {
      skills: skills.map((entry) => (entry.id === skill.id ? skill : entry)),
      skill,
    };
  }
  const skill = { ...trimmed, id: newId() };
  return { skills: [...skills, skill], skill };
}

/** The skills with a copy of one of them (new id, name + suffix) at the end. */
export function addSkillCopy(
  skills: Skill[],
  id: string,
  newId: () => string,
  suffix: string,
): Skill[] {
  const source = skills.find((skill) => skill.id === id);
  return source
    ? [
        ...skills,
        { ...structuredClone(source), id: newId(), name: source.name + suffix },
      ]
    : skills;
}

/** A blank skill: an active one-enemy damage skill, to fill in. */
export function emptySkill(): SkillDraft {
  return {
    name: '',
    description: '',
    rarity: 'common',
    type: 'active',
    maxLevel: 1,
    pointCost: 1,
    target: 'one-enemy',
    cooldown: 0,
    effects: [],
  };
}

export const skillToJson = (skill: SkillDraft): string =>
  JSON.stringify(skill, null, 2);

export interface ParsedSkill {
  skill?: SkillDraft;
  issues: SkillIssue[];
}

/** Reads the JSON tab: the text must be a skill object of the right shape and pass the same checks as the form. */
export function parseSkillJson(
  text: string,
  base: SkillDraft,
  attributeNames: string[],
): ParsedSkill {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { issues: [{ field: 'json', code: 'invalid' }] };
  }
  const record = value as Record<string, unknown>;
  const shapeOk =
    typeof value === 'object' &&
    value !== null &&
    typeof record['name'] === 'string' &&
    typeof record['maxLevel'] === 'number' &&
    typeof record['pointCost'] === 'number' &&
    (SKILL_TYPES as readonly unknown[]).includes(record['type']) &&
    (record['target'] === undefined ||
      (SKILL_TARGETS as readonly unknown[]).includes(record['target'])) &&
    (record['roll'] === undefined ||
      (typeof record['roll'] === 'object' && record['roll'] !== null)) &&
    (record['success'] === undefined ||
      (typeof record['success'] === 'object' &&
        record['success'] !== null &&
        (SKILL_SUCCESS_MODES as readonly unknown[]).includes(
          (record['success'] as { mode?: unknown }).mode,
        ))) &&
    (record['actionType'] === undefined ||
      typeof record['actionType'] === 'string') &&
    (record['range'] === undefined || typeof record['range'] === 'number') &&
    Array.isArray(record['effects']) &&
    record['effects'].every(
      (effect) =>
        typeof effect === 'object' &&
        effect !== null &&
        ['damage', 'heal', 'modify'].includes(effect.kind) &&
        typeof effect.attribute === 'string' &&
        typeof effect.amount === 'string' &&
        (effect.kind !== 'modify' || typeof effect.duration === 'number'),
    );
  if (!shapeOk) return { issues: [{ field: 'json', code: 'invalid' }] };
  const skill: SkillDraft = {
    ...(record as unknown as SkillDraft),
    description:
      typeof record['description'] === 'string' ? record['description'] : '',
    rarity: (ITEM_RARITIES as readonly unknown[]).includes(record['rarity'])
      ? (record['rarity'] as Skill['rarity'])
      : base.rarity,
    id: base.id,
  };
  const issues = validateSkill(skill, attributeNames);
  return issues.length ? { issues } : { skill, issues };
}
