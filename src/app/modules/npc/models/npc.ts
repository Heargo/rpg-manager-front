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

/** What the players see of the NPCs of one role (world rules). */
export interface NpcVisibility {
  description: boolean;
  level: boolean;
  lifeBar: boolean;
  lifeNumbers: boolean;
  attributes: boolean;
  equipment: boolean;
}

export type NpcVisibilityRules = Record<NpcRole, NpcVisibility>;

/** An NPC shown on the table: what the world's visibility rules let the players see, and nothing else. */
export interface PublicNpc {
  id: string;
  name: string;
  portraitId?: string;
  description?: string;
  level?: number;
  lifeBar?: { percent: number };
  life?: { current: number; max: number };
  attributes?: { name: string; current: number; max: number }[];
  equipment?: { name: string }[];
}
