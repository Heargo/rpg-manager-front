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
  SKILL_MAX_RANK,
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
  rank: number;
  /** The caster's level. */
  level: number;
  /** The caster's attribute maxima, by name. */
  maxima: Record<string, number>;
}

const amountFormula = (amount: string) => ({
  preset: 'custom' as const,
  expression: amount,
});

/** The checks of the catalogue: name, ranks, cost, active-only fields and every effect amount formula. */
export function validateSkill(
  skill: SkillDraft,
  attributeNames: string[],
): SkillIssue[] {
  const issues: SkillIssue[] = [];
  if (!skill.name.trim()) issues.push({ field: 'name', code: 'required' });
  if (
    !Number.isInteger(skill.maxRank) ||
    skill.maxRank < 1 ||
    skill.maxRank > SKILL_MAX_RANK
  ) {
    issues.push({ field: 'maxRank', code: 'invalid' });
  }
  if (!Number.isInteger(skill.pointCost) || skill.pointCost < 1)
    issues.push({ field: 'pointCost', code: 'invalid' });
  if (skill.type === 'active' && !skill.target)
    issues.push({ field: 'target', code: 'required' });
  if (skill.type === 'passive' && skill.target)
    issues.push({ field: 'target', code: 'invalid' });
  skill.effects.forEach((effect, index) => {
    if (
      validateFormula(
        amountFormula(effect.amount),
        [...attributeNames, 'rank'],
        ['level'],
      )
    ) {
      issues.push({ field: `effects.${index}.amount`, code: 'formula' });
    }
  });
  return issues;
}

/** An effect amount for a caster: `rank`, `level` and the caster's attribute maxima by name. */
export function evaluateSkillAmount(
  amount: string,
  scope: SkillAmountScope,
): FormulaResult {
  return evaluateFormula(amountFormula(amount), {
    level: scope.level,
    base: 0,
    playerLevel: scope.level,
    levels: { ...scope.maxima, rank: scope.rank },
  });
}

export type SkillAmountPreview =
  | { ok: true; rank1: number; maxRank: number }
  | { ok: false; error: FormulaError };

/** The amount at rank 1 and at max rank for a level 1 caster whose attribute maxima are 1. */
export function previewSkillAmount(
  amount: string,
  attributeNames: string[],
  maxRank: number,
): SkillAmountPreview {
  const maxima = Object.fromEntries(attributeNames.map((name) => [name, 1]));
  const at = (rank: number) =>
    evaluateSkillAmount(amount, { rank, level: 1, maxima });
  const first = at(1);
  if (!first.ok) return { ok: false, error: first.error };
  const last = at(maxRank);
  if (!last.ok) return { ok: false, error: last.error };
  return { ok: true, rank1: first.value, maxRank: last.value };
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
    maxRank: 1,
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
    typeof record['maxRank'] === 'number' &&
    typeof record['pointCost'] === 'number' &&
    (SKILL_TYPES as readonly unknown[]).includes(record['type']) &&
    (record['target'] === undefined ||
      (SKILL_TARGETS as readonly unknown[]).includes(record['target'])) &&
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
