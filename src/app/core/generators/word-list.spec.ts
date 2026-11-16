import enCommon from '../../../../public/packs/base-en/generators/common.json';
import enItems from '../../../../public/packs/base-en/generators/items.json';
import frItems from '../../../../public/packs/base-fr/generators/items.json';
import enPack from '../../../../public/packs/base-en/pack.json';
import frPack from '../../../../public/packs/base-fr/pack.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import { checkPhrase } from './phrase';
import { validateItemWordList, WORD_LIST_VERSION } from './word-list';

type Json = Record<string, any>;

/** A small valid v2 file; each test breaks one thing. */
function valid(): Json {
  return {
    version: 2,
    kinds: {
      sword: {
        nouns: [{ text: 'Rapière', gender: 'f' }],
        descriptions: ['Une lame fine.'],
        names: { common: ['Lame de {base}'] },
      },
    },
    tints: {
      fire: {
        adjectives: { rare: [{ m: 'ardent', f: 'ardente' }] },
        suffixes: { rare: ['des braises'] },
        descriptions: ['Encore tiède.'],
      },
    },
    adjectives: { common: [{ m: 'usé', f: 'usée' }] },
    suffixes: { rare: ['de vigueur'] },
    templates: { common: ['{base} {adjective}', '{base}'], rare: ['{base} {suffix}'] },
  };
}

function errorsOf(json: unknown, params?: readonly string[]): string[] {
  const result = validateItemWordList(json, params);
  return result.ok ? [] : result.errors;
}

function warningsOf(json: unknown, params?: readonly string[]): string[] {
  const result = validateItemWordList(json, params);
  if (!result.ok) throw new Error(`invalid: ${result.errors.join(' | ')}`);
  return result.warnings;
}

describe('validateItemWordList', () => {
  it('is version 2', () => {
    expect(WORD_LIST_VERSION).toBe(2);
  });

  it('accepts a full v2 file with no warning', () => {
    const result = validateItemWordList(valid());
    expect(result).toMatchObject({ ok: true, warnings: [] });
  });

  it('gives the typed value back', () => {
    const result = validateItemWordList(valid());
    expect(result.ok && result.value.kinds?.['sword']?.nouns?.[0].text).toBe('Rapière');
    expect(result.ok && result.value.tints?.['fire']?.suffixes?.['rare']).toEqual(['des braises']);
  });

  it('accepts a file with a single section', () => {
    expect(validateItemWordList({ version: 2, templates: { common: ['{base}'] } }).ok).toBe(true);
    expect(validateItemWordList({ version: 2, kinds: { key: { nouns: [{ text: 'Key' }] } } }).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validateItemWordList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('rejects a v1 file', () => {
    const errors = errorsOf({ ...valid(), version: 1 });
    expect(errors).toContain('version must be 2');
  });

  it('rejects a file that gives nothing', () => {
    expect(validateItemWordList({ version: 2 }).ok).toBe(false);
  });

  it('rejects the sections of v1 and other unknown fields', () => {
    const json = { ...valid(), bases: { head: [{ text: 'Helm' }] }, descriptions: { item: ['x'] }, extra: 1 };
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('bases'))).toBe(true);
    expect(errors.some((e) => e.includes('descriptions'))).toBe(true);
    expect(errors.some((e) => e.includes('extra'))).toBe(true);
  });

  it('rejects unknown fields in a kind and in a tint', () => {
    const json = valid();
    json['kinds']['sword']['colour'] = 'red';
    json['tints']['fire']['nouns'] = [];
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('kinds.sword') && e.includes('colour'))).toBe(true);
    expect(errors.some((e) => e.includes('tints.fire') && e.includes('nouns'))).toBe(true);
  });

  it('rejects an unknown rarity', () => {
    const json = valid();
    json['templates']['epic'] = ['{base}'];
    expect(errorsOf(json).some((e) => e.includes('templates') && e.includes('epic'))).toBe(true);
  });

  it('rejects bad nouns and adjectives, with their path', () => {
    const json = valid();
    json['kinds']['sword']['nouns'] = [{ text: 'Rapière', gender: 'n' }, { gender: 'm' }];
    json['adjectives']['common'] = [{ m: 'usé' }];
    json['tints']['fire']['adjectives']['rare'] = [3];
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('kinds.sword.nouns[0]'))).toBe(true);
    expect(errors.some((e) => e.includes('kinds.sword.nouns[1]'))).toBe(true);
    expect(errors.some((e) => e.includes('adjectives.common[0]'))).toBe(true);
    expect(errors.some((e) => e.includes('tints.fire.adjectives.rare[0]'))).toBe(true);
  });

  it('rejects an invalid kind id', () => {
    const json = valid();
    json['kinds']['Bad Kind'] = { nouns: [{ text: 'X' }] };
    expect(errorsOf(json).some((e) => e.includes('Bad Kind'))).toBe(true);
  });

  it('rejects phrases with a syntax error, naming where', () => {
    const json = valid();
    json['kinds']['sword']['descriptions'] = ['Une [lame|épée'];
    json['tints']['fire']['descriptions'] = ['{maker'];
    json['suffixes']['rare'] = ['de [x'];
    json['tints']['fire']['suffixes']['rare'] = ['des {g:a}'];
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('kinds.sword.descriptions[0]'))).toBe(true);
    expect(errors.some((e) => e.includes('tints.fire.descriptions[0]'))).toBe(true);
    expect(errors.some((e) => e.includes('suffixes.rare[0]'))).toBe(true);
    expect(errors.some((e) => e.includes('tints.fire.suffixes.rare[0]'))).toBe(true);
  });

  it('requires {base} in templates and in kind names', () => {
    const json = valid();
    json['templates']['common'] = ['{adjective}'];
    json['kinds']['sword']['names']['common'] = ['Lame de feu'];
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('templates.common') && e.includes('{base}'))).toBe(true);
    expect(errors.some((e) => e.includes('kinds.sword.names.common') && e.includes('{base}'))).toBe(true);
  });

  it('warns, without failing, about {suffix} for a rarity with no suffix anywhere', () => {
    const json = valid();
    json['templates']['common'] = ['{base} {suffix}'];

    const warnings = warningsOf(json);

    expect(warnings.some((w) => w.includes('templates.common') && w.includes('suffix'))).toBe(true);
  });

  it('counts tinted suffixes as suffixes', () => {
    const json = valid();
    json['suffixes'] = undefined;
    json['templates']['rare'] = ['{base} {suffix}'];
    expect(warningsOf(json)).toEqual([]);
  });

  it('warns about params used and not defined, once per param', () => {
    const json = valid();
    json['kinds']['sword']['descriptions'] = ['Forgée par {maker}, vue à {place}.', '{maker} l\'a perdue.'];
    json['kinds']['sword']['names'] = { common: ['{base} de {effect}'] };

    const warnings = warningsOf(json);

    expect(warnings.filter((w) => w.includes('maker'))).toHaveLength(1);
    expect(warnings.some((w) => w.includes('place'))).toBe(true);
    expect(warnings.some((w) => w.includes('effect'))).toBe(true);
  });

  it('does not warn about the params it is told are defined', () => {
    const json = valid();
    json['kinds']['sword']['descriptions'] = ['Forgée par {maker}, vue à [{place}|ici].'];
    expect(warningsOf(json, ['maker', 'place'])).toEqual([]);
  });
});

describe('the Base item word lists', () => {
  it.each([
    ['en', enItems, enPack, enCommon],
    ['fr', frItems, frPack, frCommon],
  ])('%s is valid, with no warning once the Base params are known', (_lang, items, _pack, common) => {
    const result = validateItemWordList(items, Object.keys(common.params));
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok ? result.warnings : []).toEqual([]);
  });

  it.each([
    ['en', enItems, enPack],
    ['fr', frItems, frPack],
  ])('%s only uses kinds of the Base manifest tree', (_lang, items, pack) => {
    const tree = (pack as Json)['domains']['items']['kinds'];
    const unknown = Object.keys((items as Json)['kinds'] ?? {}).filter((kind) => !(kind in tree));
    expect(unknown).toEqual([]);
  });

  it.each([
    ['en', enItems],
    ['fr', frItems],
  ])('%s gives nouns to the new kinds and descriptions to the roots', (_lang, items) => {
    const kinds = (items as Json)['kinds'];
    for (const kind of ['sword', 'staff', 'mace', 'orb', 'lantern', 'elixir', 'potion', 'ring']) {
      expect(kinds[kind]?.nouns?.length, kind).toBeGreaterThan(0);
    }
    for (const root of ['equipment', 'consumable', 'item']) {
      expect(kinds[root]?.descriptions?.length, root).toBeGreaterThan(0);
    }
  });

  it.each([
    ['en', enItems],
    ['fr', frItems],
  ])('%s has tinted words for rust, silver, fire, ice, arcane and shadow', (_lang, items) => {
    const tints = (items as Json)['tints'];
    for (const tint of ['rust', 'silver', 'fire', 'ice', 'arcane', 'shadow']) {
      const t = tints?.[tint];
      expect(Object.keys(t?.adjectives ?? {}).length + Object.keys(t?.suffixes ?? {}).length, tint).toBeGreaterThan(0);
    }
  });

  it.each([
    ['en', enItems],
    ['fr', frItems],
  ])('%s uses only phrases that pass the phrase check, and has templates for every rarity', (_lang, items) => {
    const templates = (items as Json)['templates'];
    for (const rarity of ['common', 'uncommon', 'rare', 'mythic', 'legendary']) {
      expect(templates[rarity]?.length, rarity).toBeGreaterThan(0);
      for (const template of templates[rarity]) expect(checkPhrase(template).errors).toEqual([]);
    }
  });
});
