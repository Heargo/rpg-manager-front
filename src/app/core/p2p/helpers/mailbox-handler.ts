import { isBoxId } from './invite-link';

/**
 * Logic of the signalling mailbox (docs/adr/0004-signal-mailbox.md), free of Netlify and Angular: the function
 * file wires Netlify Blobs to it, the tests wire a Map.
 */

export const MAILBOX_TTL_MS = 30 * 60_000;
const MAX_CODE_LENGTH = 2000;

export type MailboxSide = 'host' | 'player';

export interface MailboxMessage {
  seq: number;
  code: string;
}

/** What a box stores: one key per side (so the two sides never overwrite each other) and one key for its age. */
interface MailboxMeta {
  updatedAt: number;
  /** Set when the host closed the box: its answer was used, or the invite was cancelled. */
  gone?: MailboxGoneReason;
}

/** Why a box is closed: the invite was used (answer consumed) or it expired (cancelled, or past its TTL). */
export type MailboxGoneReason = 'used' | 'expired';

/** What a player is told when the box behind an invite link is closed. */
export const MAILBOX_USED_STATUS = 409;
export const MAILBOX_EXPIRED_STATUS = 410;
const goneStatus = (reason: MailboxGoneReason) =>
  reason === 'used' ? MAILBOX_USED_STATUS : MAILBOX_EXPIRED_STATUS;

const sideKey = (box: string, side: MailboxSide) => `${box}/${side}`;

export interface MailboxStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export interface MailboxRequest {
  method: string;
  box: string;
  from: string | undefined;
  /** Parsed JSON body. */
  body: unknown;
  /** On DELETE: why the box is closed. Without it the box is simply removed. */
  reason?: string;
}

export interface MailboxResponse {
  status: number;
  body?: MailboxMessage;
}

/** A store that can also list its keys, for the sweep. */
export interface MailboxSweepStore extends MailboxStore {
  list(): Promise<string[]>;
}

async function removeBox(store: MailboxStore, box: string): Promise<void> {
  await Promise.all([
    store.delete(box),
    store.delete(sideKey(box, 'host')),
    store.delete(sideKey(box, 'player')),
  ]);
}

function isStale(meta: MailboxMeta, now: number): boolean {
  return now - meta.updatedAt > MAILBOX_TTL_MS;
}

/** Deletes every box older than the TTL (and orphaned side keys): run by the scheduled function. */
export async function sweepMailbox(
  store: MailboxSweepStore,
  now: number,
): Promise<number> {
  const boxes = new Set((await store.list()).map((key) => key.split('/')[0]));
  let removed = 0;
  for (const box of boxes) {
    const meta = (await store.get(box)) as MailboxMeta | null | undefined;
    if (!meta || isStale(meta, now)) {
      await removeBox(store, box);
      removed++;
    }
  }
  return removed;
}

export function createMailboxHandler(store: MailboxStore, now: () => number) {
  /** The box's marker; a box older than the TTL is deleted and reported stale. */
  async function liveMeta(box: string): Promise<{ live: boolean; stale: boolean; meta?: MailboxMeta }> {
    const meta = (await store.get(box)) as MailboxMeta | null | undefined;
    if (!meta) return { live: false, stale: false };
    if (isStale(meta, now())) {
      await removeBox(store, box);
      return { live: false, stale: true };
    }
    return { live: true, stale: false, meta };
  }

  return async ({
    method,
    box,
    from,
    body,
    reason,
  }: MailboxRequest): Promise<MailboxResponse> => {
    if (method !== 'PUT' && method !== 'GET' && method !== 'DELETE')
      return { status: 405 };
    if (!isBoxId(box)) return { status: 400 };

    if (method === 'DELETE') {
      await removeBox(store, box);
      // A closed box leaves a marker (until the TTL) so a player opening the link later learns why.
      if (reason === 'used' || reason === 'expired')
        await store.set(box, { updatedAt: now(), gone: reason } satisfies MailboxMeta);
      return { status: 204 };
    }

    if (from !== 'host' && from !== 'player') return { status: 400 };
    const side: MailboxSide = from;

    if (method === 'GET') {
      const { live, stale, meta } = await liveMeta(box);
      if (side === 'player') {
        if (meta?.gone) return { status: goneStatus(meta.gone) };
        if (stale) return { status: MAILBOX_EXPIRED_STATUS };
      }
      if (!live || meta?.gone) return { status: 204 };
      const message = (await store.get(
        sideKey(box, side === 'host' ? 'player' : 'host'),
      )) as MailboxMessage | null;
      return message ? { status: 200, body: message } : { status: 204 };
    }

    const message = parseMessage(body);
    if (!message) return { status: 400 };
    const { live, meta } = await liveMeta(box);
    // A closed box takes no answer; the host writing again (a new offer) reopens it.
    if (side === 'player' && meta?.gone) return { status: goneStatus(meta.gone) };
    const current = live
      ? ((await store.get(sideKey(box, side))) as MailboxMessage | null)
      : null;
    // The age first, then the message: a sweep never sees a message without its box being young.
    await store.set(box, { updatedAt: now() } satisfies MailboxMeta);
    if (!current || message.seq >= current.seq)
      await store.set(sideKey(box, side), message);
    return { status: 204 };
  };
}

function parseMessage(body: unknown): MailboxMessage | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const { seq, code } = body as Record<string, unknown>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0)
    return undefined;
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH)
    return undefined;
  return { seq, code };
}
