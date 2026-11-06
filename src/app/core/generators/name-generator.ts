import { ItemRarity } from '../models/item';
import { pick } from './random';
import { RandomSource } from './random-source';
import { Adjective, BaseKey, Gender, WordList } from './word-list';

export interface ItemNameOptions {
  base: BaseKey;
  rarity: ItemRarity;
}

/** Builds a name from the word list: template for the rarity, noun for the base, adjective agreeing with the noun. */
export function generateItemName(source: RandomSource, words: WordList, options: ItemNameOptions): string {
  const template = pick(source, words.templates[options.rarity]);
  const noun = pick(source, words.bases[options.base]);
  const gender: Gender = noun.gender ?? 'm';
  const name = template
    .replace('{base}', noun.text)
    .replace('{adjective}', () => adjectiveForm(pick(source, words.adjectives[options.rarity]), gender))
    .replace('{suffix}', () => pick(source, words.suffixes[options.rarity]));
  return capitalize(name.replace(/\s+/g, ' ').trim());
}

function adjectiveForm(adjective: Adjective, gender: Gender): string {
  return typeof adjective === 'string' ? adjective : adjective[gender];
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
