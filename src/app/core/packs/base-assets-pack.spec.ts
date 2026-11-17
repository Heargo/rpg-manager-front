import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack } from './pack';
import { validateRegistry } from './pack-registry';

const read = (path: string): any => JSON.parse(readFileSync(join(process.cwd(), 'public', 'packs', path), 'utf8'));

describe('the neutral base-assets pack', () => {
  const assets = () => read('base-assets/pack.json');

  it('is a valid pack without a language', () => {
    const manifest = assets();

    expect(validatePack(manifest).ok).toBe(true);
    expect(manifest.id).toBe('base-assets');
    expect(manifest.name).toBe('Base assets');
    expect(manifest.language).toBeUndefined();
  });

  it('holds the 101 item sprites, each with its image and its materials file', () => {
    const sprites = assets().sprites;

    expect(sprites).toHaveLength(101);
    expect(sprites.every((s: any) => s.domain === 'items')).toBe(true);
    expect(sprites.some((s: any) => s.id === 'amulet_1' && s.image === 'sprites/amulet_1.png' && s.materials === 'sprites/amulet_1.json')).toBe(true);
  });

  it('keeps the CC BY 4.0 attribution of the sprites', () => {
    const manifest = assets();

    expect(manifest.license).toBe('CC-BY-4.0');
    expect(manifest.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(manifest.author).toContain('Florian Sciberras');
  });

  it('declares every kind its sprites point to, up to a root kind, without the Base', () => {
    const manifest = assets();
    const kinds = manifest.domains.items.kinds as Record<string, { parent?: string; type?: string }>;
    const reachesRoot = (id: string): boolean => {
      for (let hops = 0; hops < 20; hops++) {
        const def = kinds[id];
        if (!def) return false;
        if (!def.parent) return def.type !== undefined;
        id = def.parent;
      }
      return false;
    };

    for (const sprite of manifest.sprites) expect(sprite.kinds.every(reachesRoot)).toBe(true);
  });

  it.each(['base-fr', 'base-en'])('%s is still valid and ships no sprite', (id) => {
    const manifest = read(`${id}/pack.json`);

    expect(validatePack(manifest).ok).toBe(true);
    expect(manifest.sprites ?? []).toEqual([]);
  });

  it('is listed in the registry next to the two Bases, with updated counts', () => {
    const registry = read('index.json');
    const result = validateRegistry(registry);
    const entry = (id: string) => registry.packs.find((p: any) => p.id === id);

    expect(result.ok).toBe(true);
    expect(registry.packs.map((p: any) => p.id).sort()).toEqual(['base-assets', 'base-en', 'base-fr']);
    expect(entry('base-assets')).toMatchObject({ sprites: 101, builtIn: true, license: 'CC-BY-4.0' });
    expect(entry('base-assets').language).toBeUndefined();
    expect(entry('base-fr').sprites).toBe(0);
    expect(entry('base-en').sprites).toBe(0);
  });
});
