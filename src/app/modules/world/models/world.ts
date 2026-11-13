import { AttributeFormula } from '../../../core/helpers/formula';
import { ItemDraft, ItemModifier } from '../../../core/models/item';
import { LevelCurve } from '../../character/helpers/level.rules';
import { Npc, NpcVisibilityRules } from '../../npc/models/npc';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
import { Encounter } from '../../combat/models/combat';

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

export const INITIATIVE_MODES = ['rolled', 'typed', 'free'] as const;
export type InitiativeMode = (typeof INITIATIVE_MODES)[number];

/** The optional steps of a combat; all on by default (World rules, Combat section). */
export interface CombatSteps {
  initiative: boolean;
  actionCounters: boolean;
  gmValidation: boolean;
  defence: boolean;
  rewards: boolean;
}

/** How a world runs combat (the rules page's Combat section, the wizard). Formulas read `level` and attribute maxima by name. */
export interface CombatRules {
  /** Which steps of a combat are played; a step that is off is skipped. */
  steps: CombatSteps;
  /** Name of the attribute that is the life (0 = down); combat cannot start without one. */
  lifeAttribute?: string;
  initiative: {
    mode: InitiativeMode;
    /** Dice rolled for each combatant in `rolled` mode. */
    dice: { count: number; faces: number };
    /** Added to the dice total. */
    formula: string;
  };
  /** What a combatant can do on its turn, each with how many per turn. */
  actionTypes: { name: string; count: number }[];
  grid: {
    enabled: boolean;
    columns: number;
    rows: number;
    /** The map drawn under the grid (an image id). */
    imageId?: string;
  };
  /** Movement per turn (formula). */
  movement: string;
  /** Damage of a basic attack (formula), none when omitted. */
  basicAttack?: string;
  /** What a hit loses to defence (formula), none when omitted. */
  defence?: string;
}

/** The editable rules of a world (the rules page, the wizard's Rules step); attributes without an id are new. */
export interface WorldRules {
  attributes: {
    id?: string;
    name: string;
    baseValue: number;
    formula: AttributeFormula;
    cap?: number;
  }[];
  startingStatPoints: number;
  startingMoney: number;
  levelCurve: LevelCurve;
  maxLevel: number;
  statPointsPerLevel: number;
  startingSkillPoints: number;
  skillPointsPerLevel: number;
  offlineFeatures: OfflineFeatures;
  /** Ids of the active packs (no validation: an empty list is allowed); kept as is when omitted. */
  packs?: string[];
  /** Active skills roll dice when used (default on when omitted). */
  skillRollsEnabled?: boolean;
  /** Selling anywhere (the sheet's Sell) is allowed (default on when omitted). */
  sellAnywhere?: boolean;
  /** What Sell anywhere pays, times the item price (0 to 10, default 1). */
  sellAnywhereRatio?: number;
  /** What merchants charge, times the item price (0 to 10, default 1). */
  merchantBuyRatio?: number;
  /** What merchants pay, times the item price (0 to 10, default 0.5). */
  merchantSellRatio?: number;
  /** Kept as is when omitted. */
  npcVisibility?: NpcVisibilityRules;
  /** Kept as is when omitted. */
  combat?: CombatRules;
}

/** What players can still do while the host is offline (p2p-rooms spec, Host offline). */
export interface OfflineFeatures {
  dice: boolean;
  notes: boolean;
  spendStatPoints: boolean;
  equip: boolean;
  useConsumables: boolean;
  sell: boolean;
  learnSkills: boolean;
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
  level: number;
}

export type Character = Sheet & {
  /** The player's profile id; gives the seat back on rejoin. */
  playerId: string;
  /** Bumped by the host on every change (p2p-rooms spec, Player data). */
  rev: number;
  /** The player's personal notes, saved by the host with the record. */
  notes?: string;
  /** Set on the published list only: the name of the class, never its tree. */
  className?: string;
  /** Set on the published list only: the class's always-on bonuses, so every device computes the same maxima. */
  classBonuses?: ItemModifier[];
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
  startingSkillPoints: number;
  skillPointsPerLevel: number;
  startingMoney: number;
  offlineFeatures: OfflineFeatures;
  /** Ids of the active packs; a stored world without them reads as none. */
  packs: string[];
  /** Active skills roll dice when used (default on when omitted). */
  skillRollsEnabled?: boolean;
  /** Selling anywhere (the sheet's Sell) is allowed (default on when omitted). */
  sellAnywhere?: boolean;
  /** What Sell anywhere pays, times the item price (0 to 10, default 1). */
  sellAnywhereRatio?: number;
  /** What merchants charge, times the item price (0 to 10, default 1). */
  merchantBuyRatio?: number;
  /** What merchants pay, times the item price (0 to 10, default 0.5). */
  merchantSellRatio?: number;
  /** Per NPC role, what the players see of an NPC shown on the table. */
  npcVisibility: NpcVisibilityRules;
  combat: CombatRules;
  /** The encounter in progress, saved with the world so it survives a host reload. */
  encounter?: Encounter;
  items: Item[];
  characters: Character[];
  /** The GM's NPC catalogue; host-only, never sent in WorldInfo. */
  npcs: Npc[];
  /** The GM's skill catalogue; host-only, never sent in WorldInfo. */
  skills: Skill[];
  /** The GM's classes, with their skill trees; host-only, never sent in WorldInfo. */
  classes: CharacterClass[];
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
  attributes: {
    name: string;
    baseValue: number;
    formula: AttributeFormula;
    cap?: number;
  }[];
  /** Attribute names to show as bars. */
  barAttributes?: { life?: string; mana?: string };
  startingStatPoints?: number;
  levelCurve?: LevelCurve;
  maxLevel?: number;
  statPointsPerLevel?: number;
  startingSkillPoints?: number;
  skillPointsPerLevel?: number;
  startingMoney?: number;
  offlineFeatures?: Partial<OfflineFeatures>;
  /** Ids of the active packs; the Base of the app language when the library creates the world without. */
  packs?: string[];
  skillRollsEnabled?: boolean;
  /** Selling anywhere (the sheet's Sell) is allowed (default on when omitted). */
  sellAnywhere?: boolean;
  /** What Sell anywhere pays, times the item price (0 to 10, default 1). */
  sellAnywhereRatio?: number;
  /** What merchants charge, times the item price (0 to 10, default 1). */
  merchantBuyRatio?: number;
  /** What merchants pay, times the item price (0 to 10, default 0.5). */
  merchantSellRatio?: number;
  npcVisibility?: NpcVisibilityRules;
  /** The wizard's combat settings; the defaults when omitted. */
  combat?: CombatRules;
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
  skillPointsPerLevel: number;
  startingMoney: number;
  offlineFeatures: OfflineFeatures;
  /** Ids of the world's active packs. */
  packs: string[];
  skillRollsEnabled?: boolean;
  sellAnywhere?: boolean;
  sellAnywhereRatio?: number;
}

export const WORLD_TOPICS = {
  info: 'world/info',
} as const;
