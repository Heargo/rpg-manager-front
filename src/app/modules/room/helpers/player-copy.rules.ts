import { Character } from '../../world/models/world';

/** Fields that change with every save and say nothing about the player's data. */
const BOOKKEEPING: (keyof Character)[] = ['rev', 'updatedAt'];

function withoutBookkeeping(record: Character): Record<string, unknown> {
  const content: Record<string, unknown> = { ...record };
  BOOKKEEPING.forEach((key) => delete content[key]);
  return content;
}

/** JSON with object keys sorted at every level, so equal records give equal text whatever their key order. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item ?? null)).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** SHA-256 (hex) of a player record's content, independent of key order; `rev` and `updatedAt` are not part of it. */
export async function hashPlayerRecord(record: Character): Promise<string> {
  const bytes = new TextEncoder().encode(
    stableStringify(withoutBookkeeping(record)),
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** The fields whose values differ between two versions (deep comparison), sorted; `rev` and `updatedAt` are ignored. */
export function differingFields(a: Character, b: Character): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys]
    .filter((key) => !BOOKKEEPING.includes(key as keyof Character))
    .filter(
      (key) =>
        stableStringify((a as unknown as Record<string, unknown>)[key]) !==
        stableStringify((b as unknown as Record<string, unknown>)[key]),
    )
    .sort();
}

/** The chosen version, as the next rev: past the highest rev of the two. */
export function resolvePick(
  host: Character,
  player: Character,
  pick: 'host' | 'player',
  now: number,
): Character {
  const chosen = pick === 'host' ? host : player;
  return { ...chosen, rev: Math.max(host.rev, player.rev) + 1, updatedAt: now };
}
