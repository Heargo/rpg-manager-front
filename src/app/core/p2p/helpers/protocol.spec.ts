import { createRequestTracker } from './correlation';
import { decodeEnvelope, encodeEnvelope } from './envelope';
import { PeerApiError, toWireError } from './peer-api-error';
import { assertValidRoute, isValidRoute } from './routes';

describe('routes', () => {
  it('accepts <feature>/<action> only', () => {
    expect(isValidRoute('character/spend-stat-point')).toBe(true);
    expect(isValidRoute('room/hello')).toBe(true);
    expect(isValidRoute('Room/hello')).toBe(false);
    expect(isValidRoute('room')).toBe(false);
    expect(isValidRoute('room/hello/extra')).toBe(false);
    expect(() => assertValidRoute('nope')).toThrow();
  });
});

describe('envelope', () => {
  it('round-trips every kind', () => {
    const envelopes = [
      { v: 1, kind: 'request', id: 'r1', route: 'room/hello', payload: { name: 'Ada' } },
      { v: 1, kind: 'response', id: 'r1', payload: null },
      { v: 1, kind: 'error', id: 'r1', code: 'rejected', message: 'No' },
      { v: 1, kind: 'publish', topic: 'room/state', seq: 3, payload: [1] },
    ] as const;
    for (const envelope of envelopes) expect(decodeEnvelope(encodeEnvelope(envelope))).toEqual(envelope);
  });

  it('drops malformed messages and other versions', () => {
    expect(decodeEnvelope('not json')).toBeNull();
    expect(decodeEnvelope('{"v":2,"kind":"response","id":"a","payload":1}')).toBeNull();
    expect(decodeEnvelope('{"v":1,"kind":"request","id":"a","route":"bad","payload":1}')).toBeNull();
    expect(decodeEnvelope('{"v":1,"kind":"request","id":"a","route":"room/hello"}')).toBeNull();
    expect(decodeEnvelope('{"v":1,"kind":"error","id":"a","code":"teapot","message":""}')).toBeNull();
    expect(decodeEnvelope('{"v":1,"kind":"publish","topic":"room/state","seq":1.5,"payload":1}')).toBeNull();
    expect(decodeEnvelope('{"v":1,"kind":"shout"}')).toBeNull();
  });
});

describe('toWireError', () => {
  it('keeps PeerApiError codes and hides other errors', () => {
    expect(toWireError(new PeerApiError('forbidden', 'GM only'))).toEqual({ code: 'forbidden', message: 'GM only' });
    expect(toWireError(new Error('secret stack'))).toEqual({ code: 'internal', message: 'Unexpected error on the host' });
  });
});

describe('request tracker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves and rejects by id', async () => {
    let n = 0;
    const tracker = createRequestTracker(() => `id${++n}`);
    const a = tracker.start<string>(1000);
    const b = tracker.start<string>(1000);

    expect(tracker.resolve(a.id, 'ok')).toBe(true);
    expect(tracker.reject(b.id, new PeerApiError('rejected'))).toBe(true);
    expect(tracker.resolve('unknown', 'x')).toBe(false);

    await expect(a.promise).resolves.toBe('ok');
    await expect(b.promise).rejects.toMatchObject({ code: 'rejected' });
    expect(tracker.size).toBe(0);
  });

  it('times out', async () => {
    const tracker = createRequestTracker();
    const { promise } = tracker.start(500);
    const result = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    vi.advanceTimersByTime(500);
    await result;
    expect(tracker.size).toBe(0);
  });

  it('rejects everything at once', async () => {
    const tracker = createRequestTracker();
    const all = [tracker.start(1000).promise, tracker.start(1000).promise];
    tracker.rejectAll(new PeerApiError('host-offline'));
    for (const promise of all) await expect(promise).rejects.toMatchObject({ code: 'host-offline' });
  });
});
