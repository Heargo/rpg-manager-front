import { KIND_ID } from '../packs/pack-kinds';
import {
  checkLanguageFile,
  isRecord,
  keyedBy,
  listOf,
  nonEmptyString,
  objectOf,
  phrase,
  Section,
} from './language-file';
import { Adjective, Gender, isAdjective, Noun } from './word-list';

export const NPC_WORD_LIST_VERSION = 2;

export interface GivenName {
  text: string;
  gender: Gender;
}

export interface NpcKindTexts {
  nouns?: Noun[];
  descriptions?: string[];
  adjectives?: Adjective[];
  /** Name templates of this kind, before the language's; `{given}`, `{epithet}`, `{noun}`, `{adjective}`. */
  names?: string[];
}

/** `generators/npcs.json`: given names, epithets and person name templates, and the texts of each kind. */
export interface NpcWordList {
  version: typeof NPC_WORD_LIST_VERSION;
  given?: GivenName[];
  /** Epithets agreeing with the gender of the given name: one form (English) or one per gender (French). */
  epithets?: Adjective[];
  /** Person name templates using `{given}`, `{epithet}` and `{noun}`; word order is the language's. */
  templates?: string[];
  kinds?: Record<string, NpcKindTexts>;
}

export type NpcWordListValidation =
  | { ok: true; value: NpcWordList; warnings: string[] }
  | { ok: false; errors: string[] };

const given: Section = (value, path, context) => {
  if (!isRecord(value) || !nonEmptyString(value['text']))
    context.error(`${path} needs a "text"`);
  else if (value['gender'] !== 'm' && value['gender'] !== 'f')
    context.error(`${path}.gender must be "m" or "f"`);
};

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

const adjective: Section = (value, path, context) => {
  if (!isAdjective(value))
    context.error(`${path} must be a string or { "m": …, "f": … }`);
};

const SECTIONS: Record<string, Section> = {
  given: listOf(given),
  epithets: listOf(adjective),
  templates: listOf(phrase),
  kinds: keyedBy(
    KIND_ID,
    'kind id',
    objectOf({
      nouns: listOf(noun),
      descriptions: listOf(phrase),
      adjectives: listOf(adjective),
      names: listOf(phrase),
    }),
  ),
};

/**
 * Checks a loaded `generators/npcs.json` against the format, with readable errors. `params` lists the params
 * defined elsewhere (the language's `common.json`); a param used and defined nowhere is a warning.
 */
export function validateNpcWordList(
  json: unknown,
  params: readonly string[] = [],
): NpcWordListValidation {
  const checked = checkLanguageFile(json, {
    version: NPC_WORD_LIST_VERSION,
    sections: SECTIONS,
  });
  if (checked.errors.length > 0) return { ok: false, errors: checked.errors };
  const warnings = checked.params
    .filter((name) => !params.includes(name))
    .map((name) => `param {${name}} is used but not defined in this file`);
  return { ok: true, value: json as NpcWordList, warnings };
}
