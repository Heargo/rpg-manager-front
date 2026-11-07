import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { WakeLockService } from '../../../core/services/wake-lock.service';
import { MemorySignalMailbox } from '../../../../testing/memory-signal-mailbox';
import { createPeerNetwork, flush } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { SignalMailboxService } from '../services/signal-mailbox.service';
import { RoomHostBusiness } from './room-host.business';
import { RoomBusiness } from './room.business';
import { RoomService } from '../services/room.service';

function profile(playerId: string, name: string) {
  return { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } };
}

function leavePagePrompt(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('RoomBusiness offline and failure states', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let mailbox: MemorySignalMailbox;
  let gm: RoomBusiness;
  let ada: RoomBusiness;
  let bob: RoomBusiness;

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
    bob = newDevice('bob', 'Bob');
    await gm.hostRoom('Friday table');
  });

  afterEach(() => devices.forEach((device) => device.destroy()));

  describe('stale invite links', () => {
    it('tells a player opening an already used invite that it was already used', async () => {
      const invite = await gm.invite();
      const { answerCode } = await ada.join(invite.offerCode);
      await gm.accept(invite.id, answerCode);
      await flush();

      const error = await bob.join(invite.offerCode).catch((e: unknown) => e);

      expect(error).toMatchObject({ reason: 'invite-used' });
      expect(bob.describeError(error)).toBe('This invite was already used. Ask the host for a new one.');
    });

    it('tells a player opening an already used link with a box the same', async () => {
      const invite = await gm.invite();
      await ada.join(invite.offerCode, invite.boxId);
      for (let i = 0; i < 30 && ada.$joinState() !== 'connected'; i++) await new Promise((r) => setTimeout(r, 100));
      expect(ada.$joinState()).toBe('connected');

      const error = await bob.join(invite.offerCode, invite.boxId).catch((e: unknown) => e);

      expect(error).toMatchObject({ reason: 'invite-used' });
    }, 10000);

    it('tells a player opening an invite the host cancelled that it expired', async () => {
      const invite = await gm.invite();
      gm.cancelInvite(invite.id);

      const error = await ada.join(invite.offerCode).catch((e: unknown) => e);

      expect(error).toMatchObject({ reason: 'invite-expired' });
      expect(ada.describeError(error)).toBe('This invite has expired. Ask the host for a new one.');
    });
  });

  describe('leave-page prompt', () => {
    it('asks before the page is reloaded or closed while an invite is pending', async () => {
      await gm.invite();

      expect(leavePagePrompt().defaultPrevented).toBe(true);
    });

    it('is disarmed once the last pending invite is cancelled', async () => {
      const first = await gm.invite();
      const second = await gm.invite();

      gm.cancelInvite(first.id);
      expect(leavePagePrompt().defaultPrevented).toBe(true);

      gm.cancelInvite(second.id);
      expect(leavePagePrompt().defaultPrevented).toBe(false);
    });
  });
});
