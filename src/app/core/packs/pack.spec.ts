import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { packFileUrl, validatePack } from './pack';

const BASE_JSON = join(process.cwd(), 'public/packs/base/pack.json');

const valid = (): Record<string, unknown> => ({
  format: 1,
  id: 'my-pack',
  name: { en: 'My pack', fr: 'Mon pack' },
  description: { en: 'Things', fr: 'Des choses' },
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  generators: { en: { items: 'generators/en/items.json' } },
  sprites: [
    { id: 'axe', en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'gem', en: 'Gem', fr: 'Gemme', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/gem.png' },
    { id: 'pie', en: 'Pie', fr: 'Tarte', type: 'consumable', slot: 'none', kind: 'colored', image: 'sprites/pie.png' },
  ],
});

const errorsOf = (json: unknown): string[] => {
  const result = validatePack(json);
  if (result.ok) throw new Error('expected an invalid pack');
  return result.errors;
};

describe('validatePack', () => {
  it('accepts a complete manifest and returns it', () => {
    const result = validatePack(valid());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('my-pack');
      expect(result.value.sprites).toHaveLength(3);
    }
  });

  it('accepts a minimal manifest without generators, sprites or homepage', () => {
    const json = valid();
    delete json['generators'];
    json['sprites'] = [];
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validatePack(null).ok).toBe(false);
    expect(validatePack([]).ok).toBe(false);
    expect(validatePack('pack').ok).toBe(false);
  });

  it('rejects an unknown format version, naming the field', () => {
    const errors = errorsOf({ ...valid(), format: 2 });
    expect(errors.some((e) => e.includes('format'))).toBe(true);
  });

  it('rejects an id that is not kebab-case', () => {
    for (const id of ['My Pack', 'my_pack', '-pack', 'pack-', '', 'Pack']) {
      expect(errorsOf({ ...valid(), id }).some((e) => e.includes('id'))).toBe(true);
    }
  });

  it('requires name and description in en and fr', () => {
    expect(errorsOf({ ...valid(), name: { en: 'Only' } }).some((e) => e.includes('name'))).toBe(true);
    expect(errorsOf({ ...valid(), description: { fr: 'Seul' } }).some((e) => e.includes('description'))).toBe(true);
  });

  it('requires version, author, license and licenseUrl', () => {
    for (const field of ['version', 'author', 'license', 'licenseUrl']) {
      const json = valid();
      delete json[field];
      expect(errorsOf(json).some((e) => e.includes(field))).toBe(true);
    }
  });

  it('rejects a generator other than items, npcs, skills and classes', () => {
    const json = { ...valid(), generators: { en: { weapons: 'generators/en/weapons.json' } } };
    expect(errorsOf(json).some((e) => e.includes('weapons'))).toBe(true);
  });

  it('rejects a generator language other than en and fr', () => {
    const json = { ...valid(), generators: { de: { items: 'generators/de/items.json' } } };
    expect(errorsOf(json).some((e) => e.includes('de'))).toBe(true);
  });

  it('rejects a sprite kind that is not grayscale, masked or colored', () => {
    const json = valid();
    (json['sprites'] as Record<string, unknown>[])[1]['kind'] = 'rainbow';
    expect(errorsOf(json).some((e) => e.includes('kind'))).toBe(true);
  });

  it('requires a materials file for a masked sprite', () => {
    const json = valid();
    delete (json['sprites'] as Record<string, unknown>[])[0]['materials'];
    expect(errorsOf(json).some((e) => e.includes('materials'))).toBe(true);
  });

  it('rejects a sprite type or slot that items do not have', () => {
    const typeJson = valid();
    (typeJson['sprites'] as Record<string, unknown>[])[0]['type'] = 'spaceship';
    expect(errorsOf(typeJson).some((e) => e.includes('type'))).toBe(true);
    const slotJson = valid();
    (slotJson['sprites'] as Record<string, unknown>[])[0]['slot'] = 'tail';
    expect(errorsOf(slotJson).some((e) => e.includes('slot'))).toBe(true);
  });

  it('rejects two sprites with the same id', () => {
    const json = valid();
    (json['sprites'] as Record<string, unknown>[])[1]['id'] = 'axe';
    expect(errorsOf(json).some((e) => e.includes('axe'))).toBe(true);
  });

  it('rejects absolute, parent, URL and backslash paths', () => {
    for (const path of ['/etc/passwd', '../x.json', 'a/../../x.json', 'https://evil.test/x.json', 'data:text/plain,hi', 'a\\b.json']) {
      const json = { ...valid(), generators: { en: { items: path } } };
      expect(errorsOf(json).some((e) => e.includes('items')), path).toBe(true);
    }
    const sprite = valid();
    (sprite['sprites'] as Record<string, unknown>[])[0]['image'] = '../axe.png';
    expect(errorsOf(sprite).some((e) => e.includes('image'))).toBe(true);
  });

  it('reports every problem at once', () => {
    expect(errorsOf({ ...valid(), id: 'Bad', format: 9, version: undefined }).length).toBeGreaterThanOrEqual(3);
  });
});

describe('validatePack links', () => {
  it.each(['licenseUrl', 'homepage'])('refuses a %s that is not an https URL', (field) => {
    for (const bad of ['javascript:alert(1)', 'http://example.com/x', 'data:text/html,hi', 'not a url']) {
      const errors = errorsOf({ ...valid(), [field]: bad });
      expect(errors.some((e) => e.includes(field)), `${field}=${bad}`).toBe(true);
    }
  });

  it('accepts https links for licenseUrl and homepage', () => {
    expect(validatePack({ ...valid(), homepage: 'https://example.com/neon' }).ok).toBe(true);
  });
});

describe('packFileUrl', () => {
  it('resolves a path next to the manifest', () => {
    expect(packFileUrl('packs/base/pack.json', 'sprites/axe.png')).toBe('packs/base/sprites/axe.png');
  });

  it('works for a manifest at the root and for an absolute manifest URL', () => {
    expect(packFileUrl('pack.json', 'a/b.json')).toBe('a/b.json');
    expect(packFileUrl('https://example.test/p/pack.json', 'a/b.json')).toBe('https://example.test/p/a/b.json');
  });
});

describe('the real Base pack (public/packs/base/pack.json)', () => {
  const read = (): unknown => JSON.parse(readFileSync(BASE_JSON, 'utf8'));

  it('is a valid manifest with id "base"', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.id).toBe('base');
    expect(result.value.format).toBe(1);
  });

  it('lists 101 masked sprites, each id once', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const sprites = result.value.sprites;
    expect(sprites).toHaveLength(101);
    expect(new Set(sprites.map((s) => s.id)).size).toBe(101);
    expect(sprites.every((s) => s.kind === 'masked')).toBe(true);
    const axe = sprites.find((s) => s.id === 'axe');
    expect(axe).toMatchObject({ en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1', image: 'sprites/axe.png', materials: 'sprites/axe.json' });
  });

  it('provides the four generators in en and fr', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    for (const lang of ['en', 'fr'] as const) {
      for (const generator of ['items', 'npcs', 'skills', 'classes'] as const) {
        expect(result.value.generators[lang]?.[generator]).toBe(`generators/${lang}/${generator}.json`);
      }
    }
  });

  it('has every listed file on disk', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const dir = dirname(BASE_JSON);
    const files = [
      ...Object.values(result.value.generators).flatMap((g) => Object.values(g ?? {})),
      ...result.value.sprites.flatMap((s) => [s.image, s.materials ?? '']),
    ].filter(Boolean) as string[];
    expect(files.length).toBe(8 + 202);
    for (const file of files) expect(existsSync(join(dir, file)), file).toBe(true);
    expect(statSync(BASE_JSON).size).toBeLessThan(64 * 1024);
  });
});
