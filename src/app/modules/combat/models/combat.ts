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
  /** Token cell on the grid. */
  position?: { x: number; y: number };
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

/** What a combatant shows to a viewer: the NPC fields only when the world's visibility rules (or the GM's own view) allow. */
export interface CombatantView {
  id: string;
  name: string;
  side: CombatSide;
  portraitId?: string;
  statuses: string[];
  down: boolean;
  initiative?: number;
  position?: { x: number; y: number };
  actions: { name: string; count: number; used: number }[];
  level?: number;
  description?: string;
  lifeBar?: { percent: number };
  life?: { current: number; max: number };
  attributes?: CombatAttribute[];
  equipment?: { name: string }[];
}

/** The `combat/state` topic: the encounter as one viewer sees it. */
export interface CombatView {
  round: number;
  activeId?: string;
  combatants: CombatantView[];
  pending: PendingResult[];
  log: CombatLogEntry[];
}

export const COMBAT_ROUTES = {
  start: 'combat/start',
  add: 'combat/add',
  remove: 'combat/remove',
  reorder: 'combat/reorder',
  edit: 'combat/edit',
  apply: 'combat/apply',
  dismiss: 'combat/dismiss',
  undo: 'combat/undo',
  end: 'combat/end',
  initiative: 'combat/initiative',
  useSkill: 'combat/use-skill',
  useItem: 'combat/use-item',
  move: 'combat/move',
  tickAction: 'combat/tick-action',
  endTurn: 'combat/end-turn',
} as const;

export const COMBAT_TOPICS = { state: 'combat/state' } as const;

/** A change the GM makes by hand to a combatant. */
export type CombatEdit =
  | { kind: 'damage' | 'heal'; amount: number }
  | { kind: 'add-status' | 'remove-status'; status: string }
  | { kind: 'attribute'; attribute: string; current?: number; max?: number };

export interface CombatRewards {
  xp: { characterId: string; amount: number }[];
}
