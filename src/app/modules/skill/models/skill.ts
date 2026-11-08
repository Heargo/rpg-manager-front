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

export const SKILL_MAX_RANK = 10;

/** What a skill does, on an attribute of the target (by name). Amounts are formulas on `rank`, `level` and attribute maxima. */
export type SkillEffect =
  | { kind: 'damage' | 'heal'; attribute: string; amount: string }
  | { kind: 'modify'; attribute: string; amount: string; duration: number };

/** A catalogue entry: an active skill used in play, or a passive one with permanent modifiers. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  /** Display only. */
  rarity: ItemRarity;
  type: SkillType;
  maxRank: number;
  /** Skill points per rank. */
  pointCost: number;
  /** Active only. */
  target?: SkillTarget;
  /** Active only: taken from the caster's current value of the attribute. */
  cost?: { attribute: string; amount: number };
  /** Active only: turns, 0 = none. */
  cooldown?: number;
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
