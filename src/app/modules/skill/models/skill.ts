import { ItemRarity } from '../../../core/models/item';

export const SKILL_TYPES = ['active', 'passive'] as const;
export type SkillType = (typeof SKILL_TYPES)[number];

export const SKILL_TARGETS = [
  'self',
  'one-ally',
  'one-enemy',
  'all-allies',
  'all-enemies',
  'area',
] as const;
export type SkillTarget = (typeof SKILL_TARGETS)[number];

export const SKILL_MAX_LEVEL = 10;

/** What a skill does, on an attribute of the target (by name). Amounts are formulas on `level`, `level` and attribute maxima. */
export type SkillEffect =
  | { kind: 'damage' | 'heal'; attribute: string; amount: string }
  | { kind: 'modify'; attribute: string; amount: string; duration: number };

export const SKILL_ROLL_COUNT_MAX = 100;
export const SKILL_ROLL_FACES_MAX = 1000;

/** The dice an active skill rolls when used. */
export interface SkillRoll {
  count: number;
  faces: number;
}
export const DEFAULT_SKILL_ROLL: SkillRoll = { count: 1, faces: 20 };

/** When a use succeeds: always, the dice total reaching a value, or a formula that is 0 or more. */
export type SkillSuccess =
  | { mode: 'always' }
  | { mode: 'threshold'; value: number }
  | { mode: 'formula'; formula: string };
export const SKILL_SUCCESS_MODES = ['always', 'threshold', 'formula'] as const;

/** A catalogue entry: an active skill used in play, or a passive one with permanent modifiers. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  /** Display only. */
  rarity: ItemRarity;
  type: SkillType;
  maxLevel: number;
  /** Skill points per level. */
  pointCost: number;
  /** Active only. */
  target?: SkillTarget;
  /** Active only: taken from the caster's current value of the attribute. */
  cost?: { attribute: string; amount: number };
  /** Active only: turns, 0 = none. */
  cooldown?: number;
  /** Active only: the dice rolled on use (default 1d20). Effect amounts may read `roll`. */
  roll?: SkillRoll;
  /** Active only: when a use succeeds (default always). */
  success?: SkillSuccess;
  effects: SkillEffect[];
}

/** A skill before it is saved: a new one has no id yet. */
export type SkillDraft = Omit<Skill, 'id'> & { id?: string };

export interface SkillFilter {
  search: string;
  type: SkillType | undefined;
}

/** A sheet or class that has a skill. */
export interface SkillUsage {
  kind: 'character' | 'npc' | 'class';
  id: string;
  name: string;
}
