import {
  CLASS_KIND_SCHEMA,
  ITEM_KIND_SCHEMA,
  KindSchema,
  NPC_KIND_SCHEMA,
  SKILL_KIND_SCHEMA,
} from '../packs/pack-kinds';
import { KindDomain, poolDomain, PooledSource } from '../packs/pooled-domain';
import { phraseRefs } from './phrase';
import { pick } from './random';
import { RandomSource } from './random-source';
import { Adjective, Gender, Noun } from './word-list';

/** What `{kind id}` and `{kind id:adjective}` insert, per placeholder. */
export type KindWordResolver = (
  id: string,
  form: 'word' | 'adjective',
) => string | undefined;

/** Where a phrase looks for a kind id: the entry's own domain first, then these, in this order. */
const DOMAIN_ORDER: readonly KindDomain[] = [
  'items',
  'npcs',
  'skills',
  'classes',
];
const SCHEMAS: Record<KindDomain, KindSchema> = {
  items: ITEM_KIND_SCHEMA,
  npcs: NPC_KIND_SCHEMA,
  skills: SKILL_KIND_SCHEMA,
  classes: CLASS_KIND_SCHEMA,
};

/** The kinds of every domain of the active packs, as phrases refer to them. */
export interface KindRefs {
  /** Whether a phrase can be written: each name it uses is a param, or a kind with a noun (an adjective: with an adjective). */
  usable(phrase: string, params: Record<string, readonly string[]>): boolean;
  /** One noun or adjective per placeholder id for one entry, drawn on first use; the adjective agrees with the entry's noun. */
  resolver(
    source: RandomSource,
    gender: Gender,
    plural: boolean,
  ): KindWordResolver;
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

/** An adjective as a kind lists it: the tint is dropped, a per-rarity map (items) is flattened. */
function adjectivesOf(raw: unknown): Adjective[] {
  if (Array.isArray(raw)) return raw.flatMap((word) => plain(word));
  if (typeof raw === 'object' && raw !== null)
    return Object.values(raw).flatMap((list) => adjectivesOf(list));
  return [];
}

function plain(word: unknown): Adjective[] {
  if (typeof word === 'string') return [word];
  if (typeof word !== 'object' || word === null) return [];
  const { text, ...rest } = word as Record<string, unknown>;
  delete rest['tint'];
  if (typeof text === 'string') return [text];
  return typeof rest['m'] === 'string' && typeof rest['f'] === 'string'
    ? [rest as unknown as Adjective]
    : [];
}

export function buildKindRefs(
  sources: readonly PooledSource[],
  own: KindDomain,
): KindRefs {
  const domains = [own, ...DOMAIN_ORDER.filter((d) => d !== own)].map(
    (domain) => {
      const views: PooledSource[] =
        domain === own
          ? [...sources]
          : sources.map((source) => ({
              packId: source.packId,
              isBase: source.isBase,
              kinds: source.otherDomains?.[domain]?.kinds,
              texts: source.otherDomains?.[domain]?.texts,
            }));
      // The kinds of another domain are only read for their words: their own rules are checked in their domain.
      return poolDomain(
        views,
        domain === own
          ? SCHEMAS[domain]
          : { fields: SCHEMAS[domain].fields, check: () => [] },
      );
    },
  );

  const cache = new Map<string, { nouns: Noun[]; adjectives: Adjective[] }>();
  /** The nouns and adjectives of a kind and its descendants, in the first domain that has some. */
  const wordsOf = (id: string): { nouns: Noun[]; adjectives: Adjective[] } => {
    const cached = cache.get(id);
    if (cached) return cached;
    let found = { nouns: [] as Noun[], adjectives: [] as Adjective[] };
    for (const pooled of domains) {
      const under = Object.keys(pooled.kinds).filter((kind) =>
        pooled.kinds[kind].chain.includes(id),
      );
      const nouns = under.flatMap(
        (kind) => (pooled.texts[kind]?.['nouns'] as Noun[] | undefined) ?? [],
      );
      const adjectives = under.flatMap((kind) =>
        adjectivesOf(pooled.texts[kind]?.['adjectives']),
      );
      if (nouns.length > 0 || adjectives.length > 0) {
        if (found.nouns.length === 0 && nouns.length > 0)
          found = { ...found, nouns };
        if (found.adjectives.length === 0 && adjectives.length > 0)
          found = { ...found, adjectives };
        if (found.nouns.length > 0 && found.adjectives.length > 0) break;
      }
    }
    cache.set(id, found);
    return found;
  };

  return {
    usable(phrase, params) {
      const { words, adjectives } = phraseRefs(phrase);
      return (
        words.every(
          (name) =>
            (params[name]?.length ?? 0) > 0 || wordsOf(name).nouns.length > 0,
        ) && adjectives.every((name) => wordsOf(name).adjectives.length > 0)
      );
    },
    resolver(source, gender, plural) {
      const drawn = new Map<string, string | undefined>();
      return (id, form) => {
        const key = `${id}:${form}`;
        if (!drawn.has(key)) {
          const words = wordsOf(id);
          drawn.set(
            key,
            form === 'word'
              ? words.nouns.length > 0
                ? pick(source, words.nouns).text
                : undefined
              : words.adjectives.length > 0
                ? adjectiveText(pick(source, words.adjectives), gender, plural)
                : undefined,
          );
        }
        return drawn.get(key);
      };
    },
  };
}
