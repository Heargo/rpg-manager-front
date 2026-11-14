import { EquipmentSlot, ItemType } from '../models/item';
import { ITEM_KIND_SCHEMA, KindSchema, validateKindTree } from './pack-kinds';

export const PACK_FORMAT = 2;
export const PACK_LANGUAGES = ['en', 'fr'] as const;
export const PACK_GENERATORS = ['items', 'npcs', 'skills', 'classes'] as const;
export const SPRITE_KINDS = ['grayscale', 'masked', 'colored'] as const;

export type PackLanguage = (typeof PACK_LANGUAGES)[number];
export type PackGenerator = (typeof PACK_GENERATORS)[number];
/** The domains a pack can hold content for. */
export type PackDomain = PackGenerator;
export type SpriteKind = (typeof SPRITE_KINDS)[number];

export interface PackSprite {
  id: string;
  label: string;
  domain: PackDomain;
  /** Kind ids in the domain's tree; the first one decides. */
  kinds: string[];
  kind: SpriteKind;
  image: string;
  materials?: string;
}

export interface GradientStop {
  position: number;
  color: string;
}

export interface PackTint {
  gradient: GradientStop[];
}

/** A node of the items tree: a root has a `type`, a child has a `parent`; `slot` only on an equipment chain. */
export interface ItemKindDef {
  parent?: string;
  type?: ItemType;
  slot?: EquipmentSlot;
}

export interface PackDomainDef<K = never> {
  kinds?: Record<string, K>;
  texts?: string;
}

export interface PackDomains {
  items?: PackDomainDef<ItemKindDef>;
  npcs?: PackDomainDef;
  skills?: PackDomainDef;
  classes?: PackDomainDef;
}

export interface Pack {
  format: number;
  id: string;
  /** A pack without language is neutral: no `common`, no `texts`. */
  language?: PackLanguage;
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  licenseUrl: string;
  homepage?: string;
  tints?: Record<string, PackTint>;
  domains?: PackDomains;
  /** The shared language file (params). */
  common?: string;
  sprites: PackSprite[];
}

export type PackValidation =
  | { ok: true; value: Pack; warnings: string[] }
  | { ok: false; errors: string[] };

/** The path of the word list of a generator in a pack, if it has one. */
export const textsPath = (
  pack: Pack,
  generator: PackGenerator,
): string | undefined => pack.domains?.[generator]?.texts;

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const isHttpsUrl = (value: unknown): boolean => {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const DOMAIN_KEY_FIELDS = ['kinds', 'texts'] as const;
/** The kind schema of the domains that have kinds; the others take `texts` only. */
const KIND_SCHEMAS: Partial<Record<PackDomain, KindSchema>> = {
  items: ITEM_KIND_SCHEMA,
};

function validateTints(tints: unknown, errors: string[]): void {
  if (!isObject(tints)) {
    errors.push('tints must be an object');
    return;
  }
  for (const [id, tint] of Object.entries(tints)) {
    const name = `tint "${id}"`;
    if (!ID.test(id)) errors.push(`${name}: id must be kebab-case`);
    const stops = isObject(tint) ? tint['gradient'] : undefined;
    if (!Array.isArray(stops) || stops.length < 2) {
      errors.push(`${name}: gradient needs at least 2 stops`);
      continue;
    }
    stops.forEach((stop, i) => {
      const position = isObject(stop) ? stop['position'] : undefined;
      const color = isObject(stop) ? stop['color'] : undefined;
      if (
        typeof position !== 'number' ||
        !(position >= 0 && position <= 1)
      )
        errors.push(`${name}: stop ${i} position must be between 0 and 1`);
      if (typeof color !== 'string' || !HEX_COLOR.test(color))
        errors.push(`${name}: stop ${i} color must be #rrggbb`);
    });
  }
}

function validateDomains(
  domains: unknown,
  neutral: boolean,
  errors: string[],
  warnings: string[],
): PackDomains | undefined {
  if (!isObject(domains)) {
    errors.push('domains must be an object');
    return undefined;
  }
  const known: Record<string, unknown> = {};
  for (const [domain, def] of Object.entries(domains)) {
    if (!(PACK_GENERATORS as readonly string[]).includes(domain)) {
      warnings.push(`domains.${domain}: unknown domain, ignored`);
      continue;
    }
    known[domain] = def;
    if (!isObject(def)) {
      errors.push(`domains.${domain} must be an object`);
      continue;
    }
    const schema = KIND_SCHEMAS[domain as PackDomain];
    for (const field of Object.keys(def)) {
      if (!(DOMAIN_KEY_FIELDS as readonly string[]).includes(field))
        errors.push(`domains.${domain}: unknown field "${field}"`);
      else if (field === 'kinds' && !schema)
        errors.push(`domains.${domain}: unknown field "kinds" (no kinds yet)`);
    }
    if (def['kinds'] !== undefined && schema)
      errors.push(...validateKindTree(domain, def['kinds'], schema));
    if (def['texts'] !== undefined) {
      if (neutral)
        errors.push(`domains.${domain}.texts needs a pack with a language`);
      else if (!isRelativePath(def['texts']))
        errors.push(
          `domains.${domain}.texts must be a relative path inside the pack`,
        );
    }
  }
  return known as PackDomains;
}

/** Checks a pack manifest read from JSON, listing every problem with the field it concerns. */
export function validatePack(json: unknown): PackValidation {
  if (!isObject(json))
    return { ok: false, errors: ['the manifest is not a JSON object'] };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (json['format'] !== PACK_FORMAT)
    errors.push(`format must be ${PACK_FORMAT}`);
  if (typeof json['id'] !== 'string' || !ID.test(json['id']))
    errors.push('id must be kebab-case (lowercase letters, digits and dashes)');
  if (
    json['language'] !== undefined &&
    !(PACK_LANGUAGES as readonly unknown[]).includes(json['language'])
  )
    errors.push(`language must be one of ${PACK_LANGUAGES.join(', ')}`);
  const neutral = json['language'] === undefined;
  for (const field of ['name', 'description'])
    if (!text(json[field])) errors.push(`${field} is required (a text)`);
  for (const field of ['version', 'author', 'license', 'licenseUrl']) {
    if (!text(json[field])) errors.push(`${field} is required`);
  }
  for (const field of ['licenseUrl', 'homepage'])
    if (
      (field === 'licenseUrl' || json[field] !== undefined) &&
      text(json[field]) &&
      !isHttpsUrl(json[field])
    )
      errors.push(`${field} must be an https URL`);
  if (json['homepage'] !== undefined && !text(json['homepage']))
    errors.push('homepage must be a text');

  if (json['common'] !== undefined) {
    if (neutral) errors.push('common needs a pack with a language');
    else if (!isRelativePath(json['common']))
      errors.push('common must be a relative path inside the pack');
  }
  if (json['tints'] !== undefined) validateTints(json['tints'], errors);
  const domains =
    json['domains'] !== undefined
      ? validateDomains(json['domains'], neutral, errors, warnings)
      : undefined;

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
      if (!text(sprite['label'])) errors.push(`${name}: label is required`);
      if (!(PACK_GENERATORS as readonly unknown[]).includes(sprite['domain']))
        errors.push(
          `${name}: domain must be one of ${PACK_GENERATORS.join(', ')}`,
        );
      const kinds = sprite['kinds'];
      if (
        !Array.isArray(kinds) ||
        kinds.length === 0 ||
        !kinds.every((k) => typeof k === 'string' && ID.test(k))
      )
        errors.push(`${name}: kinds must be a non-empty list of kebab-case ids`);
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
  const value = { sprites: [], ...json } as unknown as Pack;
  if (domains) value.domains = domains;
  return { ok: true, value, warnings };
}

/** The URL of a file listed in a manifest: the path resolved next to the manifest. */
export function packFileUrl(manifestUrl: string, path: string): string {
  return manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1) + path;
}
