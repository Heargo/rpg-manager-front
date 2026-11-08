import { TransportError } from '../app/core/p2p/room-transport';

export interface MailboxMessage {
  seq: number;
  code: string;
}

type Side = 'host' | 'player';

/**
 * In-memory stand-in for `SignalMailboxService`, shared by the devices of a test (same shape as the real one:
 * `put(box, from, message)`, `get(box, from)` returns the other side's latest message or null, `delete(box)`).
 * The flags make it misbehave on demand.
 */
export class MemorySignalMailbox {
  private readonly closed = new Map<string, 'invite-used' | 'invite-expired'>();
  private readonly boxes = new Map<string, Partial<Record<Side, MailboxMessage>>>();
  readonly calls: { method: 'put' | 'get' | 'delete'; box: string; from?: Side }[] = [];

  /** Every call rejects, as when the function is unreachable or answers an error. */
  down = false;
  /** Only `get` rejects (the host cannot poll). */
  failGets = false;
  /** `put` never settles (the 5 s timeout has to cut it off). */
  hangPuts = false;
  /** The next player message is stored with a code the fake network refuses, so the first attempt fails. */
  tamperNextAnswer = false;

  async put(box: string, from: Side, message: MailboxMessage): Promise<void> {
    this.calls.push({ method: 'put', box, from });
    if (this.down) throw new Error('mailbox down');
    if (this.hangPuts) return new Promise<void>(() => undefined);
    let stored = message;
    if (from === 'player' && this.tamperNextAnswer) {
      this.tamperNextAnswer = false;
      stored = { ...message, code: 'fake-answer:wrong' };
    }
    const entry = this.boxes.get(box) ?? {};
    const current = entry[from];
    if (!current || current.seq <= stored.seq) entry[from] = stored;
    this.boxes.set(box, entry);
  }

  async get(box: string, from: Side): Promise<MailboxMessage | null> {
    this.calls.push({ method: 'get', box, from });
    if (this.down || this.failGets) throw new Error('mailbox down');
    const closed = this.closed.get(box);
    if (from === 'player' && closed) throw new TransportError(closed);
    return this.boxes.get(box)?.[from === 'host' ? 'player' : 'host'] ?? null;
  }

  async delete(box: string, reason?: 'used' | 'expired'): Promise<void> {
    this.calls.push({ method: 'delete', box });
    if (this.down) throw new Error('mailbox down');
    if (reason) this.closed.set(box, reason === 'used' ? 'invite-used' : 'invite-expired');
    this.boxes.delete(box);
  }

  /** What a side last wrote, for assertions. */
  peek(box: string, side: Side): MailboxMessage | undefined {
    return this.boxes.get(box)?.[side];
  }

  has(box: string): boolean {
    return this.boxes.has(box);
  }

  gets(side: Side): number {
    return this.calls.filter((call) => call.method === 'get' && call.from === side).length;
  }
}
