import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRegistry } from './pack-registry';

const entry = (): Record<string, unknown> => ({
  id: 'extra',
  name: 'Extra',
  description: 'Plus',
  author: 'Jane',
  license: 'CC0-1.0',
  licenseUrl: 'https://example.org/cc0',
  size: 1234,
  sprites: 3,
  language: 'fr',
});

describe('validateRegistry', () => {
  it('accepts a registry and keeps its packs in order, builtIn included', () => {
    const result = validateRegistry({ format: 1, packs: [{ ...entry(), id: 'base-fr', builtIn: true }, entry()] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.packs.map((p) => p.id)).toEqual(['base-fr', 'extra']);
      expect(result.value.packs[0].builtIn).toBe(true);
      expect(result.value.packs[1].size).toBe(1234);
    }
  });

  it('rejects anything that is not an object with format 1 and a packs list', () => {
    for (const bad of [null, [], 'x', { format: 2, packs: [] }, { format: 1 }, { format: 1, packs: {} }]) {
      expect(validateRegistry(bad).ok).toBe(false);
    }
  });

  it('lists the problems of an entry with the field they concern', () => {
    const result = validateRegistry({
      format: 1,
      packs: [{ ...entry(), id: 'Bad Id', size: -1, license: '', language: 'de', name: { en: 'x' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join('\n');
      for (const field of ['id', 'size', 'license', 'language', 'name']) expect(text).toContain(field);
    }
  });

  it('requires a language that is en or fr, and rejects the old languages list', () => {
    const { language: _language, ...without } = entry();
    for (const bad of [without, { ...entry(), language: 'de' }, { ...without, languages: ['en', 'fr'] }]) {
      const result = validateRegistry({ format: 1, packs: [bad] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('language');
    }
  });

  it('rejects a name and a description given per language', () => {
    for (const bad of [{ ...entry(), name: { en: 'Extra', fr: 'Extra' } }, { ...entry(), description: { en: 'a', fr: 'b' } }]) {
      expect(validateRegistry({ format: 1, packs: [bad] }).ok).toBe(false);
    }
  });

  it('rejects two entries with the same id', () => {
    const result = validateRegistry({ format: 1, packs: [entry(), entry()] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/twice|duplicate/i);
  });
});

describe('the real registry (public/packs/index.json)', () => {
  it('lists base-fr and base-en, both built in, each with its language', () => {
    const json = JSON.parse(readFileSync(join(process.cwd(), 'public/packs/index.json'), 'utf8'));

    const result = validateRegistry(json);

    if (!result.ok) throw new Error(result.errors.join('\n'));
    const bases = result.value.packs.filter((p) => p.builtIn);
    expect(bases.map((p) => [p.id, p.language, p.sprites])).toEqual([
      ['base-fr', 'fr', 101],
      ['base-en', 'en', 101],
    ]);
  });
});
