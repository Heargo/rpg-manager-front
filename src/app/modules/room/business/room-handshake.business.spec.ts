import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { WakeLockService } from '../../../core/services/wake-lock.service';
import { createPeerNetwork, flush } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { RoomHostBusiness } from './room-host.business';
import { RoomBusiness } from './room.business';
import { RoomService } from '../services/room.service';

function profile(playerId: string, name: string) {
  return { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('RoomBusiness handshake states (phone-friendly join)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let gm: RoomBusiness;
  let ada: RoomBusiness;
  let wakeLock: { request: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    setVisibility('visible');
    wakeLock = { request: vi.fn(async () => undefined), release: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork([RoomService, RoomHostBusiness, RoomBusiness]);
    const wake = { provide: WakeLockService, useValue: wakeLock };
    devices = [net.device([profile('gm', 'Gm'), wake]), net.device([profile('ada', 'Ada'), wake])];
    [gm, ada] = devices.map((device) => device.get(RoomBusiness));
    await gm.hostRoom('Friday table');
  });

  afterEach(() => {
    setVisibility('visible');
    devices.forEach((device) => device.destroy());
  });

  describe('player join state', () => {
    it('goes preparing → waiting → connected and holds the wake lock while waiting', async () => {
      const invite = await gm.invite();
      expect(ada.$joinState()).toBe('idle');

      const pending = ada.join(invite.offerCode);
      expect(ada.$joinState()).toBe('preparing');
      const { answerCode, joined } = await pending;
      expect(ada.$joinState()).toBe('waiting');
      expect(wakeLock.request).toHaveBeenCalledTimes(1);
      expect(wakeLock.release).not.toHaveBeenCalled();

      await gm.accept(invite.id, answerCode);
      await joined;
      await flush();

      expect(ada.$joinState()).toBe('connected');
      expect(ada.$failedWhileAway()).toBe(false);
      expect(wakeLock.release).toHaveBeenCalled();
    });

    it('keeps waiting when the page is hidden and shown again', async () => {
      const invite = await gm.invite();
      const { answerCode, joined } = await ada.join(invite.offerCode);

      setVisibility('hidden');
      await flush();
      expect(ada.$joinState()).toBe('waiting');
      setVisibility('visible');
      await flush();
      expect(ada.$joinState()).toBe('waiting');

      await gm.accept(invite.id, answerCode);
      await joined;
      expect(ada.$joinState()).toBe('connected');
    });

    it('fails with failedWhileAway false when the page is visible', async () => {
      const impostor = await failedJoin('visible');
      expect(impostor.$joinState()).toBe('failed');
      expect(impostor.$failedWhileAway()).toBe(false);
    });

    it('fails with failedWhileAway true when the page was hidden at the time, and releases the wake lock', async () => {
      const impostor = await failedJoin('hidden');
      expect(impostor.$joinState()).toBe('failed');
      expect(impostor.$failedWhileAway()).toBe(true);
      expect(wakeLock.release).toHaveBeenCalled();
    });

    it('releases the wake lock when the player leaves while waiting', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode);

      ada.leave();

      expect(wakeLock.release).toHaveBeenCalled();
      expect(ada.$joinState()).toBe('idle');
    });

    /** Ada's seat is taken by a connected Ada, so the host refuses the second device: the join fails after accept. */
    async function failedJoin(visibility: 'visible' | 'hidden'): Promise<RoomBusiness> {
      const first = await gm.invite();
      const firstJoin = await ada.join(first.offerCode);
      await gm.accept(first.id, firstJoin.answerCode);
      await firstJoin.joined;

      const impostorDevice = net.device([profile('ada', 'Ada again'), { provide: WakeLockService, useValue: wakeLock }, RoomService, RoomHostBusiness, RoomBusiness]);
      devices.push(impostorDevice);
      const impostor = impostorDevice.get(RoomBusiness);
      const invite = await gm.invite();
      const { answerCode, joined } = await impostor.join(invite.offerCode);
      setVisibility(visibility);
      await gm.accept(invite.id, answerCode);
      await expect(joined).rejects.toMatchObject({ code: 'rejected' });
      await flush();
      return impostor;
    }
  });

  describe('host invite state', () => {
    it('goes waiting → connecting while an answer is being accepted, then the invite is dropped', async () => {
      const invite = await gm.invite();
      expect(gm.$pendingInvites()[0].state).toBe('waiting');
      const { answerCode, joined } = await ada.join(invite.offerCode);

      const accepting = gm.accept(invite.id, answerCode);
      expect(gm.$pendingInvites()[0].state).toBe('connecting');
      await accepting;
      await joined;

      expect(gm.$pendingInvites()).toEqual([]);
    });

    it('keeps the invite as failed when the accept fails', async () => {
      const invite = await gm.invite();

      await gm.accept(invite.id, 'fake-answer:wrong').catch(() => undefined);

      expect(gm.$pendingInvites().map((i) => [i.id, i.state])).toEqual([[invite.id, 'failed']]);
    });

    it('retryInvite replaces a failed invite with a fresh one for the same seat', async () => {
      const first = await gm.invite();
      const joining = await ada.join(first.offerCode);
      await gm.accept(first.id, joining.answerCode);
      await joining.joined;
      ada.leave();
      await flush();

      const reinvite = await gm.invite('ada');
      await gm.accept(reinvite.id, 'fake-answer:wrong').catch(() => undefined);
      expect(gm.$pendingInvites().map((i) => i.state)).toEqual(['failed']);

      const fresh = await gm.retryInvite(reinvite.id);

      expect(fresh.id).not.toBe(reinvite.id);
      expect(fresh.forPlayer).toEqual({ playerId: 'ada', name: 'Ada' });
      expect(gm.$pendingInvites().map((i) => [i.id, i.state])).toEqual([[fresh.id, 'waiting']]);

      const again = await ada.join(fresh.offerCode);
      await gm.accept(fresh.id, again.answerCode);
      await again.joined;
      expect(ada.$joinState()).toBe('connected');
    });
  });
});
