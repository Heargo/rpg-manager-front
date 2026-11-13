import {
  EQUIPMENT_SLOTS,
  ITEM_TYPES,
  ItemSlot,
  ItemType,
} from '../models/item';

export const PACK_FORMAT = 1;
export const PACK_LANGUAGES = ['en', 'fr'] as const;
export const PACK_GENERATORS = ['items', 'npcs', 'skills', 'classes'] as const;
export const SPRITE_KINDS = ['grayscale', 'masked', 'colored'] as const;

export type PackLanguage = (typeof PACK_LANGUAGES)[number];
export type PackGenerator = (typeof PACK_GENERATORS)[number];
export type SpriteKind = (typeof SPRITE_KINDS)[number];

export interface PackSprite {
  id: string;
  en: string;
  fr: string;
  type: ItemType;
  slot: ItemSlot;
  kind: SpriteKind;
  image: string;
  materials?: string;
}

export interface Pack {
  format: number;
  id: string;
  name: Record<PackLanguage, string>;
  description: Record<PackLanguage, string>;
  version: string;
  author: string;
  license: string;
  licenseUrl: string;
  homepage?: string;
  generators: Partial<
    Record<PackLanguage, Partial<Record<PackGenerator, string>>>
  >;
  sprites: PackSprite[];
}

export type PackValidation =
  { ok: true; value: Pack } | { ok: false; errors: string[] };

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** A path relative to the manifest: no absolute path, no `..`, no URL scheme, no backslash. */
function isRelativePath(path: unknown): path is string {
  if (!text(path)) return false;
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    /^[a-z][a-z0-9+.-]*:/i.test(path)
  )
    return false;
  return !path.split('/').some((part) => part === '..' || part === '');
}

/** Checks a pack manifest read from JSON, listing every problem with the field it concerns. */
export function validatePack(json: unknown): PackValidation {
  if (!isObject(json))
    return { ok: false, errors: ['the manifest is not a JSON object'] };
  const errors: string[] = [];

  if (json['format'] !== PACK_FORMAT)
    errors.push(`format must be ${PACK_FORMAT}`);
  if (typeof json['id'] !== 'string' || !ID.test(json['id']))
    errors.push('id must be kebab-case (lowercase letters, digits and dashes)');
  for (const field of ['name', 'description']) {
    const value = json[field];
    for (const lang of PACK_LANGUAGES) {
      if (!isObject(value) || !text(value[lang]))
        errors.push(`${field}.${lang} is required`);
    }
  }
  for (const field of ['version', 'author', 'license', 'licenseUrl']) {
    if (!text(json[field])) errors.push(`${field} is required`);
  }
  if (json['homepage'] !== undefined && !text(json['homepage']))
    errors.push('homepage must be a text');

  const generators = json['generators'];
  if (generators !== undefined) {
    if (!isObject(generators)) errors.push('generators must be an object');
    else
      for (const [lang, files] of Object.entries(generators)) {
        if (!(PACK_LANGUAGES as readonly string[]).includes(lang)) {
          errors.push(`generators.${lang}: unknown language`);
        } else if (!isObject(files)) {
          errors.push(`generators.${lang} must be an object`);
        } else
          for (const [generator, path] of Object.entries(files)) {
            if (!(PACK_GENERATORS as readonly string[]).includes(generator))
              errors.push(`generators.${lang}.${generator}: unknown generator`);
            else if (!isRelativePath(path))
              errors.push(
                `generators.${lang}.${generator} must be a relative path inside the pack`,
              );
          }
      }
  }

  const sprites = json['sprites'] ?? [];
  if (!Array.isArray(sprites)) errors.push('sprites must be a list');
  else {
    const seen = new Set<string>();
    sprites.forEach((sprite, i) => {
      if (!isObject(sprite)) {
        errors.push(`sprites[${i}] must be an object`);
        return;
      }
      const id = sprite['id'];
      const name =
        typeof id === 'string' && id ? `sprite "${id}"` : `sprites[${i}]`;
      if (typeof id !== 'string' || !ID.test(id.replace(/_/g, '-')))
        errors.push(`${name}: id is invalid`);
      else if (seen.has(id)) errors.push(`${name}: id is used twice`);
      else seen.add(id);
      for (const lang of PACK_LANGUAGES)
        if (!text(sprite[lang]))
          errors.push(`${name}: ${lang} label is required`);
      if (!(ITEM_TYPES as readonly string[]).includes(sprite['type'] as string))
        errors.push(`${name}: type must be one of ${ITEM_TYPES.join(', ')}`);
      if (
        sprite['slot'] !== 'none' &&
        !(EQUIPMENT_SLOTS as readonly string[]).includes(
          sprite['slot'] as string,
        )
      )
        errors.push(
          `${name}: slot must be none or one of ${EQUIPMENT_SLOTS.join(', ')}`,
        );
      const kind = sprite['kind'];
      if (!(SPRITE_KINDS as readonly string[]).includes(kind as string))
        errors.push(`${name}: kind must be one of ${SPRITE_KINDS.join(', ')}`);
      if (!isRelativePath(sprite['image']))
        errors.push(`${name}: image must be a relative path inside the pack`);
      if (kind === 'masked' && sprite['materials'] === undefined)
        errors.push(`${name}: a masked sprite needs materials`);
      else if (
        sprite['materials'] !== undefined &&
        !isRelativePath(sprite['materials'])
      )
        errors.push(
          `${name}: materials must be a relative path inside the pack`,
        );
    });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { sprites: [], generators: {}, ...json } as unknown as Pack,
  };
}

/** The URL of a file listed in a manifest: the path resolved next to the manifest. */
export function packFileUrl(manifestUrl: string, path: string): string {
  return manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1) + path;
}
