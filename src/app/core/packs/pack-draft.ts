import {
  ItemKindDef,
  Pack,
  PackDomains,
  PackTint,
  PACK_FORMAT,
  PACK_GENERATORS,
  PackGenerator,
  PackLanguage,
  PackSprite,
  SpriteKind,
} from './pack';

/** A sprite of a draft: the image itself, and for a masked one its materials (the colorizer's JSON text). */
export interface DraftSprite {
  id: string;
  label: string;
  /** Kinds of the items tree (domain `items`); the first one decides. */
  kinds: readonly string[];
  kind: SpriteKind;
  image: Blob;
  materials?: string;
}

export interface DraftDetails {
  id: string;
  language: PackLanguage;
  name: string;
  description: string;
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
  generators: Partial<Record<PackGenerator, unknown>>;
  /** The shared `generators/common.json` (params), raw like the word lists. */
  common?: unknown;
  /** The pack's own items kinds. */
  kinds: Record<string, ItemKindDef>;
  tints: Record<string, PackTint>;
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

export const COMMON_PATH = 'generators/common.json';

export const wordListPath = (generator: PackGenerator) =>
  `generators/${generator}.json`;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The manifest and the files of a draft, in the documented layout: `generators/<generator>.json`,
 * `sprites/<id>.png`, `sprites/<id>.json`. Empty word list slots are left out. Nothing is checked here.
 */
export function buildPack(draft: PackDraft): {
  manifest: Pack;
  files: Map<string, Blob | unknown>;
} {
  const { details } = draft;
  const files = new Map<string, Blob | unknown>();

  const domains: PackDomains = {};
  for (const generator of PACK_GENERATORS) {
    const value = draft.generators[generator];
    if (value === undefined) continue;
    const path = wordListPath(generator);
    domains[generator] = { texts: path };
    files.set(path, value);
  }
  if (draft.common !== undefined) files.set(COMMON_PATH, draft.common);
  if (Object.keys(draft.kinds).length)
    domains.items = { ...domains.items, kinds: draft.kinds };
  const sprites: PackSprite[] = draft.sprites.map((sprite) => {
    const image = `sprites/${sprite.id}.png`;
    files.set(image, sprite.image);
    const entry: PackSprite = {
      id: sprite.id,
      label: sprite.label,
      domain: 'items',
      kinds: [...sprite.kinds],
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
    language: details.language,
    name: details.name,
    description: details.description,
    version: details.version,
    author: details.author,
    license: details.license,
    licenseUrl: details.licenseUrl,
    ...(details.homepage ? { homepage: details.homepage } : {}),
    tints: draft.tints,
    domains,
    ...(draft.common !== undefined ? { common: COMMON_PATH } : {}),
    sprites,
  };
  return { manifest, files };
}
