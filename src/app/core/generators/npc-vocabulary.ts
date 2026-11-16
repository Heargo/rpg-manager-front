import { NpcRole } from '../../modules/npc/models/npc';
import { NPC_KIND_SCHEMA } from '../packs/pack-kinds';
import { poolDomain, PooledSource, poolParams } from '../packs/pooled-domain';
import { kindLookups } from './kind-lookups';
import { GivenName, NpcKindTexts } from './npc-word-list';
import { Adjective, Noun } from './word-list';

export interface NpcKindInfo {
  id: string;
  roles: NpcRole[];
  /** A person gets a given name; a creature is named from its kind's nouns. */
  person: boolean;
  chain: string[];
}

/** The NPCs of the world's active packs, pooled: the kind tree, the words and the lookups the generator needs. */
export interface NpcVocabulary {
  kind(id: string): NpcKindInfo | undefined;
  nouns(id: string): Noun[];
  descriptions(id: string): string[];
  names(id: string): string[];
  /** The adjectives of every level of the kind's chain. */
  adjectives(id: string): Adjective[];
  /** Persons always, creatures when a noun is on their chain. */
  drawable(): string[];
  given(): GivenName[];
  epithets(): Adjective[];
  templates(): string[];
  params: Record<string, string[]>;
  conflicts: string[];
}

export function buildNpcVocabulary(sources: PooledSource[]): NpcVocabulary {
  const pooled = poolDomain(sources, NPC_KIND_SCHEMA);
  const params = poolParams(sources);
  const lookups = kindLookups(pooled);
  const section = <T>(name: string): T[] =>
    (pooled.sections[name] as T[] | undefined) ?? [];

  const info = (id: string): NpcKindInfo | undefined => {
    const kind = pooled.kinds[id];
    if (!kind) return undefined;
    return {
      id,
      roles: kind['roles'] as NpcRole[],
      person: (kind['person'] as boolean | undefined) ?? true,
      chain: kind.chain,
    };
  };
  const nouns = (id: string): Noun[] =>
    lookups.nearest(id, (t: NpcKindTexts) => t.nouns);

  return {
    kind: info,
    nouns,
    descriptions: (id) =>
      lookups.nearest(id, (t: NpcKindTexts) => t.descriptions),
    names: (id) => lookups.nearest(id, (t: NpcKindTexts) => t.names),
    adjectives: (id) =>
      lookups.alongChain(id, (t: NpcKindTexts) => t.adjectives),
    drawable: () =>
      lookups.kindIds((id) => info(id)!.person || nouns(id).length > 0),
    given: () => section<GivenName>('given'),
    epithets: () => section<Adjective>('epithets'),
    templates: () => section<string>('templates'),
    params,
    conflicts: pooled.conflicts,
  };
}
