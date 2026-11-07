import { validateFormula } from '../../../core/helpers/formula';
import { ITEM_RARITIES, ITEM_TYPES } from '../../../core/models/item';
import { LEVEL_CURVE_PRESETS, validateLevelCurve } from '../../character/helpers/level.rules';
import { World } from '../models/world';

export const WORLD_EXPORT_FORMAT = 'rpg-manager-world';
export const WORLD_EXPORT_VERSION = 1;

export interface ExportedImage {
  type: string;
  /** base64 of the image bytes */
  data: string;
}

export interface WorldExport {
  format: typeof WORLD_EXPORT_FORMAT;
  version: typeof WORLD_EXPORT_VERSION;
  exportedAt: number;
  world: World;
  /** Every image the world uses, by its id (content hash). */
  images: Record<string, ExportedImage>;
}

export type WorldExportParse = { ok: true; value: WorldExport } | { ok: false; errors: string[] };

export function buildWorldExport(world: World, images: Record<string, ExportedImage>, now: number): WorldExport {
  return { format: WORLD_EXPORT_FORMAT, version: WORLD_EXPORT_VERSION, exportedAt: now, world, images };
}

/** Parses an export file's text and checks its shape, with readable errors. */
export function parseWorldExport(text: string): WorldExportParse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['the file is not valid JSON'] };
  }
  const errors: string[] = [];
  if (!isRecord(json)) return { ok: false, errors: ['the file is not a world export'] };
  if (json['format'] !== WORLD_EXPORT_FORMAT) return { ok: false, errors: ['the file is not a world export'] };
  if (json['version'] !== WORLD_EXPORT_VERSION) errors.push(`unsupported version ${String(json['version'])}`);
  if (typeof json['exportedAt'] !== 'number') errors.push('exportedAt must be a number');

  validateWorld(json['world'], errors);

  const images = json['images'];
  if (!isRecord(images)) errors.push('images must be an object');
  else {
    for (const [id, image] of Object.entries(images)) {
      if (!isRecord(image) || typeof image['type'] !== 'string' || typeof image['data'] !== 'string') {
        errors.push(`images.${id} needs a type and data`);
      } else if (!image['type'].startsWith('image/')) {
        errors.push(`images.${id} is not an image`);
      }
    }
  }

  return errors.length === 0 ? { ok: true, value: json as unknown as WorldExport } : { ok: false, errors };
}

function validateWorld(world: unknown, errors: string[]): void {
  if (!isRecord(world)) {
    errors.push('world must be an object');
    return;
  }
  for (const key of ['id', 'name', 'description', 'notes'] as const) {
    if (typeof world[key] !== 'string') errors.push(`world.${key} must be a string`);
  }
  for (const key of ['startingStatPoints', 'createdAt', 'updatedAt'] as const) {
    if (typeof world[key] !== 'number') errors.push(`world.${key} must be a number`);
  }
  if (!isValidLevelCurve(world['levelCurve'])) errors.push('world.levelCurve is invalid');
  if (!Number.isInteger(world['statPointsPerLevel']) || (world['statPointsPerLevel'] as number) < 0) {
    errors.push('world.statPointsPerLevel must be a non-negative integer');
  }
  if (!Number.isInteger(world['startingMoney'])) errors.push('world.startingMoney must be an integer');
  for (const key of ['offlineFeatures', 'barAttributes'] as const) {
    if (!isRecord(world[key])) errors.push(`world.${key} must be an object`);
  }
  const attributeNames = Array.isArray(world['attributes'])
    ? world['attributes'].map((attribute) => (isRecord(attribute) && typeof attribute['name'] === 'string' ? attribute['name'] : ''))
    : [];
  list(world['attributes'], 'world.attributes', errors, (attribute, path) => {
    if (typeof attribute['id'] !== 'string' || typeof attribute['name'] !== 'string') errors.push(`${path} needs an id and a name`);
    if (typeof attribute['baseValue'] !== 'number') errors.push(`${path}.baseValue must be a number`);
    if (!isValidFormula(attribute['formula'], attributeNames)) errors.push(`${path}.formula is invalid`);
  });
  list(world['items'], 'world.items', errors, (item, path) => validateItem(item, path, errors));
  list(world['characters'], 'world.characters', errors, (character, path) => {
    for (const key of ['id', 'playerId', 'name'] as const) {
      if (typeof character[key] !== 'string') errors.push(`${path}.${key} must be a string`);
    }
    for (const key of ['statPoints', 'rev', 'updatedAt'] as const) {
      if (typeof character[key] !== 'number') errors.push(`${path}.${key} must be a number`);
    }
    if (!Number.isInteger(character['xp']) || (character['xp'] as number) < 0) errors.push(`${path}.xp must be an integer of 0 or more`);
    if (!Number.isInteger(character['level']) || (character['level'] as number) < 1) errors.push(`${path}.level must be an integer of 1 or more`);
    if (!Number.isInteger(character['money'])) errors.push(`${path}.money must be an integer`);
    list(character['attributes'], `${path}.attributes`, errors, () => undefined);
    list(character['inventory'], `${path}.inventory`, errors, (entry, entryPath) => {
      if (!isRecord(entry['item'])) errors.push(`${entryPath}.item must be an object`);
      else validateItem(entry['item'], `${entryPath}.item`, errors);
    });
  });
  if (!Array.isArray(world['quickImageIds']) || !world['quickImageIds'].every((id) => typeof id === 'string')) {
    errors.push('world.quickImageIds must be a list of ids');
  }
}

function validateItem(item: Record<string, unknown>, path: string, errors: string[]): void {
  if (typeof item['id'] !== 'string' || typeof item['name'] !== 'string') errors.push(`${path} needs an id and a name`);
  if (!(ITEM_RARITIES as readonly unknown[]).includes(item['rarity'])) errors.push(`${path}.rarity is unknown`);
  if (!(ITEM_TYPES as readonly unknown[]).includes(item['type'])) errors.push(`${path}.type is unknown`);
  if (!Array.isArray(item['modifiers'])) errors.push(`${path}.modifiers must be a list`);
  if (!Number.isInteger(item['price'])) errors.push(`${path}.price must be an integer`);
}

function list(
  value: unknown,
  path: string,
  errors: string[],
  each: (entry: Record<string, unknown>, path: string) => void,
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list`);
    return;
  }
  value.forEach((entry, i) => {
    if (!isRecord(entry)) errors.push(`${path}[${i}] must be an object`);
    else each(entry, `${path}[${i}]`);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidFormula(formula: unknown, attributeNames: string[]): boolean {
  if (!isRecord(formula)) return false;
  if (formula['preset'] === 'custom') {
    return typeof formula['expression'] === 'string' && validateFormula({ preset: 'custom', expression: formula['expression'] }, attributeNames) === null;
  }
  const preset = formula['preset'];
  return (
    (preset === 'linear' || preset === 'steep-linear' || preset === 'diminishing' || preset === 'percent') &&
    typeof formula['step'] === 'number' &&
    Number.isFinite(formula['step'])
  );
}

function isValidLevelCurve(curve: unknown): boolean {
  if (!isRecord(curve)) return false;
  if (curve['preset'] === 'custom') {
    return typeof curve['expression'] === 'string' && validateLevelCurve({ preset: 'custom', expression: curve['expression'] }) === null;
  }
  return (LEVEL_CURVE_PRESETS as readonly unknown[]).includes(curve['preset']);
}
