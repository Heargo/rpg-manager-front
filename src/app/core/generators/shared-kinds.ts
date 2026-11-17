import { SharedKindTexts } from './common-texts';
import { PooledSource } from '../packs/pooled-domain';
import { usedNames } from './phrase';
import { chance, pick } from './random';
import { RandomSource } from './random-source';
import { Adjective, Gender, Noun } from './word-list';

/** What `{root}` and `{root:adjective}` insert, per drawn root. */
export type SharedValues = Record<
  string,
  { word?: string; adjective?: string }
>;

/** The shared kinds of the active packs, pooled: draws one leaf per root and turns it into words. */
export interface SharedKinds {
  /** The root ids of the pooled tree. */
  roots: string[];
  /** One leaf per root, drawn from the leaves under the fitting kinds; nothing when no kind fits. */
  draw(source: RandomSource, fits: readonly string[]): Record<string, string>;
  /** The word and the adjective (agreed with the noun) of each drawn leaf; the descriptions that add up along their chains. */
  words(
    source: RandomSource,
    drawn: Record<string, string>,
    gender: Gender,
    plural: boolean,
  ): { values: SharedValues; descriptions: string[] };
  /** Whether a phrase uses a root that was not drawn, so it cannot be written. */
  undrawn(phrase: string, drawn: Record<string, string>): boolean;
}

const adjectiveText = (
  adjective: Adjective,
  gender: Gender,
  plural: boolean,
): string => {
  if (typeof adjective === 'string') return adjective;
  const singular = adjective[gender];
  if (!plural) return singular;
  const form = gender === 'f' ? adjective.fp : adjective.mp;
  return form ?? (/[sx]$/.test(singular) ? singular : `${singular}s`);
};

export function buildSharedKinds(
  sources: readonly PooledSource[],
): SharedKinds {
  const parents = new Map<string, string | undefined>();
  for (const source of sources)
    for (const [id, kind] of Object.entries(source.sharedKinds ?? {}))
      if (!parents.has(id)) parents.set(id, kind?.parent);
  const texts = (id: string) =>
    sources.flatMap((source) => {
      const found = source.sharedTexts?.kinds?.[id];
      return found ? [found] : [];
    });

  /** The chain from a kind up to its root; null when it is in a cycle or does not reach a declared root. */
  const chainOf = (id: string): string[] | null => {
    const chain: string[] = [];
    for (let at: string | undefined = id; at !== undefined;) {
      if (!parents.has(at) || chain.includes(at)) return null;
      chain.push(at);
      at = parents.get(at);
    }
    return chain;
  };
  const chains = new Map<string, string[]>();
  for (const id of parents.keys()) {
    const chain = chainOf(id);
    if (chain) chains.set(id, chain);
  }
  const parentIds = new Set(
    [...chains.values()].flatMap((chain) => chain.slice(1)),
  );
  const along = <T>(
    leaf: string,
    read: (found: SharedKindTexts) => T[] | undefined,
  ): T[] =>
    (chains.get(leaf) ?? []).flatMap((level) =>
      texts(level).flatMap((found) => read(found) ?? []),
    );
  const wordsOf = (leaf: string): Noun[] => along(leaf, (t) => t.words);
  const adjectivesOf = (leaf: string): Adjective[] =>
    along(leaf, (t) => t.adjectives);
  /** A leaf is drawable when its chain gives it a word or an adjective. */
  const drawable = (leaf: string): boolean =>
    wordsOf(leaf).length > 0 || adjectivesOf(leaf).length > 0;
  const leaves = [...chains.keys()].filter(
    (id) => !parentIds.has(id) && drawable(id),
  );
  const rootOf = (id: string): string => chains.get(id)!.at(-1)!;

  return {
    roots: [...chains.keys()].filter((id) => parents.get(id) === undefined),
    draw(source, fits) {
      const pools = new Map<string, string[]>();
      for (const leaf of leaves) {
        if (!fits.some((fit) => chains.get(leaf)!.includes(fit))) continue;
        const root = rootOf(leaf);
        pools.set(root, [...(pools.get(root) ?? []), leaf]);
      }
      return Object.fromEntries(
        [...pools].map(([root, list]) => [root, pick(source, list)]),
      );
    },
    words(source, drawn, gender, plural) {
      const values: SharedValues = {};
      const descriptions: string[] = [];
      for (const [root, leaf] of Object.entries(drawn)) {
        const words = wordsOf(leaf);
        const adjectives = adjectivesOf(leaf);
        values[root] = {
          ...(words.length > 0 ? { word: pick(source, words).text } : {}),
          ...(adjectives.length > 0
            ? {
                adjective: adjectiveText(
                  pick(source, adjectives),
                  gender,
                  plural,
                ),
              }
            : {}),
        };
        descriptions.push(...along(leaf, (t) => t.descriptions));
      }
      return { values, descriptions };
    },
    undrawn(phrase, drawn) {
      const roots = new Set(this.roots);
      return usedNames(phrase).some(
        (name) => roots.has(name) && !(name in drawn),
      );
    },
  };
}

/** The shared kinds of a drawn entry as the draft keeps them; nothing when none was drawn. */
export const keptShared = (
  drawn: Record<string, string>,
): { shared: Record<string, string> } | Record<string, never> =>
  Object.keys(drawn).length > 0 ? { shared: drawn } : {};

/** Where a description comes from: the shared kinds' lines one time in two, the kind's otherwise. */
export function descriptionPool(
  source: RandomSource,
  kindLines: string[],
  sharedLines: string[],
): string[] {
  return sharedLines.length > 0 &&
    (kindLines.length === 0 || chance(source, 1, 2))
    ? sharedLines
    : kindLines;
}
