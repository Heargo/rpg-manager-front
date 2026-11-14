/** A kind id with the first noun that names it, when there is one. */
export interface KindKey {
  id: string;
  noun?: string;
}

/** The label of a kind in a choice list: `id — first noun`, or the id alone when it has no noun. */
export const kindLabel = (kind: KindKey): string =>
  kind.noun ? `${kind.id} — ${kind.noun}` : kind.id;

/** The options of a kind select, from the known kinds plus extra ids that have no noun to show. */
export function kindOptions(
  kinds: readonly KindKey[],
  extraIds: readonly string[] = [],
): { value: string; label: string }[] {
  const byId = new Map<string, KindKey>();
  for (const kind of kinds) byId.set(kind.id, kind);
  for (const id of extraIds) if (!byId.has(id)) byId.set(id, { id });
  return [...byId.values()].map((kind) => ({
    value: kind.id,
    label: kindLabel(kind),
  }));
}
