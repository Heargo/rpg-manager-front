import enCommon from '../../../../public/packs/base-en/generators/common.json';
import enSkills from '../../../../public/packs/base-en/generators/skills.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import frSkills from '../../../../public/packs/base-fr/generators/skills.json';
import enPack from '../../../../public/packs/base-en/pack.json';
import { listChecker } from '../packs/pack-files';
import { SKILL_WORD_LIST_VERSION, validateSkillWordList } from './skill-word-list';

type Json = Record<string, any>;

/** A small valid v2 file; each test breaks one thing. */
function valid(): Json {
  return {
    version: 2,
    templates: ['{noun}', '{adjective} {noun}', '{noun} of {suffix}'],
    adjectives: ['Swift', { m: 'Brave', f: 'Brave' }],
    suffixes: ['the Storm', 'Dawn'],
    kinds: {
      strike: {
        nouns: [{ text: 'Strike' }, { text: 'Slash' }],
        descriptions: ['A blow at {place}.'],
        adjectives: ['Hard'],
        suffixes: ['Steel'],
        names: ['{noun} of {suffix}'],
      },
      focus: {
        nouns: [{ text: 'Focus', gender: 'm' }],
        descriptions: ['Calm.'],
      },
    },
  };
}

const errorsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateSkillWordList(json, params);
  return result.ok ? [] : result.errors;
};

const warningsOf = (json: unknown, params?: readonly string[]): string[] => {
  const result = validateSkillWordList(json, params);
  if (!result.ok) throw new Error(`invalid: ${result.errors.join(' | ')}`);
  return result.warnings;
};

const has = (errors: string[], ...words: string[]) => errors.some((e) => words.every((w) => e.includes(w)));

describe('validateSkillWordList', () => {
  it('is version 2', () => {
    expect(SKILL_WORD_LIST_VERSION).toBe(2);
  });

  it('accepts a full v2 file; {place} is only a warning without params', () => {
    expect(validateSkillWordList(valid(), ['place'])).toMatchObject({ ok: true, warnings: [] });
  });

  it('gives the typed value back', () => {
    const result = validateSkillWordList(valid(), ['place']);
    expect(result.ok && result.value.templates).toEqual(['{noun}', '{adjective} {noun}', '{noun} of {suffix}']);
    expect(result.ok && result.value.kinds?.['strike']?.suffixes).toEqual(['Steel']);
    expect(result.ok && result.value.kinds?.['strike']?.names).toEqual(['{noun} of {suffix}']);
  });

  it('accepts a file with a single section', () => {
    expect(validateSkillWordList({ version: 2, suffixes: ['Dawn'] }).ok).toBe(true);
    expect(validateSkillWordList({ version: 2, kinds: { strike: { nouns: [{ text: 'Strike' }] } } }).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validateSkillWordList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('rejects a v1 file', () => {
    expect(errorsOf({ ...valid(), version: 1 })).toContain('version must be 2');
  });

  it('rejects a v1 file shape (nouns per type at the top level)', () => {
    const v1 = { version: 1, templates: ['{noun}'], nouns: { active: [{ text: 'X' }], passive: [{ text: 'Y' }] } };
    expect(validateSkillWordList(v1).ok).toBe(false);
  });

  it('rejects a file that gives nothing', () => {
    expect(validateSkillWordList({ version: 2 }).ok).toBe(false);
  });

  it('rejects unknown top-level fields and unknown fields in a kind', () => {
    const json = valid();
    json['given'] = [{ text: 'Aldo', gender: 'm' }];
    json['kinds']['strike']['roles'] = ['story'];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'given')).toBe(true);
    expect(has(errors, 'kinds.strike', 'roles')).toBe(true);
  });

  it('rejects bad nouns, with their path', () => {
    const json = valid();
    json['kinds']['strike']['nouns'] = [{ text: 'Strike', gender: 'n' }, { gender: 'm' }];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'kinds.strike.nouns[0]')).toBe(true);
    expect(has(errors, 'kinds.strike.nouns[1]')).toBe(true);
  });

  it('rejects bad adjectives and suffixes, top-level and per kind, with their path', () => {
    const json = valid();
    json['adjectives'] = [3];
    json['suffixes'] = [''];
    json['kinds']['strike']['adjectives'] = [{ m: 'Hard' }];
    json['kinds']['strike']['suffixes'] = [7];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'adjectives[0]')).toBe(true);
    expect(has(errors, 'suffixes[0]')).toBe(true);
    expect(has(errors, 'kinds.strike.adjectives[0]')).toBe(true);
    expect(has(errors, 'kinds.strike.suffixes[0]')).toBe(true);
  });

  it('rejects an invalid kind id', () => {
    const json = valid();
    json['kinds']['Bad Kind'] = { nouns: [{ text: 'X' }] };
    expect(has(errorsOf(json, ['place']), 'Bad Kind')).toBe(true);
  });

  it('rejects phrases with a syntax error, naming where', () => {
    const json = valid();
    json['kinds']['strike']['descriptions'] = ['A [blow|hit'];
    json['kinds']['strike']['names'] = ['{noun {suffix}'];
    json['templates'] = ['{noun} [of'];
    const errors = errorsOf(json, ['place']);
    expect(has(errors, 'kinds.strike.descriptions[0]')).toBe(true);
    expect(has(errors, 'kinds.strike.names[0]')).toBe(true);
    expect(has(errors, 'templates[0]')).toBe(true);
  });

  it('accepts the {noun}, {adjective} and {suffix} placeholders without asking for a param', () => {
    expect(warningsOf({ ...valid(), kinds: { strike: { nouns: [{ text: 'Strike' }], names: ['{adjective} {noun} {suffix}'] } } })).toEqual([]);
  });

  it('warns about a param that is used and defined nowhere, and not when it is given', () => {
    expect(warningsOf(valid()).some((w) => w.includes('place'))).toBe(true);
    expect(warningsOf(valid(), ['place'])).toEqual([]);
  });
});

describe("listChecker('skills')", () => {
  it('has no problem with a valid v2 file', () => {
    expect(listChecker('skills')(valid())).toEqual([]);
  });

  it('turns a v1 file into readable problems', () => {
    const v1 = { version: 1, templates: ['{noun}'], nouns: { active: [{ text: 'X' }], passive: [{ text: 'Y' }] } };
    expect(listChecker('skills')(v1)).toContain('version must be 2');
  });

  it('reports where a v2 file is wrong', () => {
    const json = valid();
    json['kinds']['strike']['nouns'] = [{ gender: 'm' }];
    expect(has(listChecker('skills')(json), 'kinds.strike.nouns[0]')).toBe(true);
  });
});

describe.each([
  ['en', enSkills, enCommon],
  ['fr', frSkills, frCommon],
] as const)('the real %s skills.json', (_lang, file, common) => {
  const params = Object.keys(common.params);

  it('is a valid v2 file with no warning', () => {
    const result = validateSkillWordList(file, params);
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
    const declared = Object.keys(((enPack.domains.skills as Json)['kinds'] as Json) ?? {});
    expect(declared.length).toBeGreaterThan(0);
    for (const id of Object.keys((file as Json)['kinds'] ?? {})) expect(declared, id).toContain(id);
  });
});
