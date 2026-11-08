import { AttributeFormula } from '../../../core/helpers/formula';
import { ItemDraft } from '../../../core/models/item';
import { LevelCurve } from '../../character/helpers/level.rules';
import { Npc } from '../../npc/models/npc';

/** An attribute every character of the world has (Strength, Life…). */
export interface WorldAttribute {
  id: string;
  name: string;
  baseValue: number;
  /** How the max grows with the level. */
  formula: AttributeFormula;
  /** Optional hard cap (integer >= 1) on the formula result; equipment bonuses still add on top. */
  cap?: number;
}

/** The editable rules of a world (the rules page, the wizard's Rules step); attributes without an id are new. */
export interface WorldRules {
  attributes: { id?: string; name: string; baseValue: number; formula: AttributeFormula; cap?: number }[];
  startingStatPoints: number;
  startingMoney: number;
  levelCurve: LevelCurve;
  maxLevel: number;
  statPointsPerLevel: number;
  offlineFeatures: OfflineFeatures;
}

/** What players can still do while the host is offline (p2p-rooms spec, Host offline). */
export interface OfflineFeatures {
  dice: boolean;
  notes: boolean;
  spendStatPoints: boolean;
  equip: boolean;
  useConsumables: boolean;
  sell: boolean;
}

/** A catalogue item: a draft with an id and an optional image. */
export interface Item extends ItemDraft {
  id: string;
  /** Content hash of the image in the image store. */
  imageId?: string;
}

export interface CharacterAttribute {
  attributeId: string;
  /** Level of the attribute (stat points spent on it). */
  level: number;
  /** Current value (life after a hit…); max = round(formula at level) + equipped modifiers. */
  current: number;
}

/** An item in a character's inventory: a copy, so editing or deleting the catalogue entry doesn't break it. */
export interface InventoryItem {
  id: string;
  item: Item;
  equipped: boolean;
  /** Position in the inventory grid. */
  position: number;
}

/** What a character and an NPC share: the stats, the inventory, the class and the skills. */
export interface Sheet {
  id: string;
  name: string;
  portraitId?: string;
  /** Bundled image path (under the app's base href) used when there is no stored portrait; sandbox character only. */
  samplePortrait?: string;
  statPoints: number;
  /** Total experience points. */
  xp: number;
  /** Derived from the XP by the world's level curve; kept so formulas and lists read it directly. */
  level: number;
  money: number;
  attributes: CharacterAttribute[];
  inventory: InventoryItem[];
  updatedAt: number;
  classId?: string;
  skillPoints: number;
  skills: SheetSkill[];
}

export interface SheetSkill {
  skillId: string;
  rank: number;
}

export type Character = Sheet & {
  /** The player's profile id; gives the seat back on rejoin. */
  playerId: string;
  /** Bumped by the host on every change (p2p-rooms spec, Player data). */
  rev: number;
  /** The player's personal notes, saved by the host with the record. */
  notes?: string;
};

export interface World {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  attributes: WorldAttribute[];
  /** Attributes shown as bars on the player view, by attribute id. */
  barAttributes: { life?: string; mana?: string };
  startingStatPoints: number;
  levelCurve: LevelCurve;
  /** Highest level a character can reach (2 to 100). */
  maxLevel: number;
  statPointsPerLevel: number;
  startingMoney: number;
  offlineFeatures: OfflineFeatures;
  items: Item[];
  characters: Character[];
  /** The GM's NPC catalogue; host-only, never sent in WorldInfo. */
  npcs: Npc[];
  /** GM notes. */
  notes: string;
  illustrationId?: string;
  quickImageIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** What the "my worlds" list needs, without loading everything. */
export interface WorldSummary {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  characterCount: number;
  updatedAt: number;
}

/** What the new-game wizard collects. */
export interface WorldDraft {
  name: string;
  description?: string;
  imageId?: string;
  attributes: { name: string; baseValue: number; formula: AttributeFormula; cap?: number }[];
  /** Attribute names to show as bars. */
  barAttributes?: { life?: string; mana?: string };
  startingStatPoints?: number;
  levelCurve?: LevelCurve;
  maxLevel?: number;
  statPointsPerLevel?: number;
  startingMoney?: number;
  offlineFeatures?: Partial<OfflineFeatures>;
}

/** What players receive about the hosted world (no catalogue, characters or GM notes). */
export interface WorldInfo {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  attributes: WorldAttribute[];
  barAttributes: { life?: string; mana?: string };
  startingStatPoints: number;
  levelCurve: LevelCurve;
  /** Highest level a character can reach (2 to 100). */
  maxLevel: number;
  statPointsPerLevel: number;
  startingMoney: number;
  offlineFeatures: OfflineFeatures;
}

export const WORLD_TOPICS = {
  info: 'world/info',
} as const;
