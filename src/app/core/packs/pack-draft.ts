import { ItemSlot, ItemType } from '../models/item';
import {
  Pack,
  PACK_FORMAT,
  PACK_GENERATORS,
  PACK_LANGUAGES,
  PackGenerator,
  PackLanguage,
  PackSprite,
  SpriteKind,
} from './pack';

/** A sprite of a draft: the image itself, and for a masked one its materials (the colorizer's JSON text). */
export interface DraftSprite {
  id: string;
  en: string;
  fr: string;
  type: ItemType;
  slot: ItemSlot;
  kind: SpriteKind;
  image: Blob;
  materials?: string;
}

export interface DraftDetails {
  id: string;
  name: Record<PackLanguage, string>;
  description: Record<PackLanguage, string>;
  version: string;
  author: string;
  license: string;
  licenseUrl: string;
  homepage?: string;
}

/** A pack being made, saved on the device. Word lists are the raw JSON values, checked when the pack is built. */
export interface PackDraft {
  id: string;
  updatedAt: number;
  details: DraftDetails;
  generators: Partial<
    Record<PackLanguage, Partial<Record<PackGenerator, unknown>>>
  >;
  sprites: DraftSprite[];
}

/** A pack id from a name: lowercase, accents removed, anything but letters and digits turned into one dash. */
export function slugifyPackId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const wordListPath = (lang: PackLanguage, generator: PackGenerator) =>
  `generators/${lang}/${generator}.json`;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The manifest and the files of a draft, in the documented layout: `generators/<lang>/<generator>.json`,
 * `sprites/<id>.png`, `sprites/<id>.json`. Empty word list slots are left out. Nothing is checked here.
 */
export function buildPack(draft: PackDraft): {
  manifest: Pack;
  files: Map<string, Blob | unknown>;
} {
  const { details } = draft;
  const files = new Map<string, Blob | unknown>();

  const generators: Pack['generators'] = {};
  for (const lang of PACK_LANGUAGES) {
    const slots: Partial<Record<PackGenerator, string>> = {};
    for (const generator of PACK_GENERATORS) {
      const value = draft.generators[lang]?.[generator];
      if (value === undefined) continue;
      const path = wordListPath(lang, generator);
      slots[generator] = path;
      files.set(path, value);
    }
    if (Object.keys(slots).length) generators[lang] = slots;
  }

  const sprites: PackSprite[] = draft.sprites.map((sprite) => {
    const image = `sprites/${sprite.id}.png`;
    files.set(image, sprite.image);
    const entry: PackSprite = {
      id: sprite.id,
      en: sprite.en,
      fr: sprite.fr,
      type: sprite.type,
      slot: sprite.slot,
      kind: sprite.kind,
      image,
    };
    if (sprite.kind === 'masked' && sprite.materials !== undefined) {
      entry.materials = `sprites/${sprite.id}.json`;
      files.set(entry.materials, parseJson(sprite.materials));
    }
    return entry;
  });

  const manifest: Pack = {
    format: PACK_FORMAT,
    id: details.id,
    name: { ...details.name },
    description: { ...details.description },
    version: details.version,
    author: details.author,
    license: details.license,
    licenseUrl: details.licenseUrl,
    ...(details.homepage ? { homepage: details.homepage } : {}),
    generators,
    sprites,
  };
  return { manifest, files };
}
