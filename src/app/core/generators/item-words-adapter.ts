import { ITEM_RARITIES, ITEM_TYPES, ItemRarity } from '../models/item';
import { ItemKindDef } from '../packs/pack';
import { resolveItemKind } from '../packs/pack-kinds';
import { expandPhrase } from './phrase';
import { seededRandomSource } from './random-source';
import { BASE_KEYS, BaseKey, ItemWordList, WordList } from './word-list';

/** Each description and suffix is expanded this many times, to keep some variety until the generator expands them. */
const EXPANSIONS = 6;

/**
 * Interim adapter (removed when the generator works on kinds): the v1-shaped list the item generator draws from.
 * Nouns are grouped under the slot (or type) their kind resolves to, descriptions per type along the kind chains,
 * untinted and tinted adjectives and suffixes are merged. Phrases are expanded a few times with a fixed seed so
 * params and variants never reach the item as raw text.
 */
export function toWordList(
  file: ItemWordList,
  own: Record<string, ItemKindDef>,
  fallback: Record<string, ItemKindDef>,
  params: Record<string, string[]>,
): WordList {
  const bases = Object.fromEntries(
    BASE_KEYS.map((key) => [key, []]),
  ) as unknown as WordList['bases'];
  const descriptions = Object.fromEntries(
    ITEM_TYPES.map((type) => [type, [] as string[]]),
  ) as unknown as WordList['descriptions'];
  const source = seededRandomSource('word-list');
  const expand = (phrase: string): string[] => {
    const out = new Set<string>();
    for (let i = 0; i < EXPANSIONS; i++) {
      const text = expandPhrase(source, phrase, { params });
      if (text) out.add(text);
    }
    return [...out];
  };
  const add = (list: string[], phrases: readonly string[] | undefined) => {
    for (const phrase of phrases ?? [])
      for (const text of expand(phrase))
        if (!list.includes(text)) list.push(text);
  };

  for (const [kind, texts] of Object.entries(file.kinds ?? {})) {
    const resolved = resolveItemKind(kind, own, fallback);
    if (!resolved) continue;
    const key: string =
      resolved.slot !== 'none' ? resolved.slot : resolved.type;
    if ((BASE_KEYS as readonly string[]).includes(key))
      bases[key as BaseKey].push(...(texts.nouns ?? []));
    // The kind's own descriptions and those of every level above it.
    for (let id: string | undefined = kind; id;) {
      add(descriptions[resolved.type], file.kinds?.[id]?.descriptions);
      id = (own[id] ?? fallback[id])?.parent;
    }
  }

  const rarity = <T>(
    untinted: Partial<Record<ItemRarity, T[]>> | undefined,
    tinted: (Partial<Record<ItemRarity, T[]>> | undefined)[],
  ): Record<ItemRarity, T[]> =>
    Object.fromEntries(
      ITEM_RARITIES.map((r) => [
        r,
        [untinted, ...tinted].flatMap((list) => list?.[r] ?? []),
      ]),
    ) as Record<ItemRarity, T[]>;
  const tints = Object.values(file.tints ?? {});
  const suffixes = rarity(
    file.suffixes,
    tints.map((t) => t.suffixes),
  );
  for (const r of ITEM_RARITIES)
    suffixes[r] = suffixes[r].flatMap((phrase) => expand(phrase));
  const templates = rarity(file.templates, []);
  for (const r of ITEM_RARITIES)
    if (templates[r].length === 0) templates[r] = ['{base}'];
  for (const type of ITEM_TYPES)
    if (descriptions[type].length === 0) descriptions[type] = [''];

  return {
    version: 1,
    templates,
    bases,
    adjectives: rarity(
      file.adjectives,
      tints.map((t) => t.adjectives),
    ),
    suffixes,
    descriptions,
  };
}
