import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCommonTexts } from '../generators/common-texts';
import { validatePack as validate } from './pack';

// Typed loosely: `sharedKinds` and `shared` do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);
const readJson = (path: string): Record<string, any> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/packs', path), 'utf8'));

const manifest = (extra: Record<string, unknown> = {}, language: string | undefined = 'fr') => ({
  format: 2,
  id: 'my-pack',
  ...(language ? { language } : {}),
  name: 'Mon pack',
  description: 'Des choses',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sprites: [],
  ...extra,
});

const errorsOf = (json: unknown): string[] => {
  const result = validatePack(json);
  return result.ok ? [] : result.errors;
};

describe('validatePack shared kinds', () => {
  const tree = {
    material: {},
    metal: { parent: 'material' },
    iron: { parent: 'metal' },
    steel: { parent: 'metal' },
  };

  it('accepts a tree and keeps it on the pack', () => {
    const result = validatePack(manifest({ sharedKinds: tree }));
    expect(result.ok).toBe(true);
    expect(result.value.sharedKinds).toEqual(tree);
    expect(validatePack(manifest({ sharedKinds: { ...tree, material: { parent: 'iron' } } })).ok).toBe(false);
  });

  it('accepts a neutral pack that declares a tree', () => {
    expect(validatePack(manifest({ sharedKinds: tree }, undefined)).ok).toBe(true);
    expect(validatePack(manifest({ sharedKinds: { a: { parent: 'a' } } }, undefined)).ok).toBe(false);
  });

  it('accepts a parent declared by another pack', () => {
    expect(validatePack(manifest({ sharedKinds: { bronze: { parent: 'metal' } } })).ok).toBe(true);
    expect(validatePack(manifest({ sharedKinds: { bronze: { parent: 'Metal' } } })).ok).toBe(false);
  });

  it('rejects an id that is not kebab-case, a cycle, an unknown field and a tree that is not an object', () => {
    expect(errorsOf(manifest({ sharedKinds: { Iron: {} } })).some((e) => e.includes('Iron'))).toBe(true);
    expect(
      errorsOf(manifest({ sharedKinds: { a: { parent: 'b' }, b: { parent: 'a' } } })).some((e) => e.includes('cycle')),
    ).toBe(true);
    expect(errorsOf(manifest({ sharedKinds: { iron: { slot: 'head' } } })).some((e) => e.includes('slot'))).toBe(true);
    expect(errorsOf(manifest({ sharedKinds: [] })).some((e) => e.includes('sharedKinds'))).toBe(true);
  });
});

describe('validatePack shared fits of a domain kind', () => {
  const withShared = (shared: unknown) =>
    manifest({
      sharedKinds: { material: {}, metal: { parent: 'material' } },
      domains: {
        items: {
          kinds: { equipment: { type: 'equipment' }, weapon: { parent: 'equipment', slot: 'weapon1', shared } },
          texts: 'generators/items.json',
        },
      },
    });

  it('accepts a list of kebab-case ids and keeps it', () => {
    const result = validatePack(withShared(['metal']));
    expect(result.ok).toBe(true);
    expect(result.value.domains.items.kinds.weapon.shared).toEqual(['metal']);
  });

  it('rejects a shared that is not a list of kebab-case ids', () => {
    expect(errorsOf(withShared('metal')).some((e) => e.includes('weapon') && e.includes('shared'))).toBe(true);
    expect(errorsOf(withShared(['Metal'])).some((e) => e.includes('weapon') && e.includes('Metal'))).toBe(true);
  });
});

describe('validateCommonTexts v2', () => {
  const valid = (): Record<string, any> => ({
    version: 2,
    params: { place: ['Valombre'] },
    kinds: {
      iron: {
        words: [{ text: 'fer', gender: 'm' }, { text: 'chaînes', gender: 'f', plural: true }],
        adjectives: [{ m: 'ferreux', f: 'ferreuse' }, 'rouillé'],
        descriptions: ['Forgé en {place}.'],
      },
    },
  });
  const errors = (json: unknown, declared?: string[]): string[] => {
    const result = (validateCommonTexts as any)(json, declared);
    return result.ok ? [] : result.errors;
  };

  it('accepts words, adjectives and descriptions per kind, with no warning when the kinds are declared', () => {
    const result = (validateCommonTexts as any)(valid(), ['material', 'iron']);
    expect(result).toMatchObject({ ok: true, warnings: [] });
  });

  it('accepts a file with kinds only', () => {
    const json = { version: 2, kinds: { iron: { words: [{ text: 'fer' }] } } };
    expect((validateCommonTexts as any)(json, ['iron']).ok).toBe(true);
  });

  it('rejects version 1', () => {
    expect(errors({ ...valid(), version: 1 })).toContain('version must be 2');
  });

  it('rejects a bad kind id, a word without text, a half-gendered adjective and an unknown field, with their path', () => {
    const json = valid();
    json['kinds']['Bad Id'] = { words: [{ text: 'x' }] };
    json['kinds']['iron']['words'].push({ gender: 'm' });
    json['kinds']['iron']['adjectives'].push({ m: 'seul' });
    json['kinds']['iron']['colour'] = [];
    const found = errors(json);
    expect(found.some((e) => e.includes('Bad Id'))).toBe(true);
    expect(found.some((e) => e.includes('kinds.iron.words[2]'))).toBe(true);
    expect(found.some((e) => e.includes('kinds.iron.adjectives[2]'))).toBe(true);
    expect(found.some((e) => e.includes('colour'))).toBe(true);
  });

  it('warns about texts for a shared kind the active packs do not declare, without failing', () => {
    const result = (validateCommonTexts as any)(valid(), ['material']);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w: string) => w.includes('iron'))).toBe(true);
  });
});

describe.each(['base-fr', 'base-en'])('the %s pack, as shared kinds', (id) => {
  const pack = readJson(`${id}/pack.json`);
  const common = readJson(`${id}/generators/common.json`);

  it('is valid, with a common.json v2 that has no warning', () => {
    expect(validatePack(pack).ok).toBe(true);
    const result = (validateCommonTexts as any)(common, Object.keys(pack['sharedKinds'] ?? {}));
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(common['version']).toBe(2);
  });

  it('declares the starter material tree', () => {
    const kinds = pack['sharedKinds'];
    expect(kinds['material']).toEqual({});
    for (const child of ['metal', 'wood', 'leather', 'cloth', 'bone', 'stone'])
      expect(kinds[child], child).toEqual({ parent: 'material' });
    expect(Object.keys(kinds).length).toBeGreaterThan(6);
  });

  it('gives its item kinds shared fits that exist, e.g. a weapon takes metal', () => {
    const kinds = pack['domains'].items.kinds;
    const withFits = Object.entries<any>(kinds).filter(([, kind]) => kind.shared);
    expect(withFits.length).toBeGreaterThan(0);
    for (const [kindId, kind] of withFits)
      for (const shared of kind.shared as string[]) expect(pack['sharedKinds'][shared], `${kindId}: ${shared}`).toBeDefined();
    expect(kinds['weapon'].shared).toContain('metal');
  });

  it('has templates or descriptions that use {material}', () => {
    expect(pack['sharedKinds']).toBeDefined();
    expect(JSON.stringify(readJson(`${id}/generators/items.json`))).toContain('{material');
  });
});
