import { EQUIPMENT_SLOTS, ITEM_RARITIES, ITEM_TYPES, ItemRarity, ItemType } from '../models/item';

export const WORD_LIST_VERSION = 1;

export type Gender = 'm' | 'f';

export interface Noun {
  text: string;
  /** Grammatical gender, for languages where adjectives agree. Defaults to `m`. */
  gender?: Gender;
}

/** One form for every gender (English), or one per gender (French). */
export type Adjective = string | Record<Gender, string>;

/** What an item's name is built around: its equipment slot, or its type when it isn't equipment. */
export const BASE_KEYS = [...EQUIPMENT_SLOTS, 'item', 'consumable'] as const;
export type BaseKey = (typeof BASE_KEYS)[number];

export const TEMPLATE_PLACEHOLDERS = ['base', 'adjective', 'suffix'] as const;

export interface WordList {
  version: typeof WORD_LIST_VERSION;
  /** Name patterns per rarity, using `{base}`, `{adjective}` and `{suffix}`; word order is the language's. */
  templates: Record<ItemRarity, string[]>;
  bases: Record<BaseKey, Noun[]>;
  adjectives: Record<ItemRarity, Adjective[]>;
  /** Phrases after the noun ("of Vigor", "des anciens rois"); may be empty for low rarities. */
  suffixes: Record<ItemRarity, string[]>;
  descriptions: Record<ItemType, string[]>;
}

export type WordListValidation = { ok: true; value: WordList } | { ok: false; errors: string[] };

/** Checks a loaded JSON file against the format, with readable errors. */
export function validateWordList(json: unknown): WordListValidation {
  const errors: string[] = [];
  if (!isRecord(json)) return { ok: false, errors: ['the file is not a JSON object'] };
  if (json['version'] !== WORD_LIST_VERSION) errors.push(`version must be ${WORD_LIST_VERSION}`);

  const templates = section(json, 'templates', errors);
  const bases = section(json, 'bases', errors);
  const adjectives = section(json, 'adjectives', errors);
  const suffixes = section(json, 'suffixes', errors);
  const descriptions = section(json, 'descriptions', errors);

  for (const rarity of ITEM_RARITIES) {
    const rarityTemplates = stringList(templates?.[rarity], `templates.${rarity}`, errors, true);
    const raritySuffixes = stringList(suffixes?.[rarity], `suffixes.${rarity}`, errors, false);
    for (const template of rarityTemplates) {
      for (const placeholder of template.match(/\{[^}]*\}/g) ?? []) {
        const name = placeholder.slice(1, -1);
        if (!(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(name)) {
          errors.push(`templates.${rarity}: unknown placeholder ${placeholder} in "${template}"`);
        }
      }
      if (!template.includes('{base}')) errors.push(`templates.${rarity}: "${template}" has no {base}`);
      if (template.includes('{suffix}') && raritySuffixes.length === 0) {
        errors.push(`templates.${rarity}: "${template}" uses {suffix} but suffixes.${rarity} is empty`);
      }
    }
    const rarityAdjectives = adjectives?.[rarity];
    if (!Array.isArray(rarityAdjectives) || rarityAdjectives.length === 0) {
      errors.push(`adjectives.${rarity} must be a non-empty list`);
    } else {
      rarityAdjectives.forEach((adjective, i) => {
        if (!isAdjective(adjective)) errors.push(`adjectives.${rarity}[${i}] must be a string or { "m": …, "f": … }`);
      });
    }
  }

  for (const key of BASE_KEYS) {
    const nouns = bases?.[key];
    if (!Array.isArray(nouns) || nouns.length === 0) {
      errors.push(`bases.${key} must be a non-empty list`);
      continue;
    }
    nouns.forEach((noun, i) => {
      if (!isRecord(noun) || !nonEmptyString(noun['text'])) errors.push(`bases.${key}[${i}] needs a "text"`);
      else if (noun['gender'] !== undefined && noun['gender'] !== 'm' && noun['gender'] !== 'f') {
        errors.push(`bases.${key}[${i}].gender must be "m" or "f"`);
      }
    });
  }

  for (const type of ITEM_TYPES) stringList(descriptions?.[type], `descriptions.${type}`, errors, true);

  return errors.length === 0 ? { ok: true, value: json as unknown as WordList } : { ok: false, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAdjective(value: unknown): value is Adjective {
  return nonEmptyString(value) || (isRecord(value) && nonEmptyString(value['m']) && nonEmptyString(value['f']));
}

function section(json: Record<string, unknown>, key: string, errors: string[]): Record<string, unknown> | undefined {
  const value = json[key];
  if (!isRecord(value)) {
    errors.push(`${key} must be an object`);
    return undefined;
  }
  return value;
}

function stringList(value: unknown, path: string, errors: string[], required: boolean): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list`);
    return [];
  }
  if (required && value.length === 0) errors.push(`${path} must not be empty`);
  const strings = value.filter(nonEmptyString);
  if (strings.length !== value.length) errors.push(`${path} must only contain non-empty strings`);
  return strings;
}
