import { validateRegistry } from './pack-registry';

const entry = (): Record<string, unknown> => ({
  id: 'extra',
  name: { en: 'Extra', fr: 'Extra' },
  description: { en: 'More', fr: 'Plus' },
  author: 'Jane',
  license: 'CC0-1.0',
  licenseUrl: 'https://example.org/cc0',
  size: 1234,
  sprites: 3,
  languages: ['en', 'fr'],
});

describe('validateRegistry', () => {
  it('accepts a registry and keeps its packs in order, builtIn included', () => {
    const result = validateRegistry({ format: 1, packs: [{ ...entry(), id: 'base', builtIn: true }, entry()] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.packs.map((p) => p.id)).toEqual(['base', 'extra']);
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
      packs: [{ ...entry(), id: 'Bad Id', size: -1, license: '', languages: 'fr', name: { en: 'x' } }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join('\n');
      for (const field of ['id', 'size', 'license', 'languages', 'name.fr']) expect(text).toContain(field);
    }
  });

  it('rejects two entries with the same id', () => {
    const result = validateRegistry({ format: 1, packs: [entry(), entry()] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/twice|duplicate/i);
  });
});
