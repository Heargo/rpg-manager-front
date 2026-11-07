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
