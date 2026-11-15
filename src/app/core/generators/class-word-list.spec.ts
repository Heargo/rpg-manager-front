import enCommon from '../../../../public/packs/base-en/generators/common.json';
import enClasses from '../../../../public/packs/base-en/generators/classes.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import frClasses from '../../../../public/packs/base-fr/generators/classes.json';
import enPack from '../../../../public/packs/base-en/pack.json';
import { listChecker } from '../packs/pack-files';
import { CLASS_WORD_LIST_VERSION, validateClassWordList } from './class-word-list';

type Json = Record<string, any>;

/** A small valid v2 file; each test breaks one thing. */
function valid(): Json {
  return {
    version: 2,
    templates: ['{noun}', '{adjective} {noun}', '{noun} of {suffix}'],
    adjectives: ['Swift', { m: 'Brave', f: 'Brave' }],
    suffixes: ['the Storm', 'Dawn'],
    kinds: {
      warrior: {
        nouns: [{ text: 'Warrior' }, { text: 'Knight' }],
        descriptions: ['A blow at {place}.'],
        adjectives: ['Hard'],
        suffixes: ['Steel'],
        names: ['{noun} of {suffix}'],
      },
      mage: {
        nouns: [{ text: 'Mage', gender: 'm' }],
        descriptions: ['Calm.'],
      },
    },
  };
}

const errorsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateClassWordList(json, params);
  return result.ok ? [] : result.errors;
};

const warningsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateClassWordList(json, params);
  if (!result.ok) throw new Error(`invalid: ${result.errors.join(' | ')}`);
  return result.warnings;
};

const has = (errors: string[], ...words: string[]) => errors.some((e) => words.every((w) => e.includes(w)));

describe('validateClassWordList', () => {
  it('is version 2', () => {
    expect(CLASS_WORD_LIST_VERSION).toBe(2);
  });

  it('accepts a full v2 file; {place} is only a warning without params', () => {
    expect(validateClassWordList(valid(), ['place'])).toMatchObject({ ok: true, warnings: [] });
  });

  it('gives the typed value back', () => {
    const result = validateClassWordList(valid(), ['place']);
    expect(result.ok && result.value.templates).toEqual(['{noun}', '{adjective} {noun}', '{noun} of {suffix}']);
    expect(result.ok && result.value.kinds?.['warrior']?.suffixes).toEqual(['Steel']);
    expect(result.ok && result.value.kinds?.['warrior']?.names).toEqual(['{noun} of {suffix}']);
  });

  it('accepts a file with a single section', () => {
    expect(validateClassWordList({ version: 2, suffixes: ['Dawn'] }).ok).toBe(true);
    expect(validateClassWordList({ version: 2, kinds: { warrior: { nouns: [{ text: 'Warrior' }] } } }).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validateClassWordList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('rejects a v1 file', () => {
    expect(errorsOf({ ...valid(), version: 1 })).toContain('version must be 2');
  });

  it('rejects a v1 file shape (nouns at the top level)', () => {
    const v1 = { version: 1, templates: ['{noun}'], nouns: [{ text: 'X' }] };
    expect(validateClassWordList(v1).ok).toBe(false);
  });

  it('rejects a file that gives nothing', () => {
    expect(validateClassWordList({ version: 2 }).ok).toBe(false);
  });

  it('rejects unknown top-level fields and unknown fields in a kind', () => {
    const json = valid();
    json['given'] = [{ text: 'Aldo', gender: 'm' }];
    json['kinds']['warrior']['roles'] = ['story'];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'given')).toBe(true);
    expect(has(errors, 'kinds.warrior', 'roles')).toBe(true);
  });

  it('rejects bad nouns, with their path', () => {
    const json = valid();
    json['kinds']['warrior']['nouns'] = [{ text: 'Warrior', gender: 'n' }, { gender: 'm' }];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'kinds.warrior.nouns[0]')).toBe(true);
    expect(has(errors, 'kinds.warrior.nouns[1]')).toBe(true);
  });

  it('rejects bad adjectives and suffixes, top-level and per kind, with their path', () => {
    const json = valid();
    json['adjectives'] = [3];
    json['suffixes'] = [''];
    json['kinds']['warrior']['adjectives'] = [{ m: 'Hard' }];
    json['kinds']['warrior']['suffixes'] = [7];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'adjectives[0]')).toBe(true);
    expect(has(errors, 'suffixes[0]')).toBe(true);
    expect(has(errors, 'kinds.warrior.adjectives[0]')).toBe(true);
    expect(has(errors, 'kinds.warrior.suffixes[0]')).toBe(true);
  });

  it('rejects an invalid kind id', () => {
    const json = valid();
    json['kinds']['Bad Kind'] = { nouns: [{ text: 'X' }] };
    expect(has(errorsOf(json, ['place']), 'Bad Kind')).toBe(true);
  });

  it('rejects phrases with a syntax error, naming where', () => {
    const json = valid();
    json['kinds']['warrior']['descriptions'] = ['A [blow|hit'];
    json['kinds']['warrior']['names'] = ['{noun {suffix}'];
    json['templates'] = ['{noun} [of'];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'kinds.warrior.descriptions[0]')).toBe(true);
    expect(has(errors, 'kinds.warrior.names[0]')).toBe(true);
    expect(has(errors, 'templates[0]')).toBe(true);
  });

  it('accepts the {noun}, {adjective} and {suffix} placeholders without asking for a param', () => {
    expect(warningsOf({ ...valid(), kinds: { warrior: { nouns: [{ text: 'Warrior' }], names: ['{adjective} {noun} {suffix}'] } } })).toEqual([]);
  });

  it('warns about a param that is used and defined nowhere, and not when it is given', () => {
    expect(warningsOf(valid()).some((w) => w.includes('place'))).toBe(true);
    expect(warningsOf(valid(), ['place'])).toEqual([]);
  });
});

describe("listChecker('classes')", () => {
  it('has no problem with a valid v2 file', () => {
    expect(listChecker('classes')(valid())).toEqual([]);
  });

  it('turns a v1 file into readable problems', () => {
    const v1 = { version: 1, templates: ['{noun}'], nouns: [{ text: 'X' }] };
    expect(listChecker('classes')(v1)).toContain('version must be 2');
  });

  it('reports where a v2 file is wrong', () => {
    const json = valid();
    json['kinds']['warrior']['nouns'] = [{ gender: 'm' }];
    expect(has(listChecker('classes')(json), 'kinds.warrior.nouns[0]')).toBe(true);
  });
});

describe.each([
  ['en', enClasses, enCommon],
  ['fr', frClasses, frCommon],
] as const)('the real %s classes.json', (_lang, file, common) => {
  const params = Object.keys(common.params);

  it('is a valid v2 file with no warning', () => {
    const result = validateClassWordList(file, params);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
    expect((file as Json)['version']).toBe(2);
  });

  it('keeps templates, adjectives and suffixes at the top level, with no per-type nouns', () => {
    const json = file as Json;
    expect(json['templates'].length).toBeGreaterThan(0);
    expect(json['adjectives'].length).toBeGreaterThan(5);
    expect(json['suffixes'].length).toBeGreaterThan(5);
    expect(json['nouns']).toBeUndefined();
    expect(json['descriptions']).toBeUndefined();
  });

  it('gives texts only to kinds the Base manifest declares', () => {
    const declared = Object.keys(((enPack.domains.classes as Json)['kinds'] as Json) ?? {});
    expect(declared.length).toBeGreaterThan(0);
    for (const id of Object.keys((file as Json)['kinds'] ?? {})) expect(declared, id).toContain(id);
  });
});
