import en from '../../../../public/packs/base/generators/en/items.json';
import fr from '../../../../public/packs/base/generators/fr/items.json';
import { validateWordList, WordList } from './word-list';

function clone(): Record<string, any> {
  return structuredClone(en) as Record<string, any>;
}

describe('validateWordList', () => {
  it.each([
    ['en', en],
    ['fr', fr],
  ])('accepts the shipped %s word list', (_lang, json) => {
    const result = validateWordList(json);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('rejects something that is not an object', () => {
    expect(validateWordList([])).toEqual({ ok: false, errors: ['the file is not a JSON object'] });
  });

  it('reports missing sections and keys', () => {
    const json = clone();
    delete json['descriptions'];
    delete json['bases']['ring'];
    json['version'] = 2;

    const result = validateWordList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('version must be 1');
    expect(result.errors).toContain('descriptions must be an object');
    expect(result.errors).toContain('bases.ring must be a non-empty list');
  });

  it('rejects unknown placeholders, templates without {base}, and {suffix} without suffixes', () => {
    const json = clone();
    json['templates']['common'] = ['{adjective} {thing}', '{suffix} {base}'];

    const result = validateWordList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'templates.common: unknown placeholder {thing} in "{adjective} {thing}"',
        'templates.common: "{adjective} {thing}" has no {base}',
        'templates.common: "{suffix} {base}" uses {suffix} but suffixes.common is empty',
      ]),
    );
  });

  it('rejects bad genders and half-gendered adjectives', () => {
    const json = clone();
    json['bases']['head'] = [{ text: 'Helm', gender: 'n' }];
    json['adjectives']['rare'] = [{ m: 'runed' }];

    const result = validateWordList(json);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'bases.head[0].gender must be "m" or "f"',
        'adjectives.rare[0] must be a string or { "m": …, "f": … }',
      ]),
    );
  });

  it('types the value on success', () => {
    const result = validateWordList(en);
    const words: WordList | null = result.ok ? result.value : null;
    expect(words?.bases.weapon1.length).toBeGreaterThan(0);
  });
});
