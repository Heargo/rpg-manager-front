import { GradientStop, PackTint } from './pack';
import { KindSchema } from './pack-kinds';

type Fields = Record<string, unknown>;

/** What one active pack gives a domain, in the world's pack order. `texts` is already filtered to the world's language. */
export interface PooledSource {
  packId: string;
  isBase: boolean;
  language?: string;
  kinds?: Record<string, Fields>;
  /** A domain's texts file: `kinds` per kind id, every other key (but `version`) a top-level section. */
  texts?: Fields;
  tints?: Record<string, PackTint>;
  params?: Record<string, string[]>;
}

/** A kind of the pooled tree: the schema's fields resolved up the chain, and the chain from the kind to its root. */
export type PooledKind = { chain: string[] } & Fields;

export interface PooledDomain {
  kinds: Record<string, PooledKind>;
  texts: Record<string, Fields>;
  sections: Record<string, unknown>;
  conflicts: string[];
}

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lists are concatenated, objects merged key by key, anything else keeps its first value. */
function merge(target: unknown, extra: unknown): unknown {
  if (Array.isArray(target) && Array.isArray(extra))
    return [...target, ...extra];
  if (isObject(target) && isObject(extra)) {
    const result: Fields = { ...target };
    for (const [key, value] of Object.entries(extra))
      result[key] = key in result ? merge(result[key], value) : value;
    return result;
  }
  return target;
}

/**
 * Pools one domain's kinds and texts across packs. Kinds: a declaration shared by packs is merged, a different one is
 * a conflict (Base first, then the pack order, wins); a kind that is in a cycle or does not reach a root the schema
 * accepts is dropped with its descendants. Texts: lists concatenated in pack order. Nothing here knows the domain:
 * the schema says which fields a kind carries and what a valid root is.
 */
export function poolDomain(
  sources: readonly PooledSource[],
  schema: KindSchema,
): PooledDomain {
  const conflicts: string[] = [];

  const declared = new Map<
    string,
    { packId: string; isBase: boolean; kind: Fields }[]
  >();
  for (const source of sources)
    for (const [id, kind] of Object.entries(source.kinds ?? {})) {
      const list = declared.get(id) ?? [];
      list.push({ packId: source.packId, isBase: source.isBase, kind });
      declared.set(id, list);
    }

  const fingerprint = (kind: Fields) =>
    JSON.stringify(
      ['parent', ...schema.fields].map((field) => kind[field] ?? null),
    );
  const winners = new Map<string, Fields>();
  for (const [id, list] of declared) {
    const winner = list.find((d) => d.isBase) ?? list[0];
    winners.set(id, winner.kind);
    const other = list.find(
      (d) => fingerprint(d.kind) !== fingerprint(winner.kind),
    );
    if (other)
      conflicts.push(
        `Kind "${id}" is declared differently by "${winner.packId}" and "${other.packId}"; "${winner.packId}" wins`,
      );
  }

  const memo = new Map<string, PooledKind | null>();
  /** Kinds already named in a conflict, so each dropped kind is reported once. */
  const reported = new Set<string>();
  const resolve = (id: string, visiting: string[]): PooledKind | null => {
    if (memo.has(id)) return memo.get(id) ?? null;
    const at = visiting.indexOf(id);
    if (at >= 0) {
      // Not memoised here: the kinds of the cycle are still being resolved up the stack, and each one is
      // memoised as null when the recursion unwinds through the `!above` branch below.
      for (const member of visiting.slice(at)) reported.add(member);
      conflicts.push(
        `Kinds ${visiting.slice(at).join(', ')} are in a cycle and are dropped`,
      );
      return null;
    }
    const kind = winners.get(id);
    if (!kind) return null;
    const parent = kind['parent'];
    let inherited: Fields = {};
    let chain: string[] = [];
    if (typeof parent === 'string') {
      const above = resolve(parent, [...visiting, id]);
      if (!above) {
        memo.set(id, null);
        if (!reported.has(id)) {
          reported.add(id);
          conflicts.push(
            `Kind "${id}" does not reach a root kind and is dropped`,
          );
        }
        return null;
      }
      const { chain: aboveChain, ...fields } = above;
      inherited = fields;
      chain = aboveChain;
    } else if (
      schema.check(kind, { id, hasParent: false, root: undefined }).length > 0
    ) {
      conflicts.push(`Kind "${id}" is not a valid root kind and is dropped`);
      memo.set(id, null);
      return null;
    }
    const own = Object.fromEntries(
      schema.fields
        .filter((field) => kind[field] !== undefined)
        .map((field) => [field, kind[field]]),
    );
    const resolved: PooledKind = {
      ...inherited,
      ...own,
      chain: [id, ...chain],
    };
    memo.set(id, resolved);
    return resolved;
  };

  const kinds: Record<string, PooledKind> = {};
  for (const id of winners.keys()) {
    const resolved = resolve(id, []);
    if (resolved) kinds[id] = resolved;
  }

  const texts: Record<string, Fields> = {};
  const sections: Record<string, unknown> = {};
  for (const source of sources) {
    for (const [id, own] of Object.entries(source.texts?.['kinds'] ?? {})) {
      if (!(id in kinds) || !isObject(own)) continue;
      texts[id] = merge(texts[id] ?? {}, own) as Fields;
    }
    for (const [name, section] of Object.entries(source.texts ?? {})) {
      if (name === 'version' || name === 'kinds') continue;
      sections[name] =
        name in sections ? merge(sections[name], section) : section;
    }
  }

  return { kinds, texts, sections, conflicts };
}

/** Every gradient of a tint id, in pack order, identical ones once. */
export function poolTints(
  sources: readonly PooledSource[],
): Record<string, GradientStop[][]> {
  const result: Record<string, GradientStop[][]> = {};
  for (const source of sources)
    for (const [id, tint] of Object.entries(source.tints ?? {})) {
      const list = (result[id] ??= []);
      const key = JSON.stringify(tint.gradient);
      if (!list.some((gradient) => JSON.stringify(gradient) === key))
        list.push(tint.gradient);
    }
  return result;
}

/** The lists of each param, concatenated in pack order. */
export function poolParams(
  sources: readonly PooledSource[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const source of sources)
    for (const [name, list] of Object.entries(source.params ?? {}))
      result[name] = [...(result[name] ?? []), ...list];
  return result;
}
