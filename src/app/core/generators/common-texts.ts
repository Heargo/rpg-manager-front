import {
  checkLanguageFile,
  keyedBy,
  listOf,
  phrase,
} from './language-file';

export const COMMON_TEXTS_VERSION = 2;

/** `generators/common.json`: the params of a language, shared by every generator. */
export interface CommonTexts {
  version: typeof COMMON_TEXTS_VERSION;
  params?: Record<string, string[]>;
}

export type CommonTextsValidation =
  | { ok: true; value: CommonTexts; warnings: string[] }
  | { ok: false; errors: string[] };

const PARAM_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Checks a loaded `common.json` with readable errors; a param used and not defined here is a warning, unless it is
 * in `knownNames` (params of installed packs, kind ids of the active packs).
 */
export function validateCommonTexts(
  json: unknown,
  knownNames: readonly string[] = [],
): CommonTextsValidation {
  const { errors, params } = checkLanguageFile(json, {
    version: COMMON_TEXTS_VERSION,
    sections: {
      params: keyedBy(PARAM_NAME, 'param name', listOf(phrase)),
    },
  });
  if (errors.length > 0) return { ok: false, errors };
  const value = json as CommonTexts;
  const defined = [...Object.keys(value.params ?? {}), ...knownNames];
  const warnings = params
    .filter((name) => !defined.includes(name))
    .map((name) => `param {${name}} is used but not defined in this file`);
  return { ok: true, value, warnings };
}
