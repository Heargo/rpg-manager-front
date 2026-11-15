import { PooledDomain } from '../packs/pooled-domain';

/** The domain-free lookups on a pooled kind tree, shared by the vocabularies: a domain only says which texts to read. */
export interface KindLookups {
  /** The texts the pick finds at the nearest level of the kind's chain that has some; none when no level has. */
  nearest<T, K>(id: string, pick: (texts: K) => T[] | undefined): T[];
  /** The texts the pick finds at every level of the kind's chain, nearest level first. */
  alongChain<T, K>(id: string, pick: (texts: K) => T[] | undefined): T[];
  /** The kind ids that pass `accept`, in declaration order. */
  kindIds(accept: (id: string) => boolean): string[];
}

export function kindLookups(pooled: PooledDomain): KindLookups {
  const texts = <K>(level: string): K => (pooled.texts[level] ?? {}) as K;
  return {
    nearest(id, pick) {
      for (const level of pooled.kinds[id]?.chain ?? []) {
        const found = pick(texts(level));
        if (found && found.length > 0) return found;
      }
      return [];
    },
    alongChain: (id, pick) =>
      (pooled.kinds[id]?.chain ?? []).flatMap(
        (level) => pick(texts(level)) ?? [],
      ),
    kindIds: (accept) => Object.keys(pooled.kinds).filter(accept),
  };
}
