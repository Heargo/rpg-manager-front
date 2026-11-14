import { KIND_ID } from '../packs/pack-kinds';
import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ItemRarity,
  ItemType,
} from '../models/item';
import {
  checkLanguageFile,
  isRecord,
  keyedBy,
  keyedByOneOf,
  listOf,
  nonEmptyString,
  objectOf,
  phrase,
  phraseWithBase,
  Section,
} from './language-file';

export { isRecord, nonEmptyString };

export const WORD_LIST_VERSION = 2;

export type Gender = 'm' | 'f';

export interface Noun {
  text: string;
  /** Grammatical gender, for languages where adjectives agree. Defaults to `m`. */
  gender?: Gender;
}

/** One form for every gender (English), or one per gender (French). */
export type Adjective = string | Record<Gender, string>;

type PerRarity<T> = Partial<Record<ItemRarity, T[]>>;

export interface KindTexts {
  nouns?: Noun[];
  descriptions?: string[];
  /** Name templates of this kind per rarity, before the language's; each has `{base}`. */
  names?: PerRarity<string>;
}

export interface TintTexts {
  adjectives?: PerRarity<Adjective>;
  suffixes?: PerRarity<string>;
  descriptions?: string[];
}

/** `generators/items.json`: the texts of the items domain, per kind, per tint, and the language's templates. */
export interface ItemWordList {
  version: typeof WORD_LIST_VERSION;
  kinds?: Record<string, KindTexts>;
  tints?: Record<string, TintTexts>;
  adjectives?: PerRarity<Adjective>;
  suffixes?: PerRarity<string>;
  templates?: PerRarity<string>;
}

/** What an item's name is built around: its equipment slot, or its type when it isn't equipment. */
export const BASE_KEYS = [...EQUIPMENT_SLOTS, 'item', 'consumable'] as const;
export type BaseKey = (typeof BASE_KEYS)[number];

/**
 * The shape the item generator still draws from (interim, until the generator works on kinds): nouns per slot or
 * type, descriptions per type. Built from an `ItemWordList` by `WordListBusiness`.
 */
export interface WordList {
  version: 1;
  /** Name patterns per rarity, using `{base}`, `{adjective}` and `{suffix}`; word order is the language's. */
  templates: Record<ItemRarity, string[]>;
  bases: Record<BaseKey, Noun[]>;
  adjectives: Record<ItemRarity, Adjective[]>;
  /** Phrases after the noun ("of Vigor", "des anciens rois"); may be empty for low rarities. */
  suffixes: Record<ItemRarity, string[]>;
  descriptions: Record<ItemType, string[]>;
}

export type ItemWordListValidation =
  | { ok: true; value: ItemWordList; warnings: string[] }
  | { ok: false; errors: string[] };

const noun: Section = (value, path, context) => {
  if (!isRecord(value) || !nonEmptyString(value['text']))
    context.error(`${path} needs a "text"`);
  else if (
    value['gender'] !== undefined &&
    value['gender'] !== 'm' &&
    value['gender'] !== 'f'
  )
    context.error(`${path}.gender must be "m" or "f"`);
};

export function isAdjective(value: unknown): value is Adjective {
  return (
    nonEmptyString(value) ||
    (isRecord(value) &&
      nonEmptyString(value['m']) &&
      nonEmptyString(value['f']))
  );
}

const adjective: Section = (value, path, context) => {
  if (!isAdjective(value))
    context.error(`${path} must be a string or { "m": …, "f": … }`);
};

const perRarity = (entry: Section): Section =>
  keyedByOneOf(ITEM_RARITIES, listOf(entry));

const SECTIONS: Record<string, Section> = {
  kinds: keyedBy(
    KIND_ID,
    'kind id',
    objectOf({
      nouns: listOf(noun),
      descriptions: listOf(phrase),
      names: perRarity(phraseWithBase),
    }),
  ),
  tints: keyedBy(
    KIND_ID,
    'tint id',
    objectOf({
      adjectives: perRarity(adjective),
      suffixes: perRarity(phrase),
      descriptions: listOf(phrase),
    }),
  ),
  adjectives: perRarity(adjective),
  suffixes: perRarity(phrase),
  templates: perRarity(phraseWithBase),
};

const has = (list: unknown): boolean => Array.isArray(list) && list.length > 0;

/**
 * Checks a loaded `generators/items.json` against the format, with readable errors. `params` lists the params
 * defined elsewhere (the language's `common.json`); a param used and defined nowhere is a warning, and so is a
 * `{suffix}` template for a rarity that has no suffix in the file (another pack may give some).
 */
export function validateItemWordList(
  json: unknown,
  params: readonly string[] = [],
): ItemWordListValidation {
  const checked = checkLanguageFile(json, {
    version: WORD_LIST_VERSION,
    sections: SECTIONS,
  });
  if (checked.errors.length > 0) return { ok: false, errors: checked.errors };
  const value = json as ItemWordList;
  const warnings: string[] = [];

  const suffixed = (rarity: ItemRarity): boolean =>
    has(value.suffixes?.[rarity]) ||
    Object.values(value.tints ?? {}).some((tint) =>
      has(tint.suffixes?.[rarity]),
    );
  const noSuffix = (
    path: string,
    list: string[] | undefined,
    rarity: ItemRarity,
  ) => {
    for (const template of list ?? [])
      if (template.includes('{suffix}') && !suffixed(rarity))
        warnings.push(
          `${path}: "${template}" uses {suffix} but no suffix is given for ${rarity} in this file`,
        );
  };
  for (const rarity of ITEM_RARITIES) {
    noSuffix(`templates.${rarity}`, value.templates?.[rarity], rarity);
    for (const [kind, texts] of Object.entries(value.kinds ?? {}))
      noSuffix(`kinds.${kind}.names.${rarity}`, texts.names?.[rarity], rarity);
  }
  for (const name of checked.params)
    if (!params.includes(name))
      warnings.push(`param {${name}} is used but not defined in this file`);
  return { ok: true, value, warnings };
}
