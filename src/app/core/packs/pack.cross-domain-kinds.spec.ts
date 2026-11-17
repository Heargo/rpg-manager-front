import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack } from './pack';

const readJson = (path: string): Record<string, any> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/packs', path), 'utf8'));

const manifest = (extra: Record<string, unknown> = {}) => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
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

describe('validatePack without shared kinds', () => {
  it('rejects a pack that still declares sharedKinds, as an unknown field', () => {
    const errors = errorsOf(manifest({ sharedKinds: { material: {}, metal: { parent: 'material' } } }));
    expect(errors.some((e) => e.includes('sharedKinds'))).toBe(true);
  });

  it('rejects a shared fit on an item kind, as an unknown field', () => {
    const errors = errorsOf(
      manifest({
        domains: {
          items: {
            kinds: { equipment: { type: 'equipment' }, weapon: { parent: 'equipment', slot: 'weapon1', shared: ['metal'] } },
            texts: 'generators/items.json',
          },
        },
      }),
    );
    expect(errors.some((e) => e.includes('weapon') && e.includes('shared'))).toBe(true);
  });
});

describe.each(['base-fr', 'base-en'])('the %s pack, with kinds usable in any phrase', (id) => {
  const pack = readJson(`${id}/pack.json`);
  const common = readJson(`${id}/generators/common.json`);
  const items = readJson(`${id}/generators/items.json`);

  it('is valid and declares no shared kinds, and no shared fit on its item kinds', () => {
    expect(validatePack(pack).ok).toBe(true);
    expect(pack['sharedKinds']).toBeUndefined();
    const withFits = Object.values<any>(pack['domains'].items.kinds).filter((kind) => 'shared' in kind);
    expect(withFits).toEqual([]);
  });

  it('has a common.json v2 with params only, among them the material param the weapon descriptions use', () => {
    expect(common['version']).toBe(2);
    expect(common['kinds']).toBeUndefined();
    expect(common['params']['material'].length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(items['kinds']['weapon']['descriptions'])).toContain('{material}');
  });

  it('has an item description that references a kind of the NPCs by its id', () => {
    const npcKinds = Object.keys(pack['domains'].npcs.kinds);
    const descriptions = Object.values<any>(items['kinds']).flatMap((kind) => kind.descriptions ?? []) as string[];
    const used = descriptions.flatMap((text) => [...text.matchAll(/\{([a-z][a-z0-9-]*)(?::adjective)?\}/g)].map((m) => m[1]));
    expect(used.some((name) => npcKinds.includes(name))).toBe(true);
  });
});
