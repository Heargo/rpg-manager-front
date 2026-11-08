import { checkAttributeFormula } from '../../../core/helpers/formula';
import { ITEM_RARITIES, ITEM_TYPES } from '../../../core/models/item';
import { isValidMaxLevel, LEVEL_CURVE_PRESETS, validateLevelCurve } from '../../character/helpers/level.rules';
import { isValidNpcVisibility } from '../../npc/helpers/npc-visibility.rules';
import { emptySkill, parseSkillJson } from '../../skill/helpers/skill.rules';
import { emptyClass, parseClassJson } from '../../class/helpers/class.rules';
import { NPC_ROLES } from '../../npc/models/npc';
import { Skill } from '../../skill/models/skill';
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
  if (!isValidMaxLevel(world['maxLevel'])) errors.push('world.maxLevel must be an integer from 2 to 100');
  if (!Number.isInteger(world['statPointsPerLevel']) || (world['statPointsPerLevel'] as number) < 0) {
    errors.push('world.statPointsPerLevel must be a non-negative integer');
  }
  if (!Number.isInteger(world['startingMoney'])) errors.push('world.startingMoney must be an integer');
  for (const key of ['offlineFeatures', 'barAttributes'] as const) {
    if (!isRecord(world[key])) errors.push(`world.${key} must be an object`);
  }
  if (!isValidNpcVisibility(world['npcVisibility'])) {
    errors.push('world.npcVisibility is invalid');
  }
  const attributeNames = Array.isArray(world['attributes'])
    ? world['attributes'].map((attribute) => (isRecord(attribute) && typeof attribute['name'] === 'string' ? attribute['name'] : ''))
    : [];
  list(world['attributes'], 'world.attributes', errors, (attribute, path) => {
    if (typeof attribute['id'] !== 'string' || typeof attribute['name'] !== 'string') errors.push(`${path} needs an id and a name`);
    if (typeof attribute['baseValue'] !== 'number') errors.push(`${path}.baseValue must be a number`);
    if (attribute['cap'] !== undefined && (!Number.isInteger(attribute['cap']) || (attribute['cap'] as number) < 1 || (typeof attribute['baseValue'] === 'number' && (attribute['cap'] as number) < attribute['baseValue']))) errors.push(`${path}.cap is invalid`);
    if (!isValidFormula(attribute['formula'], attributeNames, attribute['baseValue'])) errors.push(`${path}.formula is invalid`);
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
    if (character['classId'] !== undefined && typeof character['classId'] !== 'string') errors.push(`${path}.classId must be a string`);
    if (!Number.isInteger(character['skillPoints']) || (character['skillPoints'] as number) < 0) errors.push(`${path}.skillPoints must be an integer of 0 or more`);
    list(character['skills'], `${path}.skills`, errors, (skill, skillPath) => {
      if (typeof skill['skillId'] !== 'string') errors.push(`${skillPath}.skillId must be a string`);
      if (!Number.isInteger(skill['rank']) || (skill['rank'] as number) < 1) errors.push(`${skillPath}.rank must be an integer of 1 or more`);
    });
    list(character['attributes'], `${path}.attributes`, errors, () => undefined);
    list(character['inventory'], `${path}.inventory`, errors, (entry, entryPath) => {
      if (!isRecord(entry['item'])) errors.push(`${entryPath}.item must be an object`);
      else validateItem(entry['item'], `${entryPath}.item`, errors);
    });
  });
  list(world['npcs'], 'world.npcs', errors, (npc, path) => {
    for (const key of ['id', 'name', 'description'] as const) {
      if (typeof npc[key] !== 'string') errors.push(`${path}.${key} must be a string`);
    }
    if (!Array.isArray(npc['roles']) || npc['roles'].length === 0 || !npc['roles'].every((role) => (NPC_ROLES as readonly unknown[]).includes(role))) {
      errors.push(`${path}.roles must be a non-empty list of known roles`);
    }
    if (!Number.isInteger(npc['xpReward']) || (npc['xpReward'] as number) < 0) errors.push(`${path}.xpReward must be an integer of 0 or more`);
    if (!Array.isArray(npc['loot']) || !npc['loot'].every((id) => typeof id === 'string')) errors.push(`${path}.loot must be a list of ids`);
    if (npc['merchant'] !== undefined) {
      const merchant = npc['merchant'];
      const ok = isRecord(merchant) && ['buyRatio', 'sellRatio'].every((k) => merchant[k] === undefined || (typeof merchant[k] === 'number' && (merchant[k] as number) >= 0 && (merchant[k] as number) <= 10));
      if (!ok) errors.push(`${path}.merchant is invalid`);
    }
    for (const key of ['statPoints', 'updatedAt'] as const) {
      if (typeof npc[key] !== 'number') errors.push(`${path}.${key} must be a number`);
    }
    if (!Number.isInteger(npc['xp']) || (npc['xp'] as number) < 0) errors.push(`${path}.xp must be an integer of 0 or more`);
    if (!Number.isInteger(npc['level']) || (npc['level'] as number) < 1) errors.push(`${path}.level must be an integer of 1 or more`);
    if (!Number.isInteger(npc['money'])) errors.push(`${path}.money must be an integer`);
    if (!Number.isInteger(npc['skillPoints']) || (npc['skillPoints'] as number) < 0) errors.push(`${path}.skillPoints must be an integer of 0 or more`);
    list(npc['skills'], `${path}.skills`, errors, (skill, skillPath) => {
      if (typeof skill['skillId'] !== 'string') errors.push(`${skillPath}.skillId must be a string`);
      if (!Number.isInteger(skill['rank']) || (skill['rank'] as number) < 1) errors.push(`${skillPath}.rank must be an integer of 1 or more`);
    });
    list(npc['attributes'], `${path}.attributes`, errors, () => undefined);
    list(npc['inventory'], `${path}.inventory`, errors, (entry, entryPath) => {
      if (!isRecord(entry['item'])) errors.push(`${entryPath}.item must be an object`);
      else validateItem(entry['item'], `${entryPath}.item`, errors);
    });
  });
  list(world['skills'], 'world.skills', errors, (skill, path) => {
    if (typeof skill['id'] !== 'string') errors.push(`${path}.id must be a string`);
    for (const issue of parseSkillJson(JSON.stringify(skill), emptySkill(), attributeNames).issues) {
      errors.push(`${path}.${issue.field} is invalid`);
    }
  });
  const skills = Array.isArray(world['skills']) ? (world['skills'] as Skill[]) : [];
  list(world['classes'], 'world.classes', errors, (entry, path) => {
    if (typeof entry['id'] !== 'string') errors.push(`${path}.id must be a string`);
    for (const issue of parseClassJson(JSON.stringify(entry), emptyClass(), skills, attributeNames).issues) {
      errors.push(`${path}.${issue.field} is invalid`);
    }
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

function isValidFormula(formula: unknown, attributeNames: string[], base: unknown): boolean {
  if (!isRecord(formula)) return false;
  if (formula['preset'] === 'custom') {
    return typeof formula['expression'] === 'string' && checkAttributeFormula({ preset: 'custom', expression: formula['expression'] }, attributeNames, typeof base === 'number' ? base : 0) === null;
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
