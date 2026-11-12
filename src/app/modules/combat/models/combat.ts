import { InventoryItem, SheetSkill } from '../../world/models/world';

export type CombatSide = 'party' | 'ally' | 'enemy';

export interface CombatAttribute {
  name: string;
  current: number;
  max: number;
}

/** A temporary change to an attribute (a buff or debuff), ticking down at the start of its owner's turn. */
export interface CombatEffect {
  attribute: string;
  amount: number;
  duration: number;
}

export interface Combatant {
  id: string;
  name: string;
  side: CombatSide;
  /** The character this combatant plays. */
  characterId?: string;
  /** The catalogue NPC this combatant is a copy of. */
  npcId?: string;
  level: number;
  attributes: CombatAttribute[];
  skills: SheetSkill[];
  /** Turns left before a skill can be used again, by skill id (absent = ready). */
  cooldowns: Record<string, number>;
  actions: { name: string; count: number; used: number }[];
  effects: CombatEffect[];
  statuses: string[];
  initiative?: number;
  down: boolean;
  /** What defeating an enemy gives the players. */
  xpReward: number;
  money: number;
  loot: InventoryItem[];
}

export interface PendingEffect {
  kind: 'damage' | 'heal' | 'modify';
  attribute: string;
  amount: number;
  /** Turns a `modify` lasts. */
  duration?: number;
}

/** The result of a skill use, waiting for the GM (one per target). */
export interface PendingResult {
  id: string;
  casterId: string;
  targetId: string;
  skillId: string;
  rolls: number[];
  total: number;
  success: boolean;
  effects: PendingEffect[];
  error?: string;
}

export type CombatLogEntry =
  | {
      kind: 'skill';
      round: number;
      casterId: string;
      skillId: string;
      rolls: number[];
      total: number;
      success: boolean;
    }
  | { kind: 'apply'; round: number; targetId: string; skillId: string };

export interface EncounterState {
  /** Combatants in turn order. */
  combatants: Combatant[];
  round: number;
  /** Index of the active combatant in `combatants`. */
  turn: number;
  /** Name of the life attribute (0 = down). */
  lifeAttribute: string;
  pending: PendingResult[];
  log: CombatLogEntry[];
  /** Counter for the ids of pending results. */
  seq: number;
}

export interface Encounter extends EncounterState {
  /** The state before the last change, for one-step undo. */
  previous?: EncounterState;
}
