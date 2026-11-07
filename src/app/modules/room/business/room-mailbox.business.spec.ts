import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { WakeLockService } from '../../../core/services/wake-lock.service';
import { MemorySignalMailbox } from '../../../../testing/memory-signal-mailbox';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { SignalMailboxService } from '../services/signal-mailbox.service';
import { RoomHostBusiness } from './room-host.business';
import { RoomBusiness } from './room.business';
import { RoomService } from '../services/room.service';

const POLL = 2000;

function profile(playerId: string, name: string) {
  return { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Lets time pass in poll-sized steps so every timer, message and microtask in between runs. */
async function elapse(ms: number): Promise<void> {
  for (let left = ms; left > 0; left -= POLL) {
    await vi.advanceTimersByTimeAsync(Math.min(POLL, left));
    TestBed.tick();
  }
  await vi.advanceTimersByTimeAsync(0);
}

describe('RoomBusiness signalling mailbox', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let mailbox: MemorySignalMailbox;
  let gm: RoomBusiness;
  let ada: RoomBusiness;

  function newDevice(playerId: string, name: string, box: MemorySignalMailbox = mailbox): RoomBusiness {
    const device = net.device([
      profile(playerId, name),
      { provide: WakeLockService, useValue: { request: async () => undefined, release: () => undefined } },
      { provide: SignalMailboxService, useValue: box },
      RoomService,
      RoomHostBusiness,
      RoomBusiness,
    ]);
    devices.push(device);
    return device.get(RoomBusiness);
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    setVisibility('visible');
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork([RoomService, RoomHostBusiness, RoomBusiness]);
    mailbox = new MemorySignalMailbox();
    devices = [];
    gm = newDevice('gm', 'Gm');
    ada = newDevice('ada', 'Ada');
    await gm.hostRoom('Friday table');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
    devices.forEach((device) => device.destroy());
  });

  describe('link-only join', () => {
    it('gives each invite a box id and puts it in the link after the offer code', async () => {
      const invite = await gm.invite();

      expect(invite.boxId).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(gm.inviteLink(invite.offerCode, invite.boxId)).toBe(
        `${location.origin}/join#${invite.offerCode}~${invite.boxId}`,
      );
      expect(gm.inviteLink(invite.offerCode)).toBe(`${location.origin}/join#${invite.offerCode}`);
    });

    it('connects two devices when nobody pastes anything', async () => {
      const invite = await gm.invite();

      await ada.join(invite.offerCode, invite.boxId);
      await elapse(3 * POLL);

      expect(ada.$joinState()).toBe('connected');
      expect(ada.$joinMode()).toBe('mailbox');
      expect(ada.$me()?.playerId).toBe('ada');
      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
      expect(gm.$pendingInvites()).toEqual([]);
    });

    it('puts the player\'s answer in the box as seq 0 and waits on the page', async () => {
      const invite = await gm.invite();

      const { answerCode } = await ada.join(invite.offerCode, invite.boxId);

      expect(mailbox.peek(invite.boxId!, 'player')).toEqual({ seq: 0, code: answerCode });
      expect(ada.$joinState()).toBe('waiting');
      expect(ada.$joinMode()).toBe('mailbox');
    });

    it('deletes the box once the player is connected', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, invite.boxId);

      await elapse(3 * POLL);

      expect(ada.$joinState()).toBe('connected');
      expect(mailbox.has(invite.boxId!)).toBe(false);
    });

    it('polls the box every 2 seconds for each pending invite', async () => {
      const invite = await gm.invite();
      mailbox.calls.length = 0;

      await elapse(5 * POLL);

      const polls = mailbox.calls.filter((call) => call.method === 'get' && call.from === 'host' && call.box === invite.boxId);
      expect(polls.length).toBeGreaterThanOrEqual(4);
      expect(polls.length).toBeLessThanOrEqual(6);
    });

    it('pauses the host\'s polling while the page is hidden and resumes on return', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, invite.boxId);

      setVisibility('hidden');
      mailbox.calls.length = 0;
      await elapse(10 * POLL);
      expect(mailbox.gets('host')).toBe(0);
      expect(ada.$joinState()).toBe('waiting');

      setVisibility('visible');
      await elapse(3 * POLL);
      expect(ada.$joinState()).toBe('connected');
    });

    it('stops polling for an invite that was cancelled', async () => {
      const invite = await gm.invite();
      gm.cancelInvite(invite.id);
      mailbox.calls.length = 0;

      await elapse(5 * POLL);

      expect(mailbox.gets('host')).toBe(0);
    });
  });

  describe('fallback to the manual code', () => {
    it('shows the answer code when the mailbox is down, and the host\'s paste still works', async () => {
      mailbox.down = true;
      const invite = await gm.invite();

      const { answerCode, joined } = await ada.join(invite.offerCode, invite.boxId);

      expect(ada.$joinMode()).toBe('manual');
      expect(ada.$joinState()).toBe('waiting');
      await gm.accept(invite.id, answerCode);
      await joined;
      await elapse(0);
      expect(ada.$joinState()).toBe('connected');
      expect(gm.$pendingInvites()).toEqual([]);
    });

    it('gives up on a put that takes longer than 5 seconds', async () => {
      mailbox.hangPuts = true;
      const invite = await gm.invite();

      const joining = ada.join(invite.offerCode, invite.boxId);
      await vi.advanceTimersByTimeAsync(4999);
      expect(ada.$joinMode()).not.toBe('manual');
      await vi.advanceTimersByTimeAsync(2);
      const { answerCode, joined } = await joining;

      expect(ada.$joinMode()).toBe('manual');
      await gm.accept(invite.id, answerCode);
      await joined;
    });

    it('is manual mode when the link has no box id, and never calls the mailbox', async () => {
      const invite = await gm.invite();
      mailbox.calls.length = 0;

      const { answerCode, joined } = await ada.join(invite.offerCode);

      expect(ada.$joinMode()).toBe('manual');
      await elapse(3 * POLL);
      expect(mailbox.calls.filter((call) => call.from === 'player')).toEqual([]);
      await gm.accept(invite.id, answerCode);
      await joined;
      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
    });

    it('flags an invite as mailbox-down after 3 failed polls in a row, not before', async () => {
      mailbox.failGets = true;
      const invite = await gm.invite();
      const flag = () => gm.$pendingInvites().find((i) => i.id === invite.id)?.mailboxDown;

      await elapse(2 * POLL);
      expect(flag()).toBeFalsy();
      await elapse(2 * POLL);
      expect(flag()).toBe(true);
    });

    it('keeps the host\'s paste working on an invite whose mailbox is down', async () => {
      mailbox.failGets = true;
      const invite = await gm.invite();
      const { answerCode, joined } = await ada.join(invite.offerCode, invite.boxId);
      await elapse(4 * POLL);

      await gm.accept(invite.id, answerCode);
      await joined;

      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
    });
  });

  describe('retry through the box', () => {
    it('makes a new offer for the same seat and box when the connection fails, and ends connected after the player was away', async () => {
      mailbox.tamperNextAnswer = true;
      const invite = await gm.invite('ada');
      await ada.join(invite.offerCode, invite.boxId);

      // The host reads the answer, the connection fails, and a new offer goes into the same box.
      await elapse(2 * POLL);
      expect(mailbox.peek(invite.boxId!, 'host')?.seq).toBe(1);
      const pending = gm.$pendingInvites();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).not.toBe(invite.id);
      expect(pending[0].boxId).toBe(invite.boxId);
      expect(pending[0].forPlayer?.playerId).toBe('ada');
      expect(ada.$joinState()).not.toBe('connected');

      // Nobody polls while the page is hidden; 10 minutes later the player comes back.
      setVisibility('hidden');
      await elapse(10 * 60_000);
      expect(ada.$joinState()).not.toBe('connected');
      setVisibility('visible');
      await elapse(4 * POLL);

      expect(ada.$joinState()).toBe('connected');
      expect(gm.$pendingInvites()).toEqual([]);
      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
      expect(mailbox.has(invite.boxId!)).toBe(false);
    });

    it('keeps the same box id when an invite is retried by hand, with the new offer as seq + 1', async () => {
      const invite = await gm.invite();

      const fresh = await gm.retryInvite(invite.id);

      expect(fresh.boxId).toBe(invite.boxId);
      expect(mailbox.peek(invite.boxId!, 'host')).toEqual({ seq: 1, code: fresh.offerCode });
    });

    it('answers the newest host offer when the player reloads the page with the link\'s stale offer', async () => {
      const invite = await gm.invite();
      const fresh = await gm.retryInvite(invite.id);
      expect(fresh.offerCode).not.toBe(invite.offerCode);

      const reloaded = newDevice('ada', 'Ada');
      await reloaded.join(invite.offerCode, invite.boxId);
      await elapse(3 * POLL);

      expect(reloaded.$joinState()).toBe('connected');
      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
    });
  });

  describe('retry loop robustness', () => {
    it('re-puts a replacement offer whose put failed at the next host poll', async () => {
      const invite = await gm.invite();
      mailbox.down = true;
      const fresh = await gm.retryInvite(invite.id);
      expect(mailbox.peek(invite.boxId!, 'host')).toBeUndefined();

      mailbox.down = false;
      await elapse(POLL);

      expect(mailbox.peek(invite.boxId!, 'host')).toEqual({ seq: 1, code: fresh.offerCode });
    });

    it('puts the invite back to waiting when retryInvite fails, and retries at the next poll', async () => {
      mailbox.tamperNextAnswer = true;
      const invite = await gm.invite();
      await ada.join(invite.offerCode, invite.boxId);
      vi.spyOn(devices[0].get(RoomService), 'createInvite').mockRejectedValueOnce(new Error('no invite'));

      await elapse(POLL);
      expect(gm.$pendingInvites().map((i) => [i.id, i.state])).toEqual([[invite.id, 'waiting']]);

      await elapse(POLL);
      const pending = gm.$pendingInvites();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).not.toBe(invite.id);
      expect(pending[0].state).toBe('waiting');
      expect(mailbox.peek(invite.boxId!, 'host')?.seq).toBe(1);
    });
  });

  describe('box cleanup', () => {
    it('deletes the box when the invite is cancelled', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, invite.boxId);
      expect(mailbox.has(invite.boxId!)).toBe(true);

      gm.cancelInvite(invite.id);
      await elapse(0);

      expect(mailbox.has(invite.boxId!)).toBe(false);
    });

    it('deletes the boxes of pending invites when the host leaves', async () => {
      const first = await gm.invite();
      const second = await gm.invite();
      await ada.join(first.offerCode, first.boxId);
      expect(mailbox.has(first.boxId!)).toBe(true);

      gm.leave();
      await elapse(0);

      expect(mailbox.has(first.boxId!)).toBe(false);
      expect(mailbox.calls.filter((c) => c.method === 'delete').map((c) => c.box)).toEqual(
        expect.arrayContaining([first.boxId, second.boxId]),
      );
    });
  });

  describe('permanent errors', () => {
    it('rejects joined in mailbox mode when the host refuses the player, instead of waiting forever', async () => {
      const first = await gm.invite();
      await ada.join(first.offerCode, first.boxId);
      await elapse(3 * POLL);
      expect(ada.$joinState()).toBe('connected');

      const impostor = newDevice('ada', 'Ada again');
      const invite = await gm.invite();
      const { joined } = await impostor.join(invite.offerCode, invite.boxId);
      const rejection = expect(joined).rejects.toMatchObject({ code: 'rejected' });
      await elapse(3 * POLL);

      await rejection;
      expect(impostor.$joinState()).toBe('failed');
    });
  });

  describe('player polling', () => {
    /** The host never reads this box, so the player stays waiting and keeps polling. */
    const UNWATCHED_BOX = 'CCCCCCCCCCCCCCCCCCCCCC';

    it('polls the box every 5 seconds while waiting', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, UNWATCHED_BOX);
      mailbox.calls.length = 0;

      await elapse(20_000);

      expect(mailbox.gets('player')).toBeGreaterThanOrEqual(3);
      expect(mailbox.gets('player')).toBeLessThanOrEqual(5);
    });

    it('fails the join with the specific reason when the host closes the box while the player waits', async () => {
      const invite = await gm.invite();
      const { joined } = await ada.join(invite.offerCode, UNWATCHED_BOX);
      const outcome = joined.catch((e: unknown) => e);

      await mailbox.delete(UNWATCHED_BOX, 'expired');
      await elapse(6000);

      expect(await outcome).toMatchObject({ reason: 'invite-expired' });
      expect(ada.$joinState()).toBe('failed');
    });

    it('pauses while the page is hidden and resumes on return', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, UNWATCHED_BOX);

      setVisibility('hidden');
      mailbox.calls.length = 0;
      await elapse(30_000);
      expect(mailbox.gets('player')).toBe(0);

      setVisibility('visible');
      await elapse(10_000);
      expect(mailbox.gets('player')).toBeGreaterThanOrEqual(1);
    });
  });
});
