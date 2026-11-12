import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { PeerApi } from '../../../core/p2p/peer-api.service';
import { createPeerNetwork, flush } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { KICK_DISCONNECT_DELAY_MS, RoomHostBusiness } from './room-host.business';
import { RoomBusiness } from './room.business';
import { RoomService } from '../services/room.service';
import { HostLockService } from '../services/host-lock.service';

function profile(playerId: string, name: string) {
  return { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } };
}

describe('RoomBusiness (host and two players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let gm: RoomBusiness;
  let ada: RoomBusiness;
  let bob: RoomBusiness;

  /** Full handshake through the room businesses, like the pages will do it. */
  async function join(player: RoomBusiness) {
    const invite = await gm.invite();
    const { answerCode, joined } = await player.join(`https://app.example/join#${invite.offerCode}`);
    await gm.accept(invite.id, answerCode);
    await joined;
    await flush();
  }

  const names = (room: RoomBusiness) =>
    room.$room()?.members.map((m) => `${m.name}${m.isHost ? '*' : ''}${m.online ? '' : ' (offline)'}`);

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork([RoomService, RoomHostBusiness, RoomBusiness]);
    devices = [net.device([profile('gm', 'Gm')]), net.device([profile('ada', 'Ada')]), net.device([profile('bob', 'Bob')])];
    [gm, ada, bob] = devices.map((device) => device.get(RoomBusiness));
    await gm.hostRoom('Friday table');
  });

  afterEach(() => devices.forEach((device) => device.destroy()));

  it('lets two players join and shows everyone the same room', async () => {
    expect(gm.$status()).toBe('hosting');
    expect(gm.$me()?.isHost).toBe(true);

    await join(ada);
    await join(bob);

    for (const room of [gm, ada, bob]) {
      expect(room.$room()?.name).toBe('Friday table');
      expect(names(room)).toEqual(['Gm*', 'Ada', 'Bob']);
    }
    expect(ada.$status()).toBe('connected');
    expect(ada.$me()).toEqual({ playerId: 'ada', name: 'Ada', isHost: false, online: true });
    expect(gm.$pendingInvites()).toEqual([]);
  });

  it('marks a player offline when they leave and gives the seat back on rejoin', async () => {
    await join(ada);
    await join(bob);

    ada.leave();
    await flush();
    expect(names(gm)).toEqual(['Gm*', 'Ada (offline)', 'Bob']);
    expect(names(bob)).toEqual(['Gm*', 'Ada (offline)', 'Bob']);
    expect(ada.$status()).toBe('idle');

    await join(ada);
    expect(names(gm)).toEqual(['Gm*', 'Ada', 'Bob']);
  });

  it('kicks a player: seat removed, their connection closed', async () => {
    await join(ada);
    await join(bob);

    gm.kick('ada');
    await flush();

    expect(names(gm)).toEqual(['Gm*', 'Bob']);
    expect(names(bob)).toEqual(['Gm*', 'Bob']);
    // Ada gets the room without her before the connection closes.
    expect(ada.$status()).toBe('removed');
    await new Promise((resolve) => setTimeout(resolve, KICK_DISCONNECT_DELAY_MS + 20));
    expect(devices[1].get(PeerApi).$hostOnline()).toBe(false);
    expect(ada.$status()).toBe('removed');
  });

  it('shows players the host went offline', async () => {
    await join(ada);

    gm.leave();
    await flush();

    expect(ada.$status()).toBe('host-offline');
    expect(gm.$status()).toBe('idle');
  });

  it('cancels a pending invite', async () => {
    const invite = await gm.invite();
    expect(gm.$pendingInvites().map((i) => i.id)).toEqual([invite.id]);

    gm.cancelInvite(invite.id);

    expect(gm.$pendingInvites()).toEqual([]);
    await expect(ada.join(invite.offerCode)).rejects.toThrow();
    expect(ada.$status()).toBe('idle');
  });

  it('refuses a second connection for a player already in the room, and bad hellos', async () => {
    await join(ada);
    const adaApi = devices[1].get(PeerApi);

    // Another device claiming Ada's seat while she's online.
    const impostor = net.device([profile('ada', 'Ada again'), RoomService, RoomHostBusiness, RoomBusiness]);
    const room = impostor.get(RoomBusiness);
    const invite = await gm.invite();
    const { answerCode, joined } = await room.join(invite.offerCode);
    await gm.accept(invite.id, answerCode);
    await expect(joined).rejects.toMatchObject({ code: 'rejected' });

    await expect(adaApi.request('room/hello', { playerId: 'x', name: ' ' })).rejects.toMatchObject({ code: 'invalid' });
    impostor.destroy();
  });

  describe('after a host reload', () => {
    /** Destroys the host's device and starts a fresh one on the same storage, like reloading the page. */
    async function reloadHost(): Promise<RoomBusiness> {
      devices[0].destroy();
      devices[0] = net.device([profile('gm', 'Gm')]);
      gm = devices[0].get(RoomBusiness);
      await gm.whenReady();
      await flush();
      return gm;
    }

    it('reopens the room with the same seats, players offline', async () => {
      await join(ada);
      await join(bob);
      await new Promise((resolve) => setTimeout(resolve, 20)); // let the last save land

      await reloadHost();

      expect(gm.$status()).toBe('hosting');
      expect(gm.$restored()).toBe(true);
      expect(names(gm)).toEqual(['Gm*', 'Ada (offline)', 'Bob (offline)']);
    });

    it('re-invites a player to their seat', async () => {
      await join(ada);
      const roomId = gm.$room()!.id;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await reloadHost();
      ada.leave();

      const invite = await gm.invite('ada');
      expect(invite.forPlayer).toEqual({ playerId: 'ada', name: 'Ada' });
      const { answerCode, joined } = await ada.join(invite.offerCode);
      await gm.accept(invite.id, answerCode);
      await joined;
      await flush();

      expect(names(gm)).toEqual(['Gm*', 'Ada']);
      expect(ada.$room()?.id).toBe(roomId);
    });

    it("doesn't reopen a closed room, nor one hosted by another profile", async () => {
      await join(ada);
      gm.leave();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect((await reloadHost()).$status()).toBe('idle');

      await gm.hostRoom('Mine');
      await new Promise((resolve) => setTimeout(resolve, 20));
      devices[0].destroy();
      devices[0] = net.device([profile('someone-else', 'Other')]);
      const other = devices[0].get(RoomBusiness);
      await other.whenReady();
      expect(other.$status()).toBe('idle');
    });
  });

  it("refuses to host or reopen a room while another tab holds the host lock", async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const busyLock = { provide: HostLockService, useValue: { acquire: async () => false, releaseLock: () => undefined } };

    // Reopening: the saved room stays closed in this tab.
    const otherTab = net.device([profile('gm', 'Gm'), busyLock]);
    const other = otherTab.get(RoomBusiness);
    await other.whenReady();
    expect(other.$status()).toBe('idle');

    // Hosting a new one is refused.
    expect(await other.hostRoom('Second room')).toBe(false);
    expect(other.$status()).toBe('idle');
    otherTab.destroy();
  });
});
