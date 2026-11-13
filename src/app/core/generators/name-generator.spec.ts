import en from '../../../../public/packs/base/generators/en/items.json';
import fr from '../../../../public/packs/base/generators/fr/items.json';
import { BASE_KEYS, WordList } from './word-list';
import { generateItemName } from './name-generator';
import { seededRandomSource } from './random-source';
import { ITEM_RARITIES } from '../models/item';

/** A tiny list where every draw is forced, to check grammar precisely. */
function frenchList(nounGender: 'm' | 'f'): WordList {
  const base = [{ text: nounGender === 'f' ? 'épée' : 'bouclier', gender: nounGender }];
  const all = Object.fromEntries(BASE_KEYS.map((key) => [key, base])) as WordList['bases'];
  const perRarity = <T>(value: T) => Object.fromEntries(ITEM_RARITIES.map((r) => [r, value])) as Record<(typeof ITEM_RARITIES)[number], T>;
  return {
    version: 1,
    templates: perRarity(['{base} {adjective} {suffix}']),
    bases: all,
    adjectives: perRarity([{ m: 'rouillé', f: 'rouillée' }]),
    suffixes: perRarity(['du renard']),
    descriptions: { item: ['x'], consumable: ['x'], equipment: ['x'] },
  };
}

describe('generateItemName', () => {
  it('agrees the adjective with a feminine noun, in French word order, capitalized', () => {
    const name = generateItemName(seededRandomSource('a'), frenchList('f'), { base: 'weapon1', rarity: 'rare' });
    expect(name).toBe('Épée rouillée du renard');
  });

  it('uses the masculine form for a masculine noun', () => {
    const name = generateItemName(seededRandomSource('a'), frenchList('m'), { base: 'weapon2', rarity: 'rare' });
    expect(name).toBe('Bouclier rouillé du renard');
  });

  it('is deterministic for a seed', () => {
    const words = en as WordList;
    const name = (seed: string) => generateItemName(seededRandomSource(seed), words, { base: 'head', rarity: 'legendary' });
    expect(name('s1')).toBe(name('s1'));
  });

  it.each([
    ['en', en],
    ['fr', fr],
  ])('builds a clean name for every base and rarity in %s', (_lang, json) => {
    const words = json as WordList;
    const source = seededRandomSource('all');
    for (const base of BASE_KEYS) {
      for (const rarity of ITEM_RARITIES) {
        const name = generateItemName(source, words, { base, rarity });
        expect(name).not.toMatch(/[{}]|\s{2}|^\s|\s$/);
        expect(name.charAt(0)).toBe(name.charAt(0).toLocaleUpperCase());
      }
    }
  });
});
