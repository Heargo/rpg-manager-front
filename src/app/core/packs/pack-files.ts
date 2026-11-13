import { importConfig } from '../../modules/sprite/helpers/config-export';
import { validateNpcNameList } from '../generators/npc-name-list';
import {
  isClassWordList,
  isSkillWordList,
} from '../generators/pack-word-lists';
import { validateWordList } from '../generators/word-list';
import { PackGenerator } from './pack';

export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_PACK_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 256;

export interface ImageSize {
  width: number;
  height: number;
}

export const failureReason = (error: unknown): string =>
  error instanceof Error ? error.message : 'could not be fetched';

/** The checks of a word list file, by generator; each returns its problems. */
export function listChecker(
  generator: PackGenerator,
): (json: unknown) => string[] {
  switch (generator) {
    case 'items':
      return (json) => {
        const r = validateWordList(json);
        return r.ok ? [] : r.errors;
      };
    case 'npcs':
      return (json) => {
        const r = validateNpcNameList(json);
        return r.ok ? [] : r.errors;
      };
    case 'skills':
      return (json) => (isSkillWordList(json) ? [] : ['not a skill word list']);
    case 'classes':
      return (json) => (isClassWordList(json) ? [] : ['not a class word list']);
  }
}

/** An image file: at most 1 MB, decodable, at most 256 x 256. Gives the error, or its decoded size. */
export async function checkImageFile(
  path: string,
  blob: Blob,
  dimensions: (blob: Blob) => Promise<ImageSize>,
): Promise<{ error: string } | { dims: ImageSize }> {
  if (blob.size > MAX_FILE_BYTES) return { error: `${path}: larger than 1 MB` };
  const dims = await dimensions(blob).catch(() => null);
  if (!dims) return { error: `${path}: not a readable image` };
  if (dims.width > MAX_IMAGE_SIDE || dims.height > MAX_IMAGE_SIDE)
    return {
      error: `${path}: ${dims.width} x ${dims.height}, larger than ${MAX_IMAGE_SIDE} x ${MAX_IMAGE_SIDE}`,
    };
  return { dims };
}

/** A JSON file: at most 1 MB, and its problems when a checker applies (word lists). Returns the errors. */
export function checkJsonFile(
  path: string,
  value: unknown,
  check?: (json: unknown) => string[],
): string[] {
  const length = JSON.stringify(value ?? null).length;
  if (length > MAX_FILE_BYTES) return [`${path}: larger than 1 MB`];
  return (check?.(value) ?? []).map((problem) => `${path}: ${problem}`);
}

/** A materials file against the decoded size of its image; gives the error, if any. */
export function checkMaterialsFile(
  path: string,
  value: unknown,
  dims: ImageSize,
): string | null {
  try {
    importConfig(JSON.stringify(value), dims);
    return null;
  } catch (error) {
    return `${path}: ${failureReason(error)}`;
  }
}
