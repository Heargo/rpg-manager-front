import enCommon from '../../../../public/packs/base-en/generators/common.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import enPack from '../../../../public/packs/base-en/pack.json';
import frPack from '../../../../public/packs/base-fr/pack.json';
import { checkPhrase } from './phrase';
import { COMMON_TEXTS_VERSION, validateCommonTexts } from './common-texts';

type Json = Record<string, any>;

const valid = (): Json => ({
  version: 2,
  params: {
    maker: ['un forgeron nain', 'les moines de {place}', 'un apprenti [maladroit|pressé]'],
    place: ['Valombre', 'la côte gelée'],
  },
});

const errorsOf = (json: unknown): string[] => {
  const result = validateCommonTexts(json);
  return result.ok ? [] : result.errors;
};

describe('validateCommonTexts', () => {
  it('is version 2', () => {
    expect(COMMON_TEXTS_VERSION).toBe(2);
  });

  it('accepts params and gives the value back, with no warning', () => {
    const result = validateCommonTexts(valid());
    expect(result).toMatchObject({ ok: true, warnings: [] });
    expect(result.ok && result.value.params?.['place']).toEqual(['Valombre', 'la côte gelée']);
  });

  it('rejects something that is not an object', () => {
    expect(validateCommonTexts('x')).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('rejects a wrong version and a file that gives nothing', () => {
    expect(errorsOf({ ...valid(), version: 1 })).toContain('version must be 2');
    expect(validateCommonTexts({ version: 2 }).ok).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(errorsOf({ ...valid(), colour: {} }).some((e) => e.includes('colour'))).toBe(true);
  });

  it('rejects the kinds of the former common.json as an unknown field', () => {
    const errors = errorsOf({ ...valid(), kinds: { iron: { words: [{ text: 'fer' }] } } });
    expect(errors.some((e) => e.includes('kinds'))).toBe(true);
  });

  it('rejects a bad param name and bad entries, with their path', () => {
    const json = valid();
    json['params']['Bad Name'] = ['x'];
    json['params']['place'] = ['ok', '', 3];
    const errors = errorsOf(json);
    expect(errors.some((e) => e.includes('Bad Name'))).toBe(true);
    expect(errors.some((e) => e.includes('params.place[1]'))).toBe(true);
    expect(errors.some((e) => e.includes('params.place[2]'))).toBe(true);
  });

  it('rejects an empty list of entries', () => {
    const json = valid();
    json['params']['place'] = [];
    expect(errorsOf(json).some((e) => e.includes('params.place'))).toBe(true);
  });

  it('rejects entries with a phrase syntax error', () => {
    const json = valid();
    json['params']['maker'] = ['un [forgeron|moine'];
    expect(errorsOf(json).some((e) => e.includes('params.maker[0]'))).toBe(true);
  });

  it('warns about a param used and not defined in the file, without failing', () => {
    const json = valid();
    json['params']['maker'] = ['les gens de {village}'];

    const result = validateCommonTexts(json);

    expect(result.ok).toBe(true);
    expect(result.ok && result.warnings.some((w) => w.includes('village'))).toBe(true);
  });
});

describe('the Base common texts', () => {
  it.each([
    ['en', enCommon, enPack],
    ['fr', frCommon, frPack],
  ])('%s is valid, with the standard params, material included, of 5 entries or more', (_lang, json, pack) => {
    const result = validateCommonTexts(json);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok ? result.warnings : []).toEqual([]);
    for (const name of ['maker', 'owner', 'place', 'event', 'creature', 'effect', 'material']) {
      const entries: string[] = (json as Json)['params'][name] ?? [];
      expect(entries.length, name).toBeGreaterThanOrEqual(5);
      for (const entry of entries) expect(checkPhrase(entry).errors).toEqual([]);
    }
  });

  it.each([
    ['en', enPack],
    ['fr', frPack],
  ])('the %s manifest points at generators/common.json', (_lang, pack) => {
    expect((pack as Json)['common']).toBe('generators/common.json');
  });
});
