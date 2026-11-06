import { PeerApiError } from './peer-api-error';

export interface RequestTracker {
  /** Registers a request; the promise settles with its response, error or timeout. */
  start<T>(timeoutMs: number): { id: string; promise: Promise<T> };
  resolve(id: string, payload: unknown): boolean;
  reject(id: string, error: Error): boolean;
  /** Fails every pending request (e.g. the host went offline). */
  rejectAll(error: Error): void;
  readonly size: number;
}

/** Matches responses to requests by id, with a timeout per request. */
export function createRequestTracker(newId: () => string = () => crypto.randomUUID()): RequestTracker {
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  const settle = (id: string) => {
    const entry = pending.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      pending.delete(id);
    }
    return entry;
  };

  return {
    start<T>(timeoutMs: number) {
      const id = newId();
      const promise = new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(id);
          reject(new PeerApiError('timeout', 'The host did not answer in time'));
        }, timeoutMs);
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      });
      return { id, promise };
    },
    resolve(id, payload) {
      const entry = settle(id);
      entry?.resolve(payload);
      return !!entry;
    },
    reject(id, error) {
      const entry = settle(id);
      entry?.reject(error);
      return !!entry;
    },
    rejectAll(error) {
      for (const id of [...pending.keys()]) settle(id)?.reject(error);
    },
    get size() {
      return pending.size;
    },
  };
}
