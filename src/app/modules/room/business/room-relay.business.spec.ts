import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { TransportError } from '../../../core/p2p/room-transport';
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

async function elapse(ms: number): Promise<void> {
  for (let left = ms; left > 0; left -= POLL) {
    await vi.advanceTimersByTimeAsync(Math.min(POLL, left));
    TestBed.tick();
  }
  await vi.advanceTimersByTimeAsync(0);
}

describe('RoomBusiness direct first, relay on retry', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let mailbox: MemorySignalMailbox;
  let gm: RoomBusiness;
  let ada: RoomBusiness;
  let createInvite: ReturnType<typeof vi.spyOn>;

  function newDevice(playerId: string, name: string): RoomBusiness {
    const device = net.device([
      profile(playerId, name),
      { provide: WakeLockService, useValue: { request: async () => undefined, release: () => undefined } },
      { provide: SignalMailboxService, useValue: mailbox },
      RoomService,
      RoomHostBusiness,
      RoomBusiness,
    ]);
    devices.push(device);
    return device.get(RoomBusiness);
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork([RoomService, RoomHostBusiness, RoomBusiness]);
    mailbox = new MemorySignalMailbox();
    devices = [];
    gm = newDevice('gm', 'Gm');
    ada = newDevice('ada', 'Ada');
    await gm.hostRoom('Friday table');
    createInvite = vi.spyOn(devices[0].get(RoomService), 'createInvite');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    devices.forEach((device) => device.destroy());
  });

  const relayOption = (call: number) => (createInvite.mock.calls[call] as [{ relay?: boolean }?])[0]?.relay;

  it('makes the first invite direct', async () => {
    const invite = await gm.invite();

    expect(invite.relay).toBeFalsy();
    expect(relayOption(0)).toBeFalsy();
  });

  describe('mailbox mode', () => {
    it('silently makes the retry after a failed direct attempt a relay invite for the same seat and box', async () => {
      mailbox.tamperNextAnswer = true;
      const invite = await gm.invite('ada');
      await ada.join(invite.offerCode, invite.boxId);

      await elapse(2 * POLL);

      expect(createInvite).toHaveBeenCalledTimes(2);
      expect(relayOption(0)).toBeFalsy();
      expect(relayOption(1)).toBe(true);
      const pending = gm.$pendingInvites();
      expect(pending).toHaveLength(1);
      expect(pending[0].relay).toBe(true);
      expect(pending[0].boxId).toBe(invite.boxId);
      expect(pending[0].forPlayer?.playerId).toBe('ada');
      expect(mailbox.peek(invite.boxId!, 'host')?.seq).toBe(1);
    });

    it('ends connected through the relay invite', async () => {
      mailbox.tamperNextAnswer = true;
      const invite = await gm.invite('ada');
      await ada.join(invite.offerCode, invite.boxId);

      await elapse(6 * POLL);

      expect(ada.$joinState()).toBe('connected');
      expect(gm.$room()?.members.map((m) => m.playerId)).toEqual(['gm', 'ada']);
    });
  });

  describe('manual mode', () => {
    it('leaves a failed invite failed (no silent retry) so the host can offer the relay', async () => {
      const invite = await gm.invite();

      await expect(gm.accept(invite.id, 'fake-answer:wrong')).rejects.toBeDefined();

      const pending = gm.$pendingInvites();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(invite.id);
      expect(pending[0].state).toBe('failed');
      expect(createInvite).toHaveBeenCalledTimes(1);
    });

    it('makes a relay invite for the same seat and box when the host picks "Try through the relay"', async () => {
      const invite = await gm.invite('ada');
      await expect(gm.accept(invite.id, 'fake-answer:wrong')).rejects.toBeDefined();

      const fresh = await gm.retryInvite(invite.id, { relay: true });

      expect(relayOption(1)).toBe(true);
      expect(fresh.relay).toBe(true);
      expect(fresh.boxId).toBe(invite.boxId);
      expect(fresh.forPlayer?.playerId).toBe('ada');
      expect(gm.$pendingInvites().map((i) => i.id)).toEqual([fresh.id]);
    });
  });

  describe('relay unavailable', () => {
    it('rejects the relay invite and keeps the failed invite instead of making one that cannot work', async () => {
      const invite = await gm.invite();
      await expect(gm.accept(invite.id, 'fake-answer:wrong')).rejects.toBeDefined();
      createInvite.mockRejectedValueOnce(new TransportError('relay-unavailable' as never));

      await expect(gm.retryInvite(invite.id, { relay: true })).rejects.toMatchObject({
        reason: 'relay-unavailable',
      });

      const pending = gm.$pendingInvites();
      expect(pending.map((i) => i.id)).toEqual([invite.id]);
      expect(pending[0].state).toBe('failed');
    });
  });
});
