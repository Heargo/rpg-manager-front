import { Base64Image } from '../../../core/business/image.business';
import { CharacterClass } from '../../class/models/class';
import { ItemModifier } from '../../../core/models/item';
import { Skill } from '../../skill/models/skill';

/** What `class/mine` answers: the player's own class (null without one), its tree's skills and their sheet's skills. */
export interface ClassView {
  characterClass: CharacterClass | null;
  skills: Skill[];
}

export interface CreateCharacterRequest {
  name: string;
  /** Already shrunk by the player's device; the host stores it and keeps its hash as `portraitId`. */
  portrait?: Base64Image;
  /** Required when the world has classes, absent when it has none; the host checks it. */
  classId?: string;
}

/** What a player sees of a class when choosing: never the tree nor the starting items. */
export interface ClassChoice {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  bonuses?: ItemModifier[];
}

export const CHARACTER_ROUTES = {
  create: 'character/create',
  saveNotes: 'character/save-notes',
  myClass: 'class/mine',
  classChoices: 'class/choices',
} as const;

/** One route per character action: `character/<kind>`, payload `{ characterId, ...action fields }`. */
export function characterActionRoute(kind: string): string {
  return `character/${kind}`;
}

export const CHARACTER_TOPICS = {
  list: 'character/list',
} as const;

export const CHARACTER_NAME_MAX_LENGTH = 32;

/** Portraits travel in one data channel message (max ~256 KB): base64 of a 512 px WebP stays far below. */
export const PORTRAIT_MAX_BASE64_LENGTH = 200_000;

/** Personal notes of a player, saved with their record. */
export const CHARACTER_NOTES_MAX_LENGTH = 5000;

/** Most actions a player can queue while the host is offline. */
export const MAX_QUEUED_ACTIONS = 200;
