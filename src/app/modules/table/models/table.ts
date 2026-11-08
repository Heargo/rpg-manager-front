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

export interface NpcRequest {
  npcId: string;
  shown: boolean;
}

export const TABLE_ROUTES = {
  showIllustration: 'table/show-illustration',
  addQuickImage: 'table/add-quick-image',
  removeQuickImage: 'table/remove-quick-image',
  saveNotes: 'table/save-notes',
  setNpc: 'table/set-npc',
} as const;

export const TABLE_TOPICS = {
  scene: 'table/scene',
  npcs: 'table/npcs',
} as const;

export const NOTES_MAX_LENGTH = 50_000;
export const QUICK_IMAGES_MAX = 30;
export const TABLE_NPCS_MAX = 4;
