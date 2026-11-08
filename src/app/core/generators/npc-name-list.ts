import {
  Adjective,
  Gender,
  isAdjective,
  isRecord,
  nonEmptyString,
} from './word-list';

export const NPC_NAME_LIST_VERSION = 1;

export const NPC_NAME_PLACEHOLDERS = ['given', 'epithet'] as const;

export interface GivenName {
  text: string;
  gender: Gender;
}

export interface NpcNameList {
  version: typeof NPC_NAME_LIST_VERSION;
  given: GivenName[];
  /** Epithets agreeing with the gender of the given name: one form (English) or one per gender (French). */
  epithets: Adjective[];
  /** Name patterns using `{given}` and `{epithet}`; word order is the language's. */
  templates: string[];
}

export type NpcNameListValidation =
  { ok: true; value: NpcNameList } | { ok: false; errors: string[] };

/** Checks a loaded JSON file against the format, with readable errors. */
export function validateNpcNameList(json: unknown): NpcNameListValidation {
  if (!isRecord(json))
    return { ok: false, errors: ['the file is not a JSON object'] };
  const errors: string[] = [];
  if (json['version'] !== NPC_NAME_LIST_VERSION)
    errors.push(`version must be ${NPC_NAME_LIST_VERSION}`);

  const given = json['given'];
  if (!Array.isArray(given) || given.length === 0)
    errors.push('given must be a non-empty list');
  else {
    given.forEach((name, i) => {
      if (!isRecord(name) || !nonEmptyString(name['text']))
        errors.push(`given[${i}] needs a "text"`);
      else if (name['gender'] !== 'm' && name['gender'] !== 'f')
        errors.push(`given[${i}].gender must be "m" or "f"`);
    });
  }

  const epithets = json['epithets'];
  if (!Array.isArray(epithets) || epithets.length === 0)
    errors.push('epithets must be a non-empty list');
  else {
    epithets.forEach((epithet, i) => {
      const valid =
        nonEmptyString(epithet) ||
        (isRecord(epithet) &&
          nonEmptyString(epithet['m']) &&
          nonEmptyString(epithet['f']));
      if (!valid)
        errors.push(`epithets[${i}] must be a string or { "m": …, "f": … }`);
    });
  }

  const templates = json['templates'];
  if (!Array.isArray(templates) || templates.length === 0)
    errors.push('templates must be a non-empty list');
  else {
    for (const template of templates) {
      if (!nonEmptyString(template)) {
        errors.push('templates must only contain non-empty strings');
        continue;
      }
      for (const placeholder of template.match(/\{[^}]*\}/g) ?? []) {
        if (
          !(NPC_NAME_PLACEHOLDERS as readonly string[]).includes(
            placeholder.slice(1, -1),
          )
        ) {
          errors.push(
            `templates: unknown placeholder ${placeholder} in "${template}"`,
          );
        }
      }
      if (!template.includes('{given}'))
        errors.push(`templates: "${template}" has no {given}`);
    }
  }

  return errors.length === 0
    ? { ok: true, value: json as unknown as NpcNameList }
    : { ok: false, errors };
}
