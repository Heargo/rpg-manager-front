import { CombatSide } from '../../combat/models/combat';
/** A roll the host drew for someone at the table; everyone replays it from the seed and lands on the values. */
export interface SharedRoll {
  id: string;
  by: { playerId: string; name: string };
  count: number;
  sides: number;
  values: number[];
  /** Seed for the throw's look only. */
  seed: string;
  at: number;
  /** Set for the dice of a combat action: what the recap banner shows (names, never attributes). */
  combat?: SharedCombatRoll;
}

/** Who takes part in a combat roll: the name, the side and the public portrait id (never attributes). */
export interface CombatRollWho {
  name: string;
  side: CombatSide;
  portraitId?: string;
}

/** Stacking of the dice overlay, and of the combat recap banner that must stay above it. */
export const DICE_OVERLAY_Z_INDEX = 1200;
export const COMBAT_BANNER_Z_INDEX = 1300;

/** What a combat action adds to its shared roll. */
export interface SharedCombatRoll {
  caster: CombatRollWho;
  skillName: string;
  targets: CombatRollWho[];
  /** The results waiting for the GM (none when the GM validation is off). */
  pendingIds: string[];
  total: number;
  success: boolean;
}

export interface SharedRollRequest {
  count: number;
  sides: number;
}

export const DICE_ROUTES = {
  roll: 'dice/roll',
} as const;

export const DICE_TOPICS = {
  /** The table's recent shared rolls, newest first. */
  rolls: 'dice/rolls',
} as const;

export const SHARED_ROLLS_KEPT = 20;
