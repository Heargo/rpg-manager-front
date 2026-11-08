import { Sheet } from '../../world/models/world';

export const NPC_ROLES = ['story', 'merchant', 'enemy'] as const;
export type NpcRole = (typeof NPC_ROLES)[number];

export type Npc = Sheet & {
  roles: NpcRole[];
  description: string;
  /** XP given to the players on defeat (integer, 0 or more). */
  xpReward: number;
  /** Ids of the NPC's inventory entries dropped on defeat. */
  loot: string[];
  merchant?: { buyRatio?: number; sellRatio?: number };
};

export interface NpcFilter {
  search: string;
  roles: NpcRole[];
  minLevel: number;
  maxLevel: number;
}
