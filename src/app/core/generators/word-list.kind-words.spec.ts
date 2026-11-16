import { validateItemWordList } from './word-list';

type Json = Record<string, any>;

const withKind = (kind: Json): Json => ({
  version: 2,
  kinds: { weapon: kind },
  templates: { common: ['{base}'] },
});

const errorsOf = (json: unknown): string[] => {
  const result = validateItemWordList(json);
  return result.ok ? [] : result.errors;
};

describe('validateItemWordList kind adjectives and suffixes', () => {
  it('accepts adjectives and suffixes per rarity on a kind, tinted or not, and gives them back', () => {
    const kind = {
      adjectives: {
        uncommon: [
          { m: 'affûté', f: 'affûtée' },
          { m: 'rouillé', f: 'rouillée', tint: 'rust' },
          { text: 'en acier', tint: 'steel' },
          'tranchant',
        ],
      },
      suffixes: { rare: ['du boucher', { text: 'des braises', tint: 'fire' }] },
    };
    const result = validateItemWordList(withKind(kind));
    expect(result.ok).toBe(true);
    expect(result.ok && (result.value.kinds?.['weapon'] as any).adjectives.uncommon).toHaveLength(4);
  });

  it('accepts a tint id that no tint of the file declares', () => {
    const kind = { adjectives: { rare: [{ text: 'ardent', tint: 'from-another-pack' }] } };
    expect(validateItemWordList(withKind(kind)).ok).toBe(true);
  });

  it('rejects malformed kind words with an error naming the kind', () => {
    const ok = validateItemWordList(withKind({ adjectives: { rare: [{ text: 'ardent', tint: 'fire' }] } }));
    expect(ok.ok).toBe(true);
    expect(errorsOf(withKind({ adjectives: { rare: [{ m: 'ardent' }] } })).some((e) => e.includes('weapon'))).toBe(true);
    expect(errorsOf(withKind({ suffixes: { epic: ['du roi'] } })).some((e) => e.includes('epic'))).toBe(true);
    expect(errorsOf(withKind({ suffixes: { rare: [{ tint: 'fire' }] } })).length).toBeGreaterThan(0);
    expect(errorsOf(withKind({ adjectives: { rare: [{ text: 'ardent', tint: 5 }] } })).length).toBeGreaterThan(0);
  });
});
