import { ItemRarity, ItemSlot, ItemType } from '../models/item';
import { GradientStop } from '../packs/pack';
import { ITEM_KIND_SCHEMA } from '../packs/pack-kinds';
import {
  poolDomain,
  PooledSource,
  poolParams,
  poolTintFits,
  poolTints,
} from '../packs/pooled-domain';
import {
  Adjective,
  KindAdjective,
  KindSuffix,
  KindTexts,
  Noun,
  TintTexts,
} from './word-list';

export interface ItemKindInfo {
  id: string;
  type: ItemType;
  slot: ItemSlot;
  chain: string[];
}

export interface Tinted<T> {
  value: T;
  tint?: string;
}

/** The items of the world's active packs, pooled: the kind tree, the words and the lookups the generator needs. */
export interface ItemVocabulary {
  kind(id: string): ItemKindInfo | undefined;
  nouns(id: string): Noun[];
  descriptions(id: string): string[];
  names(id: string, rarity: ItemRarity): string[];
  drawable(filter?: { type?: ItemType; slot?: ItemSlot }): string[];
  kindForName(name: string): string | undefined;
  /** The top-level words, those of every level of the kind's chain, and the tinted words of the tints that fit the kind (no kind: every tint fits). */
  adjectives(rarity: ItemRarity, kind?: string): Tinted<Adjective>[];
  suffixes(rarity: ItemRarity, kind?: string): Tinted<string>[];
  tints(): string[];
  /** The descriptions of a tint, empty when the tint does not fit the kind. */
  tintDescriptions(tint: string, kind?: string): string[];
  gradients(tint: string): GradientStop[][];
  params: Record<string, string[]>;
  templates(rarity: ItemRarity): string[];
  conflicts: string[];
}

const words = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => (word.length > 1 ? word.replace(/[sx]$/, '') : word));

const containsRun = (haystack: string[], needle: string[]): boolean => {
  for (let at = 0; at + needle.length <= haystack.length; at++)
    if (needle.every((word, i) => haystack[at + i] === word)) return true;
  return false;
};

type PerRarity<T> = Partial<Record<ItemRarity, T[]>>;

export function buildItemVocabulary(sources: PooledSource[]): ItemVocabulary {
  const pooled = poolDomain(sources, ITEM_KIND_SCHEMA);
  const gradients = poolTints(sources);
  const params = poolParams(sources);
  const fits = poolTintFits(sources);
  const texts = (id: string): KindTexts => pooled.texts[id] as KindTexts;
  const section = <T>(name: string): T | undefined =>
    pooled.sections[name] as T | undefined;
  const tintTexts = section<Record<string, TintTexts>>('tints') ?? {};

  const nearest = <T>(
    id: string,
    pick: (texts: KindTexts) => T[] | undefined,
  ): T[] => {
    for (const level of pooled.kinds[id]?.chain ?? []) {
      const found = pick(texts(level) ?? {});
      if (found && found.length > 0) return found;
    }
    return [];
  };
  const nouns = (id: string): Noun[] => nearest(id, (t) => t.nouns);

  const info = (id: string): ItemKindInfo | undefined => {
    const kind = pooled.kinds[id];
    if (!kind) return undefined;
    return {
      id,
      type: kind['type'] as ItemType,
      slot: (kind['slot'] as ItemSlot | undefined) ?? 'none',
      chain: kind.chain,
    };
  };

  const tintFits = (tint: string, kind: string | undefined): boolean => {
    const wanted = fits[tint];
    if (!wanted || kind === undefined) return true;
    const chain = pooled.kinds[kind]?.chain ?? [];
    return wanted.some((id) => chain.includes(id));
  };

  /** A word as written in a kind's list: the tint is lifted out and the value is what the generator uses. */
  const entry = <T>(word: unknown): Tinted<T> => {
    if (typeof word !== 'object' || word === null) return { value: word as T };
    const { tint, text, ...rest } = word as Record<string, unknown>;
    const value = (text !== undefined ? text : rest) as T;
    return typeof tint === 'string' ? { value, tint } : { value };
  };

  const kindWords = <T, K>(
    top: PerRarity<T> | undefined,
    own: (texts: KindTexts) => PerRarity<K> | undefined,
    fromTint: (tint: TintTexts) => PerRarity<T> | undefined,
    rarity: ItemRarity,
    kind: string | undefined,
  ): Tinted<T>[] => [
    ...(top?.[rarity] ?? []).map((value) => ({ value })),
    ...(pooled.kinds[kind ?? '']?.chain ?? [])
      .flatMap((level) => own(texts(level) ?? {})?.[rarity] ?? [])
      .map((word) => entry<T>(word))
      .filter((word) => !word.tint || tintFits(word.tint, kind)),
    ...Object.entries(tintTexts)
      .filter(([tint]) => tintFits(tint, kind))
      .flatMap(([tint, t]) =>
        (fromTint(t)?.[rarity] ?? []).map((value) => ({ value, tint })),
      ),
  ];

  const nounIndex = Object.keys(pooled.kinds).flatMap((id) =>
    (texts(id)?.nouns ?? []).map((noun) => ({ id, words: words(noun.text) })),
  );

  return {
    kind: info,
    nouns,
    descriptions: (id) => nearest(id, (t) => t.descriptions),
    names: (id, rarity) => nearest(id, (t) => t.names?.[rarity]),
    drawable(filter = {}) {
      return Object.keys(pooled.kinds).filter((id) => {
        const kind = info(id)!;
        return (
          nouns(id).length > 0 &&
          (!filter.type || kind.type === filter.type) &&
          (!filter.slot || kind.slot === filter.slot)
        );
      });
    },
    kindForName(name) {
      const given = words(name);
      let best: { id: string; words: number; length: number } | undefined;
      for (const noun of nounIndex) {
        if (noun.words.length === 0 || !containsRun(given, noun.words))
          continue;
        const length = noun.words.join(' ').length;
        if (
          !best ||
          noun.words.length > best.words ||
          (noun.words.length === best.words && length > best.length)
        )
          best = { id: noun.id, words: noun.words.length, length };
      }
      return best?.id;
    },
    adjectives: (rarity, kind) =>
      kindWords<Adjective, KindAdjective>(
        section<PerRarity<Adjective>>('adjectives'),
        (t) => t.adjectives,
        (t) => t.adjectives,
        rarity,
        kind,
      ),
    suffixes: (rarity, kind) =>
      kindWords<string, KindSuffix>(
        section<PerRarity<string>>('suffixes'),
        (t) => t.suffixes,
        (t) => t.suffixes,
        rarity,
        kind,
      ),
    tints: () => Object.keys(gradients),
    tintDescriptions: (tint, kind) =>
      tintFits(tint, kind) ? (tintTexts[tint]?.descriptions ?? []) : [],
    gradients: (tint) => gradients[tint] ?? [],
    params,
    templates: (rarity) =>
      section<PerRarity<string>>('templates')?.[rarity] ?? [],
    conflicts: pooled.conflicts,
  };
}
