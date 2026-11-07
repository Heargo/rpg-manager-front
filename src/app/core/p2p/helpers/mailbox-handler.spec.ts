import { createMailboxHandler, MailboxStore, MailboxSweepStore, sweepMailbox } from './mailbox-handler';

const BOX = 'AAAAAAAAAAAAAAAAAAAAAA';
const OTHER_BOX = 'BBBBBBBBBBBBBBBBBBBBBB';
const MINUTE = 60_000;

describe('mailbox handler', () => {
  let data: Map<string, unknown>;
  let store: MailboxSweepStore;
  let now: number;
  let handle: ReturnType<typeof createMailboxHandler>;

  beforeEach(() => {
    data = new Map();
    store = {
      get: async (key: string) => data.get(key) as never,
      set: async (key: string, value: unknown) => void data.set(key, value as never),
      delete: async (key: string) => void data.delete(key),
      list: async () => [...data.keys()],
    };
    now = 1_000_000;
    handle = createMailboxHandler(store, () => now);
  });

  const put = (box: string, from: string, body: unknown) => handle({ method: 'PUT', box, from, body });
  const get = (box: string, from: string) => handle({ method: 'GET', box, from, body: undefined });

  describe('put and get', () => {
    it('hands each side the other side\'s latest message', async () => {
      expect((await put(BOX, 'host', { seq: 0, code: 'offer-0' })).status).toBe(204);
      expect((await put(BOX, 'player', { seq: 0, code: 'answer-0' })).status).toBe(204);

      expect(await get(BOX, 'player')).toEqual({ status: 200, body: { seq: 0, code: 'offer-0' } });
      expect(await get(BOX, 'host')).toEqual({ status: 200, body: { seq: 0, code: 'answer-0' } });
    });

    it('answers 204 when the other side has not written yet, or the box is unknown', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });

      expect((await get(BOX, 'host')).status).toBe(204);
      expect((await get(OTHER_BOX, 'host')).status).toBe(204);
    });

    it('keeps boxes apart', async () => {
      await put(BOX, 'host', { seq: 0, code: 'one' });
      await put(OTHER_BOX, 'host', { seq: 0, code: 'two' });

      expect((await get(OTHER_BOX, 'player')).body).toEqual({ seq: 0, code: 'two' });
    });

    it('replaces a message with a newer seq', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      await put(BOX, 'host', { seq: 1, code: 'offer-1' });

      expect((await get(BOX, 'player')).body).toEqual({ seq: 1, code: 'offer-1' });
    });

    it('ignores a message with an older seq', async () => {
      await put(BOX, 'host', { seq: 3, code: 'offer-3' });
      const late = await put(BOX, 'host', { seq: 2, code: 'offer-2' });

      expect(late.status).toBe(204);
      expect((await get(BOX, 'player')).body).toEqual({ seq: 3, code: 'offer-3' });
    });
  });

  describe('delete', () => {
    it('removes the whole box', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      await put(BOX, 'player', { seq: 0, code: 'answer-0' });

      expect((await handle({ method: 'DELETE', box: BOX, from: undefined, body: undefined })).status).toBe(204);

      expect((await get(BOX, 'player')).status).toBe(204);
      expect((await get(BOX, 'host')).status).toBe(204);
    });

    it('answers 204 for a box that does not exist', async () => {
      expect((await handle({ method: 'DELETE', box: BOX, from: undefined, body: undefined })).status).toBe(204);
    });
  });

  describe('expiry', () => {
    it('still serves a box that is 30 minutes old', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      now += 30 * MINUTE;

      expect((await get(BOX, 'player')).status).toBe(200);
    });

    it('treats a box older than 30 minutes as empty and deletes it when touched', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      now += 30 * MINUTE + 1;

      expect((await get(BOX, 'player')).status).toBe(204);
      expect(data.size).toBe(0);
    });

    it('counts the age from the last write', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      now += 20 * MINUTE;
      await put(BOX, 'player', { seq: 0, code: 'answer-0' });
      now += 20 * MINUTE;

      expect((await get(BOX, 'player')).body).toEqual({ seq: 0, code: 'offer-0' });
    });

    it('starts a fresh box when writing to an expired one', async () => {
      await put(BOX, 'host', { seq: 5, code: 'old-offer' });
      await put(BOX, 'player', { seq: 5, code: 'old-answer' });
      now += 31 * MINUTE;

      await put(BOX, 'host', { seq: 0, code: 'new-offer' });

      expect((await get(BOX, 'player')).body).toEqual({ seq: 0, code: 'new-offer' });
      expect((await get(BOX, 'host')).status).toBe(204);
    });
  });

  describe('validation', () => {
    it.each([
      ['a box id that is too short', 'abc'],
      ['a box id with other characters', 'AAAAAAAAAAAAAAAAAAAA+/'],
      ['a box id that is too long', 'AAAAAAAAAAAAAAAAAAAAAAA'],
      ['an empty box id', ''],
    ])('answers 400 for %s', async (_name, box) => {
      expect((await put(box, 'host', { seq: 0, code: 'x' })).status).toBe(400);
      expect((await get(box, 'host')).status).toBe(400);
      expect((await handle({ method: 'DELETE', box, from: undefined, body: undefined })).status).toBe(400);
    });

    it('answers 400 for a side that is neither host nor player', async () => {
      expect((await put(BOX, 'admin', { seq: 0, code: 'x' })).status).toBe(400);
      expect((await get(BOX, 'admin')).status).toBe(400);
    });

    it.each([
      ['a negative seq', { seq: -1, code: 'x' }],
      ['a fractional seq', { seq: 1.5, code: 'x' }],
      ['a seq that is not a number', { seq: '1', code: 'x' }],
      ['a missing seq', { code: 'x' }],
      ['a code that is not a string', { seq: 0, code: 42 }],
      ['a missing code', { seq: 0 }],
      ['a code over 2,000 characters', { seq: 0, code: 'x'.repeat(2001) }],
      ['no body', undefined],
      ['a body that is not an object', 'hello'],
    ])('answers 400 for %s', async (_name, body) => {
      expect((await put(BOX, 'host', body)).status).toBe(400);
    });

    it('accepts seq 0 and a code of exactly 2,000 characters', async () => {
      expect((await put(BOX, 'host', { seq: 0, code: 'x'.repeat(2000) })).status).toBe(204);
    });

    it('stores nothing for a rejected message', async () => {
      await put(BOX, 'host', { seq: -1, code: 'x' });

      expect(data.size).toBe(0);
    });

    it('answers 405 for any other method', async () => {
      expect((await handle({ method: 'PATCH', box: BOX, from: 'host', body: undefined })).status).toBe(405);
    });
  });

  describe('storage layout', () => {
    it('keeps each side in its own key, so the two sides never overwrite each other', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      await put(BOX, 'player', { seq: 0, code: 'answer-0' });
      await put(BOX, 'host', { seq: 1, code: 'offer-1' });
      await put(BOX, 'player', { seq: 1, code: 'answer-1' });

      expect((await get(BOX, 'player')).body).toEqual({ seq: 1, code: 'offer-1' });
      expect((await get(BOX, 'host')).body).toEqual({ seq: 1, code: 'answer-1' });
      expect(data.has(`${BOX}/host`)).toBe(true);
      expect(data.has(`${BOX}/player`)).toBe(true);
    });

    it('shares one age between the sides: a write by either side keeps the whole box alive', async () => {
      await put(BOX, 'host', { seq: 0, code: 'offer-0' });
      now += 20 * MINUTE;
      await put(BOX, 'player', { seq: 0, code: 'answer-0' });
      now += 20 * MINUTE;

      expect((await get(BOX, 'player')).body).toEqual({ seq: 0, code: 'offer-0' });
      expect((await get(BOX, 'host')).body).toEqual({ seq: 0, code: 'answer-0' });
    });
  });

  describe('sweep', () => {
    it('removes a box older than 30 minutes with all its keys, and keeps a live one', async () => {
      await put(BOX, 'host', { seq: 0, code: 'old-offer' });
      await put(BOX, 'player', { seq: 0, code: 'old-answer' });
      now += 20 * MINUTE;
      await put(OTHER_BOX, 'host', { seq: 0, code: 'live-offer' });
      now += 11 * MINUTE;

      const removed = await sweepMailbox(store, now);

      expect(removed).toBe(1);
      expect([...data.keys()].filter((key) => key.startsWith(BOX))).toEqual([]);
      expect((await get(OTHER_BOX, 'player')).body).toEqual({ seq: 0, code: 'live-offer' });
    });

    it('removes side keys left without an age key', async () => {
      data.set(`${BOX}/host`, { seq: 0, code: 'orphan' });

      expect(await sweepMailbox(store, now)).toBe(1);

      expect(data.size).toBe(0);
    });

    it('does nothing on an empty store', async () => {
      expect(await sweepMailbox(store, now)).toBe(0);
    });
  });
});
