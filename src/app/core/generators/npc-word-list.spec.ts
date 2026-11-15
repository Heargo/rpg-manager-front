import enCommon from '../../../../public/packs/base-en/generators/common.json';
import enNpcs from '../../../../public/packs/base-en/generators/npcs.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import frNpcs from '../../../../public/packs/base-fr/generators/npcs.json';
import enPack from '../../../../public/packs/base-en/pack.json';
import { listChecker } from '../packs/pack-files';
import { NPC_WORD_LIST_VERSION, validateNpcWordList } from './npc-word-list';

type Json = Record<string, any>;

/** A small valid v2 file; each test breaks one thing. */
function valid(): Json {
  return {
    version: 2,
    given: [
      { text: 'Aldo', gender: 'm' },
      { text: 'Mila', gender: 'f' },
    ],
    epithets: ['le Sage', { m: 'le Brave', f: 'la Brave' }],
    templates: ['{given}', '{given} {epithet}', '{given} le {noun}'],
    kinds: {
      priest: {
        nouns: [{ text: 'Prêtre', gender: 'm' }, { text: 'Prêtresse', gender: 'f' }],
        descriptions: ['{g:Il|Elle} prie.'],
        adjectives: [{ m: 'pieux', f: 'pieuse' }],
        names: ['{given} {noun}'],
      },
      wolf: {
        nouns: [{ text: 'Loup', gender: 'm' }],
        adjectives: ['gris'],
        names: ['{noun} {adjective}'],
      },
    },
  };
}

const errorsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateNpcWordList(json, params);
  return result.ok ? [] : result.errors;
};

const warningsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateNpcWordList(json, params);
  if (!result.ok) throw new Error(`invalid: ${result.errors.join(' | ')}`);
  return result.warnings;
};

const has = (errors: string[], ...words: string[]) => errors.some((e) => words.every((w) => e.includes(w)));

describe('validateNpcWordList', () => {
  it('is version 2', () => {
    expect(NPC_WORD_LIST_VERSION).toBe(2);
  });

  it('accepts a full v2 file with no warning', () => {
    expect(validateNpcWordList(valid())).toMatchObject({ ok: true, warnings: [] });
  });

  it('gives the typed value back', () => {
    const result = validateNpcWordList(valid());
    expect(result.ok && result.value.given?.[0]).toEqual({ text: 'Aldo', gender: 'm' });
    expect(result.ok && result.value.kinds?.['wolf']?.names).toEqual(['{noun} {adjective}']);
  });

  it('accepts a file with a single section', () => {
    expect(validateNpcWordList({ version: 2, given: [{ text: 'Aldo', gender: 'm' }] }).ok).toBe(true);
    expect(validateNpcWordList({ version: 2, kinds: { wolf: { nouns: [{ text: 'Wolf' }] } } }).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validateNpcWordList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('rejects a v1 file', () => {
    expect(errorsOf({ ...valid(), version: 1 })).toContain('version must be 2');
  });

  it('rejects a file that gives nothing', () => {
    expect(validateNpcWordList({ version: 2 }).ok).toBe(false);
  });

  it('rejects unknown top-level fields and unknown fields in a kind', () => {
    const json = valid();
    json['roles'] = ['story'];
    json['kinds']['wolf']['suffixes'] = ['x'];
    const errors = errorsOf(json);
    expect(has(errors, 'roles')).toBe(true);
    expect(has(errors, 'kinds.wolf', 'suffixes')).toBe(true);
  });

  it('rejects a given name without text or with a bad gender, with its path', () => {
    const json = valid();
    json['given'] = [{ gender: 'm' }, { text: 'Zed', gender: 'n' }, { text: 'Ok', gender: 'f' }];
    const errors = errorsOf(json);
    expect(has(errors, 'given[0]')).toBe(true);
    expect(has(errors, 'given[1]')).toBe(true);
    expect(has(errors, 'given[2]')).toBe(false);
  });

  it('rejects bad epithets and bad kind adjectives, with their path', () => {
    const json = valid();
    json['epithets'] = [3, { m: 'seul' }];
    json['kinds']['wolf']['adjectives'] = [{ m: 'gris' }];
    const errors = errorsOf(json);
    expect(has(errors, 'epithets[0]')).toBe(true);
    expect(has(errors, 'epithets[1]')).toBe(true);
    expect(has(errors, 'kinds.wolf.adjectives[0]')).toBe(true);
  });

  it('rejects bad nouns, with their path', () => {
    const json = valid();
    json['kinds']['wolf']['nouns'] = [{ text: 'Loup', gender: 'n' }, { gender: 'm' }];
    const errors = errorsOf(json);
    expect(has(errors, 'kinds.wolf.nouns[0]')).toBe(true);
    expect(has(errors, 'kinds.wolf.nouns[1]')).toBe(true);
  });

  it('rejects an invalid kind id', () => {
    const json = valid();
    json['kinds']['Bad Kind'] = { nouns: [{ text: 'X' }] };
    expect(has(errorsOf(json), 'Bad Kind')).toBe(true);
  });

  it('rejects phrases with a syntax error, naming where', () => {
    const json = valid();
    json['kinds']['priest']['descriptions'] = ['Il [prie|chante'];
    json['kinds']['wolf']['names'] = ['{noun {adjective}'];
    json['templates'] = ['{given} [le'];
    const errors = errorsOf(json);
    expect(has(errors, 'kinds.priest.descriptions[0]')).toBe(true);
    expect(has(errors, 'kinds.wolf.names[0]')).toBe(true);
    expect(has(errors, 'templates[0]')).toBe(true);
  });

  it('accepts the {given}, {epithet} and {noun} placeholders without asking for a param', () => {
    expect(warningsOf(valid())).toEqual([]);
  });

  it('warns about a param that is used and defined nowhere, and not when it is given', () => {
    const json = valid();
    json['kinds']['priest']['descriptions'] = ['{g:Il|Elle} prie à {place}.'];
    expect(warningsOf(json).some((w) => w.includes('place'))).toBe(true);
    expect(warningsOf(json, ['place'])).toEqual([]);
  });
});

describe("listChecker('npcs')", () => {
  it('has no problem with a valid v2 file', () => {
    expect(listChecker('npcs')(valid())).toEqual([]);
  });

  it('turns a v1 file into readable problems', () => {
    const v1 = { version: 1, given: [{ text: 'Aldo', gender: 'm' }], epithets: ['Grim'], templates: ['{given}'] };
    const problems = listChecker('npcs')(v1);
    expect(problems).toContain('version must be 2');
  });

  it('reports where a v2 file is wrong', () => {
    const json = valid();
    json['kinds']['wolf']['nouns'] = [{ gender: 'm' }];
    expect(has(listChecker('npcs')(json), 'kinds.wolf.nouns[0]')).toBe(true);
  });
});

describe.each([
  ['en', enNpcs, enCommon],
  ['fr', frNpcs, frCommon],
] as const)('the real %s npcs.json', (_lang, file, common) => {
  const params = Object.keys(common.params);

  it('is a valid v2 file with no warning', () => {
    const result = validateNpcWordList(file, params);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
    expect((file as Json)['version']).toBe(2);
  });

  it('keeps the given names and epithets of the old list at the top level', () => {
    const json = file as Json;
    expect(json['given'].length).toBeGreaterThanOrEqual(40);
    expect(json['given'][0]).toEqual({ text: 'Brannoc', gender: 'm' });
    expect(json['epithets'].length).toBeGreaterThanOrEqual(20);
    expect(json['templates'].length).toBeGreaterThan(0);
  });

  it('gives texts only to kinds the Base manifest declares', () => {
    const declared = Object.keys(((enPack.domains.npcs as Json)['kinds'] as Json) ?? {});
    expect(declared.length).toBeGreaterThan(0);
    for (const id of Object.keys((file as Json)['kinds'] ?? {})) expect(declared, id).toContain(id);
  });
});
