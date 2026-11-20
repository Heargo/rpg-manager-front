import { Adjective, Noun } from '../../../../../core/generators/word-list';
import { ITEM_RARITIES } from '../../../../../core/models/item';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  domainKindTextsOf,
  kindTextsOf,
  kindWordsOf,
  setDomainKindTexts,
  setKindTexts,
  setKindWords,
  StructuredDomain,
} from '../../../../../core/packs/pack-draft-edits';

/** The scope of the words of a domain kind, which has no rarities. */
export const ALL = 'all';

/** The texts of one kind as the form edits them. Words and names are per rarity for items, under `all` otherwise. */
export interface KindTexts {
  nouns: Noun[];
  /** One description per line. */
  descriptions: string;
  /** Name templates, one per line, per scope. */
  names: Record<string, string>;
  adjectives: Record<string, unknown[]>;
  suffixes: Record<string, unknown[]>;
}

export type TextsDomain = 'items' | StructuredDomain;

export const scopesOf = (domain: TextsDomain): readonly string[] =>
  domain === 'items' ? ITEM_RARITIES : [ALL];

const join = (lines: string[] | undefined): string => (lines ?? []).join('\n');

export const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const emptyTexts = (): KindTexts => ({
  nouns: [],
  descriptions: '',
  names: {},
  adjectives: {},
  suffixes: {},
});

/** The texts the draft holds for a kind. */
export function readTexts(
  draft: PackDraft,
  domain: TextsDomain,
  id: string,
): KindTexts {
  if (domain === 'items') {
    const texts = kindTextsOf(draft, id);
    const words = kindWordsOf(draft, id);
    return {
      nouns: texts.nouns,
      descriptions: join(texts.descriptions),
      names: Object.fromEntries(
        Object.entries(texts.names).map(([rarity, list]) => [
          rarity,
          join(list as string[]),
        ]),
      ),
      adjectives: { ...words.adjectives },
      suffixes: { ...words.suffixes },
    };
  }
  const texts = domainKindTextsOf(draft, domain, id);
  return {
    nouns: texts.nouns,
    descriptions: join(texts.descriptions),
    names: { [ALL]: join(texts.names) },
    adjectives: { [ALL]: texts.adjectives },
    suffixes: { [ALL]: texts.suffixes },
  };
}

/** The draft with the texts of a kind replaced by `texts`, through the `pack-draft-edits` helpers. */
export function writeTexts(
  draft: PackDraft,
  domain: TextsDomain,
  id: string,
  texts: KindTexts,
): PackDraft {
  if (domain === 'items') {
    const names = Object.fromEntries(
      Object.entries(texts.names).map(([rarity, text]) => [
        rarity,
        lines(text),
      ]),
    );
    const withTexts = setKindTexts(draft, id, {
      nouns: texts.nouns,
      descriptions: lines(texts.descriptions),
      names,
    });
    return setKindWords(withTexts, id, {
      adjectives: texts.adjectives as never,
      suffixes: texts.suffixes as never,
    });
  }
  return setDomainKindTexts(draft, domain, id, {
    nouns: texts.nouns,
    descriptions: lines(texts.descriptions),
    adjectives: (texts.adjectives[ALL] ?? []) as Adjective[],
    suffixes: (texts.suffixes[ALL] ?? []) as string[],
    names: lines(texts.names[ALL] ?? ''),
  });
}
