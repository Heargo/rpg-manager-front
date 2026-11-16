import { checkPhrase } from './phrase';

type Json = Record<string, unknown>;

export const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** What a section check reports to: errors, and the params the phrases use. */
export interface CheckContext {
  error(message: string): void;
  /** Syntax check of a phrase; records the params it uses. Returns whether it is sound. */
  phrase(text: string, path: string): boolean;
}

/** Checks the value of a section at `path`; reports through the context. */
export type Section = (
  value: unknown,
  path: string,
  context: CheckContext,
) => void;

/** A language file's format: its version and its top-level sections (a domain declares its own). */
export interface LanguageSchema {
  version: number;
  sections: Record<string, Section>;
}

export interface LanguageCheck {
  errors: string[];
  /** The params the phrases use, in first use order. */
  params: string[];
}

const defined = (json: Json, key: string): boolean => json[key] !== undefined;

/** An object with known fields only; an unknown field is an error. */
export function objectOf(fields: Record<string, Section>): Section {
  return (value, path, context) => {
    if (!isRecord(value)) return context.error(`${path} must be an object`);
    for (const [key, field] of Object.entries(value)) {
      if (field === undefined) continue;
      if (!(key in fields))
        context.error(`${path ? `${path}: ` : ''}unknown field "${key}"`);
      else fields[key](field, path ? `${path}.${key}` : key, context);
    }
  };
}

/** An object whose keys match `id` (kind ids, tint ids, param names), each value checked by `entry`. */
export function keyedBy(id: RegExp, label: string, entry: Section): Section {
  return (value, path, context) => {
    if (!isRecord(value)) return context.error(`${path} must be an object`);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      if (!id.test(key))
        context.error(`${path}: "${key}" is not a valid ${label}`);
      else entry(item, `${path}.${key}`, context);
    }
  };
}

/** An object keyed by the given names (rarities), each value checked by `entry`. */
export function keyedByOneOf(
  names: readonly string[],
  entry: Section,
): Section {
  return (value, path, context) => {
    if (!isRecord(value)) return context.error(`${path} must be an object`);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      if (!names.includes(key))
        context.error(
          `${path}: unknown key "${key}" (one of ${names.join(', ')})`,
        );
      else entry(item, `${path}.${key}`, context);
    }
  };
}

/** A non-empty list, each item checked by `entry`. */
export function listOf(entry: Section): Section {
  return (value, path, context) => {
    if (!Array.isArray(value)) return context.error(`${path} must be a list`);
    if (value.length === 0) context.error(`${path} must not be empty`);
    value.forEach((item, i) => entry(item, `${path}[${i}]`, context));
  };
}

/** A phrase: non-empty text that passes the phrase engine's syntax check. */
export const phrase: Section = (value, path, context) => {
  if (!nonEmptyString(value))
    return context.error(`${path} must be a non-empty string`);
  context.phrase(value, path);
};

/** A phrase that must contain `{base}`. */
export const phraseWithBase: Section = (value, path, context) => {
  if (!nonEmptyString(value))
    return context.error(`${path} must be a non-empty string`);
  if (context.phrase(value, path) && !value.includes('{base}'))
    context.error(`${path}: "${value}" has no {base}`);
};

/**
 * Generic language file check: a JSON object, the version, then the top-level sections; unknown fields are errors
 * and a file that gives nothing is an error. Domains reuse it with their own sections.
 */
export function checkLanguageFile(
  json: unknown,
  schema: LanguageSchema,
): LanguageCheck {
  const errors: string[] = [];
  const params: string[] = [];
  if (!isRecord(json))
    return { errors: ['the file is not a JSON object'], params };
  const context: CheckContext = {
    error: (message) => errors.push(message),
    phrase(text, path) {
      const checked = checkPhrase(text);
      for (const problem of checked.errors) errors.push(`${path}: ${problem}`);
      for (const name of checked.params)
        if (!params.includes(name)) params.push(name);
      return checked.errors.length === 0;
    },
  };
  if (json['version'] !== schema.version)
    errors.push(`version must be ${schema.version}`);
  const { version: _version, ...rest } = json;
  objectOf(schema.sections)(rest, '', context);
  if (!Object.keys(schema.sections).some((key) => defined(json, key)))
    errors.push('the file gives nothing');
  return { errors, params };
}
