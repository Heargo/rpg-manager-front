import { World } from '../../world/models/world';
import {
  NOTES_MAX_LENGTH,
  QUICK_IMAGES_MAX,
  StartEncounterRequest,
  TableScene,
} from '../models/table';

const IMAGE_ID = /^[0-9a-f]{64}$/;

export function isImageId(value: unknown): value is string {
  return typeof value === 'string' && IMAGE_ID.test(value);
}

export function toTableScene(world: Pick<World, 'illustrationId'>): TableScene {
  return { illustrationId: world.illustrationId };
}

/** The image id of a request (`{ imageId }`), or null when it's missing or not an image id. */
export function requestedImageId(payload: unknown): string | null {
  const imageId = (payload as { imageId?: unknown } | null)?.imageId;
  return isImageId(imageId) ? imageId : null;
}

/** Translation key of what's wrong with a notes request, or null when it's fine. */
export function validateNotes(payload: unknown): string | null {
  const notes = (payload as { notes?: unknown } | null)?.notes;
  if (typeof notes !== 'string') return 'table.errors.invalid';
  if (notes.length > NOTES_MAX_LENGTH) return 'table.errors.notesTooLong';
  return null;
}

export function showIllustration(world: World, imageId: string | null): World {
  return { ...world, illustrationId: imageId ?? undefined };
}

/** Adds a quick image at the front; one already there moves to the front. Refuses past the limit. */
export function addQuickImage(world: World, imageId: string): World | 'full' {
  const others = world.quickImageIds.filter((id) => id !== imageId);
  if (others.length >= QUICK_IMAGES_MAX) return 'full';
  return { ...world, quickImageIds: [imageId, ...others] };
}

/** Removes a quick image; the illustration stays on the table even if it was that image. */
export function removeQuickImage(world: World, imageId: string): World {
  return {
    ...world,
    quickImageIds: world.quickImageIds.filter((id) => id !== imageId),
  };
}

export function saveNotes(world: World, notes: string): World {
  return { ...world, notes };
}

/** The encounter request (`{ kind, npcId }`), or null when it isn't one. */
export function parseEncounterRequest(
  payload: unknown,
): StartEncounterRequest | null {
  const { kind, npcId } = (payload ?? {}) as Record<string, unknown>;
  return (kind === 'story' || kind === 'merchant') &&
    typeof npcId === 'string' &&
    npcId
    ? { kind, npcId }
    : null;
}
