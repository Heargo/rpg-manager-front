import { KIND_ID } from '../packs/pack-kinds';
import { ITEM_RARITIES, ItemRarity } from '../models/item';
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
  /** A plural noun ("Gants"): its adjectives take the plural form. */
  plural?: boolean;
}

/**
 * One form for every gender (English), or one per gender (French); `mp` / `fp` are the plural forms when
 * they are not the singular plus `s`.
 */
export type Adjective =
  string | ({ m: string; f: string } & { mp?: string; fp?: string });

type PerRarity<T> = Partial<Record<ItemRarity, T[]>>;

/** An adjective of a kind: a plain one, or one tied to a tint (`{ text, tint }` for a single form, or gendered forms plus `tint`). */
export type KindAdjective =
  | Adjective
  | { text: string; tint: string }
  | ({ m: string; f: string; mp?: string; fp?: string } & { tint: string });

/** A suffix of a kind: a phrase, or a phrase tied to a tint. */
export type KindSuffix = string | { text: string; tint: string };

export interface KindTexts {
  nouns?: Noun[];
  descriptions?: string[];
  /** Name templates of this kind per rarity, before the language's; each has `{base}`. */
  names?: PerRarity<string>;
  /** Adjectives and suffixes of this kind; they add up along the chain, with the top-level ones. */
  adjectives?: PerRarity<KindAdjective>;
  suffixes?: PerRarity<KindSuffix>;
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

export type ItemWordListValidation =
  | { ok: true; value: ItemWordList; warnings: string[] }
  | { ok: false; errors: string[] };

export const noun: Section = (value, path, context) => {
  if (!isRecord(value) || !nonEmptyString(value['text']))
    context.error(`${path} needs a "text"`);
  else if (
    value['gender'] !== undefined &&
    value['gender'] !== 'm' &&
    value['gender'] !== 'f'
  )
    context.error(`${path}.gender must be "m" or "f"`);
  else if (
    value['plural'] !== undefined &&
    typeof value['plural'] !== 'boolean'
  )
    context.error(`${path}.plural must be true or false`);
};

export function isAdjective(value: unknown): value is Adjective {
  return (
    nonEmptyString(value) ||
    (isRecord(value) &&
      nonEmptyString(value['m']) &&
      nonEmptyString(value['f']) &&
      (value['mp'] === undefined || nonEmptyString(value['mp'])) &&
      (value['fp'] === undefined || nonEmptyString(value['fp'])))
  );
}

export const adjective: Section = (value, path, context) => {
  if (!isAdjective(value))
    context.error(
      `${path} must be a string or { "m": …, "f": …, "mp"?: …, "fp"?: … }`,
    );
};

const tintId: Section = (value, path, context) => {
  if (!nonEmptyString(value))
    context.error(`${path} must be a non-empty string`);
};

const kindAdjective: Section = (value, path, context) => {
  if (isRecord(value) && value['text'] !== undefined) {
    for (const key of Object.keys(value))
      if (key !== 'text' && key !== 'tint')
        context.error(`${path}: unknown field "${key}"`);
    phrase(value['text'], `${path}.text`, context);
    if (value['tint'] !== undefined)
      tintId(value['tint'], `${path}.tint`, context);
    return;
  }
  if (isRecord(value) && value['tint'] !== undefined) {
    const { tint, ...rest } = value;
    tintId(tint, `${path}.tint`, context);
    adjective(rest, path, context);
    return;
  }
  adjective(value, path, context);
};

const kindSuffix: Section = (value, path, context) => {
  if (!isRecord(value)) return phrase(value, path, context);
  for (const key of Object.keys(value))
    if (key !== 'text' && key !== 'tint')
      context.error(`${path}: unknown field "${key}"`);
  phrase(value['text'], `${path}.text`, context);
  tintId(value['tint'], `${path}.tint`, context);
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
      adjectives: perRarity(kindAdjective),
      suffixes: perRarity(kindSuffix),
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
    ) ||
    Object.values(value.kinds ?? {}).some((kind) =>
      has(kind.suffixes?.[rarity]),
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
