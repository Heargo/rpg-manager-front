import { PublicNpc } from '../../npc/models/npc';

/** What every device at the table sees, published by the host. */
export interface TableScene {
  /** The picture shown to everyone (content hash in the image store). */
  illustrationId?: string;
}

export interface ShowIllustrationRequest {
  /** null clears the illustration. */
  imageId: string | null;
}

export interface QuickImageRequest {
  imageId: string;
}

export interface SaveNotesRequest {
  notes: string;
}

export type EncounterKind = 'story' | 'merchant';

export interface StartEncounterRequest {
  kind: EncounterKind;
  npcId: string;
}

/** A story or merchant encounter, as every device sees it: the NPC's public card. */
export interface TableEncounter {
  kind: EncounterKind;
  npc: PublicNpc;
}

export const TABLE_ROUTES = {
  showIllustration: 'table/show-illustration',
  addQuickImage: 'table/add-quick-image',
  removeQuickImage: 'table/remove-quick-image',
  saveNotes: 'table/save-notes',
  startEncounter: 'table/start-encounter',
  endEncounter: 'table/end-encounter',
} as const;

export const TABLE_TOPICS = {
  scene: 'table/scene',
  encounter: 'table/encounter',
} as const;

export const NOTES_MAX_LENGTH = 50_000;
export const QUICK_IMAGES_MAX = 30;
