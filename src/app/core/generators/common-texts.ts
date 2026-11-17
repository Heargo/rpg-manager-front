import { KIND_ID } from '../packs/pack-kinds';
import {
  checkLanguageFile,
  keyedBy,
  listOf,
  objectOf,
  phrase,
} from './language-file';
import { adjective, Adjective, noun, Noun } from './word-list';

export const COMMON_TEXTS_VERSION = 2;

/** The texts of one shared kind: words and adjectives to insert, and descriptions; they add up along the kind's chain. */
export interface SharedKindTexts {
  words?: Noun[];
  adjectives?: Adjective[];
  descriptions?: string[];
}

/** `generators/common.json`: the params and the shared kinds' texts of a language, shared by every generator. */
export interface CommonTexts {
  version: typeof COMMON_TEXTS_VERSION;
  params?: Record<string, string[]>;
  kinds?: Record<string, SharedKindTexts>;
}

export type CommonTextsValidation =
  | { ok: true; value: CommonTexts; warnings: string[] }
  | { ok: false; errors: string[] };

const PARAM_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Checks a loaded `common.json` with readable errors; a param used and not defined here is a warning, and so are
 * texts for a shared kind that is not in `declaredSharedKinds` (the shared kinds the active packs declare).
 */
export function validateCommonTexts(
  json: unknown,
  declaredSharedKinds?: readonly string[],
  /** Params defined elsewhere (installed packs): not warned about. */
  knownParams: readonly string[] = [],
): CommonTextsValidation {
  const { errors, params } = checkLanguageFile(json, {
    version: COMMON_TEXTS_VERSION,
    sections: {
      params: keyedBy(PARAM_NAME, 'param name', listOf(phrase)),
      kinds: keyedBy(
        KIND_ID,
        'shared kind id',
        objectOf({
          words: listOf(noun),
          adjectives: listOf(adjective),
          descriptions: listOf(phrase),
        }),
      ),
    },
  });
  if (errors.length > 0) return { ok: false, errors };
  const value = json as CommonTexts;
  const defined = [
    ...Object.keys(value.params ?? {}),
    ...(declaredSharedKinds ?? []),
    ...knownParams,
  ];
  const warnings = params
    .filter((name) => !defined.includes(name))
    .map((name) => `param {${name}} is used but not defined in this file`);
  if (declaredSharedKinds)
    for (const id of Object.keys(value.kinds ?? {}))
      if (!declaredSharedKinds.includes(id))
        warnings.push(
          `shared kind "${id}" has texts but no active pack declares it`,
        );
  return { ok: true, value, warnings };
}
