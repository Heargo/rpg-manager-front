import { CLASS_KIND_SCHEMA } from '../packs/pack-kinds';
import { poolDomain, PooledSource, poolParams } from '../packs/pooled-domain';
import { ClassKindTexts } from './class-word-list';
import { kindLookups } from './kind-lookups';
import { buildKindRefs, KindRefs } from './cross-domain-kinds';
import { Adjective, Noun } from './word-list';

export interface ClassKindInfo {
  id: string;
  /** The skill kinds the class favours, from the nearest level that has some; none when no level has. */
  skills: string[];
  chain: string[];
}

/** The classes of the world's active packs, pooled: the kind tree, the words and the lookups the generator needs. */
export interface ClassVocabulary {
  kind(id: string): ClassKindInfo | undefined;
  nouns(id: string): Noun[];
  descriptions(id: string): string[];
  names(id: string): string[];
  /** The language's adjectives and those of every level of the kind's chain. */
  adjectives(id: string): Adjective[];
  /** The language's suffixes and those of every level of the kind's chain. */
  suffixes(id: string): string[];
  /** The kinds with a noun on their chain. */
  drawable(): string[];
  templates(): string[];
  /** The kinds of every domain that a phrase can refer to. */
  refs: KindRefs;
  params: Record<string, string[]>;
  conflicts: string[];
}

export function buildClassVocabulary(sources: PooledSource[]): ClassVocabulary {
  const pooled = poolDomain(sources, CLASS_KIND_SCHEMA);
  const params = poolParams(sources);
  const refs = buildKindRefs(sources, 'classes');
  const lookups = kindLookups(pooled);
  const section = <T>(name: string): T[] =>
    (pooled.sections[name] as T[] | undefined) ?? [];

  const nouns = (id: string): Noun[] =>
    lookups.nearest(id, (t: ClassKindTexts) => t.nouns);

  return {
    kind(id) {
      const kind = pooled.kinds[id];
      if (!kind) return undefined;
      return {
        id,
        skills: (kind['skills'] as string[] | undefined) ?? [],
        chain: kind.chain,
      };
    },
    nouns,
    descriptions: (id) =>
      lookups.nearest(id, (t: ClassKindTexts) => t.descriptions),
    names: (id) => lookups.nearest(id, (t: ClassKindTexts) => t.names),
    adjectives: (id) => [
      ...section<Adjective>('adjectives'),
      ...lookups.alongChain(id, (t: ClassKindTexts) => t.adjectives),
    ],
    suffixes: (id) => [
      ...section<string>('suffixes'),
      ...lookups.alongChain(id, (t: ClassKindTexts) => t.suffixes),
    ],
    drawable: () => lookups.kindIds((id) => nouns(id).length > 0),
    templates: () => section<string>('templates'),
    refs,
    params,
    conflicts: pooled.conflicts,
  };
}
