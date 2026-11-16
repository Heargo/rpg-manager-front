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
import { Adjective, isAdjective, Noun } from './word-list';

export const SKILL_WORD_LIST_VERSION = 2;

export interface SkillKindTexts {
  nouns?: Noun[];
  descriptions?: string[];
  adjectives?: Adjective[];
  suffixes?: string[];
  /** Name templates of this kind, before the language's; `{noun}`, `{adjective}`, `{suffix}`. */
  names?: string[];
}

/** `generators/skills.json`: the language's name templates, adjectives and suffixes, and the texts of each kind. */
export interface SkillWordList {
  version: typeof SKILL_WORD_LIST_VERSION;
  /** Skill name patterns using `{noun}`, `{adjective}` and `{suffix}`; word order is the language's. */
  templates?: string[];
  adjectives?: Adjective[];
  suffixes?: string[];
  kinds?: Record<string, SkillKindTexts>;
}

export type SkillWordListValidation =
  | { ok: true; value: SkillWordList; warnings: string[] }
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

const adjective: Section = (value, path, context) => {
  if (!isAdjective(value))
    context.error(`${path} must be a string or { "m": …, "f": … }`);
};

const suffix: Section = (value, path, context) => {
  if (!nonEmptyString(value))
    context.error(`${path} must be a non-empty string`);
};

const SECTIONS: Record<string, Section> = {
  templates: listOf(phrase),
  adjectives: listOf(adjective),
  suffixes: listOf(suffix),
  kinds: keyedBy(
    KIND_ID,
    'kind id',
    objectOf({
      nouns: listOf(noun),
      descriptions: listOf(phrase),
      adjectives: listOf(adjective),
      suffixes: listOf(suffix),
      names: listOf(phrase),
    }),
  ),
};

/**
 * Checks a loaded `generators/skills.json` against the format, with readable errors. `params` lists the params
 * defined elsewhere (the language's `common.json`); a param used and defined nowhere is a warning.
 */
export function validateSkillWordList(
  json: unknown,
  params: readonly string[] = [],
): SkillWordListValidation {
  const checked = checkLanguageFile(json, {
    version: SKILL_WORD_LIST_VERSION,
    sections: SECTIONS,
  });
  if (checked.errors.length > 0) return { ok: false, errors: checked.errors };
  const warnings = checked.params
    .filter((name) => !params.includes(name))
    .map((name) => `param {${name}} is used but not defined in this file`);
  return { ok: true, value: json as SkillWordList, warnings };
}
