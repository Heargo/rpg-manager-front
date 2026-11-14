import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack as validate } from './pack';

// Typed loosely: `fits` does not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);
const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);
const read = (id: string): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

const stops = [
  { position: 0, color: '#000000' },
  { position: 1, color: '#ffffff' },
];

const withFits = (fits: unknown) => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des choses',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  tints: { ember: { gradient: stops, fits } },
  domains: {
    items: {
      kinds: { equipment: { type: 'equipment' }, weapon: { parent: 'equipment', slot: 'weapon1' } },
      texts: 'generators/items.json',
    },
  },
  sprites: [],
});

describe('validatePack tint fits', () => {
  it('rejects a kind id that is not kebab-case', () => {
    const result = validatePack(withFits(['Weapon']));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('ember') && e.includes('Weapon'))).toBe(true);
  });

  it('rejects fits that is not a list', () => {
    const result = validatePack(withFits('weapon'));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('ember'))).toBe(true);
  });
});

describe('the real Base tints', () => {
  it('give rust, steel, silver, wood and leaf a list of kinds that exist, and the rest none', () => {
    const manifest = read('base-fr');
    const kinds = manifest['domains'].items.kinds;
    for (const id of ['rust', 'steel', 'silver', 'wood', 'leaf']) {
      const fits: string[] = manifest['tints'][id].fits;
      expect(fits.length, id).toBeGreaterThan(0);
      for (const kind of fits) expect(kinds[kind], `${id}: ${kind}`).toBeDefined();
    }
    expect(manifest['tints']['rust'].fits).toContain('weapon');
    expect(manifest['tints']['rust'].fits).not.toContain('consumable');
    for (const id of ['fire', 'ice', 'arcane', 'shadow', 'gold'])
      expect(manifest['tints'][id].fits, id).toBeUndefined();
  });

  it('are identical in both languages, fits included', () => {
    expect(read('base-fr')['tints']).toEqual(read('base-en')['tints']);
    expect(read('base-en')['tints']['rust'].fits).toBeDefined();
  });
});
