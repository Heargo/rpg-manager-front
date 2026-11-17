import { Adjective } from '../../../../../core/generators/word-list';
import { ITEM_RARITIES, ItemRarity } from '../../../../../core/models/item';
import { GradientStop } from '../../../../../core/packs/pack';
import { tintTextsOf } from '../../../../../core/packs/pack-draft-edits';
import { PackDraft } from '../../../../../core/packs/pack-draft';

/** A new tint: dark red, orange, yellow. */
export const DEFAULT_GRADIENT: GradientStop[] = [
  { position: 0, color: '#5a0a0a' },
  { position: 0.5, color: '#c2410c' },
  { position: 1, color: '#fde047' },
];

/** The texts of a tint as typed: one text area per rarity, one entry per line. */
export interface TintTexts {
  adjectives: Record<string, string>;
  suffixes: Record<string, string>;
  descriptions: string;
}

/** The tint being edited in the drawer form. */
export interface TintForm {
  /** The id the tint has in the draft; `null` for a new one. */
  original: string | null;
  id: string;
  stops: GradientStop[];
  fits: string[];
  /** The texts of the tint; `null` for a pack without a language. */
  texts: TintTexts | null;
}

/** A tint of the table: its id, its gradient and the labels of the kinds it fits. */
export interface TintRow {
  id: string;
  stops: GradientStop[];
  /** The kinds it fits as `id — noun`. */
  fits: string[];
  /** The same kinds by their noun, else their id. */
  names: string[];
}

export type TintFormError = 'kebab' | 'duplicate' | null;

export const gradientCss = (stops: readonly GradientStop[]): string =>
  `linear-gradient(to right, ${[...stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(', ')})`;

export const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** "Ardent|Ardente|Ardents|Ardentes" is a gendered adjective (m|f|mp|fp), anything else a plain one. */
export function parseAdjective(line: string): Adjective {
  const [m, f, mp, fp] = line.split('|').map((part) => part.trim());
  if (!f) return m;
  return { m, f, ...(mp ? { mp } : {}), ...(fp ? { fp } : {}) };
}

export const adjectiveLine = (adjective: Adjective): string =>
  typeof adjective === 'string'
    ? adjective
    : [adjective.m, adjective.f, adjective.mp, adjective.fp]
        .join('|')
        .replace(/\|+$/, '');

export const emptyTexts = (): TintTexts => ({
  adjectives: {},
  suffixes: {},
  descriptions: '',
});

/** The texts of a tint of the draft, as typed lines. */
export function readTexts(draft: PackDraft, id: string): TintTexts {
  const texts = tintTextsOf(draft, id);
  const adjectives: Record<string, string> = {};
  const suffixes: Record<string, string> = {};
  for (const rarity of ITEM_RARITIES) {
    adjectives[rarity] = (texts.adjectives[rarity] ?? [])
      .map(adjectiveLine)
      .join('\n');
    suffixes[rarity] = (texts.suffixes[rarity] ?? []).join('\n');
  }
  return {
    adjectives,
    suffixes,
    descriptions: texts.descriptions.join('\n'),
  };
}

/** The typed texts as the lists the draft stores. */
export function parseTexts(texts: TintTexts) {
  const adjectives: Partial<Record<ItemRarity, Adjective[]>> = {};
  const suffixes: Partial<Record<ItemRarity, string[]>> = {};
  for (const rarity of ITEM_RARITIES) {
    adjectives[rarity] = lines(texts.adjectives[rarity] ?? '').map(
      parseAdjective,
    );
    suffixes[rarity] = lines(texts.suffixes[rarity] ?? '');
  }
  return { adjectives, suffixes, descriptions: lines(texts.descriptions) };
}
