import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { packFileUrl, validatePack } from './pack';

const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);

const valid = (): Record<string, unknown> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des choses',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  domains: { items: { texts: 'generators/items.json' } },
  sprites: [
    { id: 'axe', label: 'Hache', domain: 'items', kinds: ['weapon'], kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'gem', label: 'Gemme', domain: 'items', kinds: ['item'], kind: 'grayscale', image: 'sprites/gem.png' },
    { id: 'pie', label: 'Tarte', domain: 'items', kinds: ['consumable'], kind: 'colored', image: 'sprites/pie.png' },
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

  it('accepts a minimal manifest without domains, sprites or homepage', () => {
    const json = valid();
    delete json['domains'];
    json['sprites'] = [];
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects something that is not an object', () => {
    expect(validatePack(null).ok).toBe(false);
    expect(validatePack([]).ok).toBe(false);
    expect(validatePack('pack').ok).toBe(false);
  });

  it('rejects an unknown format version, naming the field', () => {
    const errors = errorsOf({ ...valid(), format: 1 });
    expect(errors.some((e) => e.includes('format'))).toBe(true);
  });

  it('rejects an id that is not kebab-case', () => {
    for (const id of ['My Pack', 'my_pack', '-pack', 'pack-', '', 'Pack']) {
      expect(errorsOf({ ...valid(), id }).some((e) => e.includes('id'))).toBe(true);
    }
  });

  it('requires name and description as plain strings, and rejects the per-language objects', () => {
    expect(errorsOf({ ...valid(), name: '' }).some((e) => e.includes('name'))).toBe(true);
    expect(errorsOf({ ...valid(), description: undefined }).some((e) => e.includes('description'))).toBe(true);
    expect(errorsOf({ ...valid(), name: { en: 'Mine', fr: 'Mien' } }).some((e) => e.includes('name'))).toBe(true);
    expect(errorsOf({ ...valid(), description: { en: 'My', fr: 'Mon' } }).some((e) => e.includes('description'))).toBe(true);
  });

  it('accepts the languages en and fr', () => {
    expect(validatePack({ ...valid(), language: 'en' }).ok).toBe(true);
    expect(validatePack({ ...valid(), language: 'fr' }).ok).toBe(true);
  });

  it('requires a language that is en or fr when there is one, naming the field', () => {
    const missing = valid();
    delete missing['language'];
    delete missing['domains'];
    expect(validatePack(missing).ok).toBe(true);
    for (const language of ['de', '', 'EN', 42, ['en']]) {
      expect(errorsOf({ ...valid(), language }).some((e) => e.includes('language')), String(language)).toBe(true);
    }
  });

  it('rejects word lists given per language, as the old format did', () => {
    const json = { ...valid(), domains: { items: { texts: { en: 'generators/en/items.json' } } } };
    expect(validatePack(json).ok).toBe(false);
    const both = { ...valid(), domains: { items: { fr: 'generators/fr/items.json', en: {} } } };
    expect(validatePack(both).ok).toBe(false);
  });

  it('rejects a sprite labelled with en and fr instead of a label', () => {
    const json = valid();
    (json['sprites'] as Record<string, unknown>[])[1] = {
      id: 'gem', en: 'Gem', fr: 'Gemme', domain: 'items', kinds: ['item'], kind: 'grayscale', image: 'sprites/gem.png',
    };
    expect(errorsOf(json).some((e) => e.includes('gem') && e.includes('label'))).toBe(true);
  });

  it('requires a label on every sprite', () => {
    const json = valid();
    delete (json['sprites'] as Record<string, unknown>[])[0]['label'];
    expect(errorsOf(json).some((e) => e.includes('axe') && e.includes('label'))).toBe(true);
    (json['sprites'] as Record<string, unknown>[])[0]['label'] = '  ';
    expect(errorsOf(json).some((e) => e.includes('axe') && e.includes('label'))).toBe(true);
  });

  it('requires version, author, license and licenseUrl', () => {
    for (const field of ['version', 'author', 'license', 'licenseUrl']) {
      const json = valid();
      delete json[field];
      expect(errorsOf(json).some((e) => e.includes(field))).toBe(true);
    }
  });

  it('ignores a domain other than items, npcs, skills and classes, with a warning', () => {
    const json = { ...valid(), domains: { weapons: { texts: 'generators/weapons.json' } } };
    const result = validatePack(json);
    expect(result.ok && result.warnings.some((w) => w.includes('weapons'))).toBe(true);
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

  it('rejects a kind type or slot that items do not have', () => {
    const typeJson = { ...valid(), domains: { items: { kinds: { root: { type: 'spaceship' } } } } };
    expect(errorsOf(typeJson).some((e) => e.includes('type'))).toBe(true);
    const slotJson = { ...valid(), domains: { items: { kinds: { root: { type: 'equipment', slot: 'tail' } } } } };
    expect(errorsOf(slotJson).some((e) => e.includes('slot'))).toBe(true);
  });

  it('rejects two sprites with the same id', () => {
    const json = valid();
    (json['sprites'] as Record<string, unknown>[])[1]['id'] = 'axe';
    expect(errorsOf(json).some((e) => e.includes('axe'))).toBe(true);
  });

  it('rejects absolute, parent, URL and backslash paths', () => {
    for (const path of ['/etc/passwd', '../x.json', 'a/../../x.json', 'https://evil.test/x.json', 'data:text/plain,hi', 'a\\b.json']) {
      const json = { ...valid(), domains: { items: { texts: path } } };
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
    expect(packFileUrl('packs/base-fr/pack.json', 'sprites/axe.png')).toBe('packs/base-fr/sprites/axe.png');
  });

  it('works for a manifest at the root and for an absolute manifest URL', () => {
    expect(packFileUrl('pack.json', 'a/b.json')).toBe('a/b.json');
    expect(packFileUrl('https://example.test/p/pack.json', 'a/b.json')).toBe('https://example.test/p/a/b.json');
  });
});

describe.each([
  ['base-fr', 'fr', 'Hache'],
  ['base-en', 'en', 'Axe'],
] as const)('the real %s pack (public/packs/%s/pack.json)', (id, language, axeLabel) => {
  const read = (): unknown => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  it(`is a valid manifest with id "${id}" and language "${language}"`, () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.id).toBe(id);
    expect(result.value.language).toBe(language);
    expect(result.value.format).toBe(2);
  });

  it('lists 101 masked sprites, each id once, with a label in its language', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const sprites = result.value.sprites;
    expect(sprites).toHaveLength(101);
    expect(new Set(sprites.map((s) => s.id)).size).toBe(101);
    expect(sprites.every((s) => s.kind === 'masked')).toBe(true);
    const axe = sprites.find((s) => s.id === 'axe');
    expect(axe).toMatchObject({ label: axeLabel, domain: 'items', kinds: ['axe'], image: 'sprites/axe.png', materials: 'sprites/axe.json' });
  });

  it('provides the four generators once', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    for (const generator of ['items', 'npcs', 'skills', 'classes'] as const) {
      expect(result.value.domains?.[generator]?.texts).toBe(`generators/${generator}.json`);
    }
  });

  it('has every listed file on disk', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const dir = dirname(BASE_JSON(id));
    const files = [
      ...(['items', 'npcs', 'skills', 'classes'] as const).map((g) => result.value.domains?.[g]?.texts),
      ...result.value.sprites.flatMap((s) => [s.image, s.materials ?? '']),
    ].filter(Boolean) as string[];
    expect(files.length).toBe(4 + 202);
    for (const file of files) expect(existsSync(join(dir, file)), file).toBe(true);
    expect(statSync(BASE_JSON(id)).size).toBeLessThan(64 * 1024);
  });
});

describe('the old public/packs/base folder', () => {
  it('is gone, replaced by base-fr and base-en', () => {
    expect(existsSync(join(process.cwd(), 'public/packs/base'))).toBe(false);
  });
});
