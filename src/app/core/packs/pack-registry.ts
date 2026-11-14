import { PACK_LANGUAGES, PackLanguage } from './pack';

export const REGISTRY_FORMAT = 1;

/** An official pack as listed in `public/packs/index.json`. */
export interface PackRegistryEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Download size in bytes. */
  size: number;
  /** Number of sprites. */
  sprites: number;
  language: PackLanguage;
  /** Bundled with the app and always on (Base). */
  builtIn?: boolean;
}

export interface PackRegistry {
  format: number;
  packs: PackRegistryEntry[];
}

export type RegistryValidation =
  { ok: true; value: PackRegistry } | { ok: false; errors: string[] };

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Checks the registry file, listing every problem with the field it concerns. */
export function validateRegistry(json: unknown): RegistryValidation {
  if (!isObject(json))
    return { ok: false, errors: ['the registry is not a JSON object'] };
  const errors: string[] = [];
  if (json['format'] !== REGISTRY_FORMAT)
    errors.push(`format must be ${REGISTRY_FORMAT}`);
  const packs = json['packs'];
  if (!Array.isArray(packs)) {
    errors.push('packs must be a list');
    return { ok: false, errors };
  }
  const seen = new Set<string>();
  packs.forEach((entry, i) => {
    if (!isObject(entry)) {
      errors.push(`packs[${i}] must be an object`);
      return;
    }
    const id = entry['id'];
    const where = typeof id === 'string' && id ? `pack "${id}"` : `packs[${i}]`;
    if (typeof id !== 'string' || !ID.test(id))
      errors.push(`${where}: id must be kebab-case`);
    else if (seen.has(id))
      errors.push(`${where}: id is used twice (duplicate)`);
    else seen.add(id);
    for (const field of ['name', 'description'])
      if (!text(entry[field])) errors.push(`${where}: ${field} is required`);
    for (const field of ['author', 'license', 'licenseUrl'])
      if (!text(entry[field])) errors.push(`${where}: ${field} is required`);
    if (!count(entry['size']))
      errors.push(`${where}: size must be a count of bytes`);
    if (!count(entry['sprites']))
      errors.push(`${where}: sprites must be a count`);
    if (!(PACK_LANGUAGES as readonly unknown[]).includes(entry['language']))
      errors.push(`${where}: language must be one of ${PACK_LANGUAGES.join(', ')}`);
    if (entry['builtIn'] !== undefined && typeof entry['builtIn'] !== 'boolean')
      errors.push(`${where}: builtIn must be true or false`);
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: json as unknown as PackRegistry };
}
