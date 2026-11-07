import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PeerApi } from '../../../core/p2p/peer-api.service';
import { gameDevice, settle } from '../../../../testing/game-device';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { OfflineFeaturesBusiness } from '../../world/business/offline-features.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { CharacterService } from '../services/character.service';
import { PlayerCopyService } from '../services/player-copy.service';
import { PlayerCopyStorageService } from '../services/player-copy-storage.service';
import { CharacterBusiness } from './character.business';
import { OfflineBusiness } from './offline.business';
import { PlayerCopyHostBusiness } from './player-copy-host.business';
import { PlayerCopyBusiness } from './player-copy.business';

type Device = ReturnType<typeof gameDevice> & {
  copy: PlayerCopyBusiness;
  hostCopy: PlayerCopyHostBusiness;
  offline: OfflineBusiness;
  features: OfflineFeaturesBusiness;
};

/** The player-copy and offline businesses, one instance per device, built on top of the device's own services. */
function withOffline(device: ReturnType<typeof gameDevice>): Device {
  const child = createEnvironmentInjector(
    [PlayerCopyService, PlayerCopyStorageService, PlayerCopyBusiness, PlayerCopyHostBusiness, OfflineBusiness, OfflineFeaturesBusiness],
    device.injector,
  );
  return {
    ...device,
    copy: child.get(PlayerCopyBusiness),
    hostCopy: child.get(PlayerCopyHostBusiness),
    offline: child.get(OfflineBusiness),
    features: child.get(OfflineFeaturesBusiness),
  };
}

const SPEND = 'character/spend-stat-point';

describe('host offline mode (host + player over the fake network)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: Device;
  let ada: Device;
  let roomId: string;
  let attributeId: string;

  const rooms = (d: Device) => d.injector.get(RoomBusiness);
  const characters = (d: Device) => d.injector.get(CharacterBusiness);
  /** The host's record, notes included (the broadcast list has none). */
  const hostRecord = () => gm.injector.get(WorldSessionBusiness).$world()!.characters.find((c) => c.playerId === 'ada')!;
  const hostCharacter = () => characters(gm).$characters()!.find((c) => c.playerId === 'ada')!;
  const spend = () => ({ kind: 'spend-stat-point' as const, attributeId });
  const queuedSpend = () => ({ route: SPEND, payload: { characterId: hostCharacter().id, attributeId } });

  async function join(player: Device) {
    const invite = await rooms(gm).invite();
    const { answerCode, joined } = await rooms(player).join(invite.offerCode);
    await rooms(gm).accept(invite.id, answerCode);
    await joined;
    await settle();
  }

  /** The host's channel to Ada closes (the host stays up). */
  async function hostGoesOffline() {
    const api = gm.injector.get(PeerApi);
    api.disconnect(api.$peers()[0]);
    await settle();
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }));
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = withOffline(gameDevice(net, 'gm', 'Gm'));
    ada = withOffline(gameDevice(net, 'ada', 'Ada'));
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));

    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10 }],
      startingStatPoints: 3,
      startingMoney: 20,
    });
    await rooms(gm).hostRoom('Eldoria', world.id);
    await settle();
    await join(ada);
    await characters(ada).create('Ada');
    await settle();
    roomId = rooms(ada).$room()!.id;
    attributeId = characters(ada).$world()!.attributes[0].id;
  });

  afterEach(() => {
    [gm, ada].forEach((d) => d.injector.destroy());
    vi.unstubAllGlobals();
  });

  describe('offline features (lobby toggles)', () => {
    it('the host changes them and every player receives them; the world keeps them', async () => {
      expect(ada.offline.$features()).toEqual({ dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false });

      await gm.features.set({ dice: false, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: true });
      await settle();

      const expected = { dice: false, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: true };
      expect(ada.injector.get(WorldInfoBusiness).$info()!.offlineFeatures).toEqual(expected);
      expect(ada.offline.$features()).toEqual(expected);
      const saved = await gm.injector.get(WorldLibraryBusiness).get(rooms(gm).$room()!.worldId!);
      expect(saved!.offlineFeatures).toEqual(expected);
    });
  });

  describe('online', () => {
    it('player notes are saved by the host with the record', async () => {
      await ada.offline.saveNotes('The key is under the mat');
      await settle();

      expect(hostRecord().notes).toBe('The key is under the mat');
      expect(ada.offline.$myCharacter()!.notes).toBe('The key is under the mat');
      expect(characters(ada).$myCharacter()!.notes).toBeUndefined();
      expect(ada.offline.$queue()).toEqual([]);
    });

    it('every action is allowed', () => {
      expect(ada.offline.canAct('spend-stat-point')).toBe(true);
      expect(ada.offline.$offline()).toBe(false);
    });
  });

  describe('when the host goes offline', () => {
    it("the player's status is host-offline", async () => {
      await hostGoesOffline();
      expect(rooms(ada).$status()).toBe('host-offline');
      expect(ada.offline.$offline()).toBe(true);
    });

    it('an action whose feature is off is refused: the local copy and the queue stay as they were', async () => {
      await hostGoesOffline();

      expect(ada.offline.canAct('spend-stat-point')).toBe(false);
      await expect(ada.offline.act(hostCharacter().id, spend())).rejects.toMatchObject({ code: 'forbidden' });
      expect(ada.offline.$myCharacter()).toMatchObject({ statPoints: 3 });
      expect(ada.offline.$queue()).toEqual([]);
    });

    it('an allowed action changes the local copy (kept per room) and is queued', async () => {
      await gm.features.set({ dice: true, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: false });
      await settle();
      await hostGoesOffline();

      expect(ada.offline.canAct('spend-stat-point')).toBe(true);
      await ada.offline.act(hostCharacter().id, spend());

      expect(ada.offline.$myCharacter()).toMatchObject({ statPoints: 2, attributes: [{ attributeId, points: 1, current: 11 }] });
      expect(ada.offline.$queue()).toEqual([queuedSpend()]);
      expect(await ada.copy.savedCopy(roomId)).toMatchObject({ statPoints: 2 });
      expect(hostCharacter().statPoints).toBe(3);
    });

    it('a notes edit is applied locally and queued when notes are allowed', async () => {
      await hostGoesOffline();

      await ada.offline.saveNotes('Met a stranger');

      expect(ada.offline.$myCharacter()!.notes).toBe('Met a stranger');
      expect(ada.offline.$queue()).toEqual([
        { route: 'character/save-notes', payload: { characterId: hostCharacter().id, notes: 'Met a stranger' } },
      ]);
      expect(ada.offline.canEditNotes()).toBe(true);
    });

    it('a notes edit is refused when notes are not allowed offline', async () => {
      await gm.features.set({ dice: true, notes: false, spendStatPoints: false, equip: false, useConsumables: false, sell: false });
      await settle();
      await hostGoesOffline();

      expect(ada.offline.canEditNotes()).toBe(false);
      await expect(ada.offline.saveNotes('nope')).rejects.toMatchObject({ code: 'forbidden' });
      expect(ada.offline.$queue()).toEqual([]);
    });
  });

  describe('on reconnect', () => {
    async function spendOfflineThenRejoin() {
      await gm.features.set({ dice: true, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: false });
      await settle();
      await hostGoesOffline();
      await ada.offline.act(hostCharacter().id, spend());
      await join(ada);
    }

    it('"Pick a save" carries the queued actions', async () => {
      await spendOfflineThenRejoin();

      const conflicts = gm.hostCopy.$conflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].queued).toEqual([queuedSpend()]);
      expect(conflicts[0].host.statPoints).toBe(3);
      expect(conflicts[0].player.statPoints).toBe(2);
      expect(ada.copy.$readOnly()).toBe(true);
    });

    it("keeping the host's version drops the queue", async () => {
      await spendOfflineThenRejoin();

      await gm.hostCopy.keepHost('ada');
      await settle();

      expect(hostCharacter().statPoints).toBe(3);
      expect(ada.offline.$queue()).toEqual([]);
      expect(characters(ada).$myCharacter()).toEqual(hostCharacter());
      expect(await ada.copy.savedCopy(roomId)).toEqual(hostCharacter());
    });

    it("using the player's version accepts the queued actions", async () => {
      await spendOfflineThenRejoin();

      await gm.hostCopy.usePlayer('ada');
      await settle();

      expect(hostCharacter()).toMatchObject({ statPoints: 2, attributes: [{ attributeId, points: 1, current: 11 }] });
      expect(ada.offline.$queue()).toEqual([]);
      expect(characters(ada).$myCharacter()).toEqual(hostCharacter());
    });

    it("a queued notes edit comes back with the player's version", async () => {
      await hostGoesOffline();
      await ada.offline.saveNotes('Met a stranger');
      await join(ada);

      expect(gm.hostCopy.$conflicts()[0].queued).toEqual([
        { route: 'character/save-notes', payload: { characterId: hostCharacter().id, notes: 'Met a stranger' } },
      ]);
      await gm.hostCopy.usePlayer('ada');
      await settle();
      expect(hostRecord().notes).toBe('Met a stranger');
    });
  });

  describe('notes are for their owner only', () => {
    it("a second player's characters carry no notes, and neither does the broadcast to the host", async () => {
      await ada.offline.saveNotes('The key is under the mat');
      await settle();
      const bob = gameDevice(net, 'bob', 'Bob');
      bob.injector.get(GameSessionBusiness);
      await join(bob as unknown as Device);
      await settle();

      expect(characters(bob as unknown as Device).$characters()!.length).toBe(1);
      expect(characters(bob as unknown as Device).$characters()!.every((c) => c.notes === undefined)).toBe(true);
      expect(characters(gm).$characters()!.every((c) => c.notes === undefined)).toBe(true);
      expect(hostRecord().notes).toBe('The key is under the mat');
      bob.injector.destroy();
    });

    it("the owner gets their notes back from the host's hello answer after a rejoin", async () => {
      await ada.offline.saveNotes('The key is under the mat');
      await settle();
      rooms(ada).leave();
      await settle();
      await join(ada);

      expect(ada.offline.$myCharacter()!.notes).toBe('The key is under the mat');
    });

    it("another player can't change a character's notes, and neither can a held player", async () => {
      const bob = withOffline(gameDevice(net, 'bob', 'Bob'));
      bob.injector.get(GameSessionBusiness);
      await join(bob);
      await characters(bob).create('Bob');
      await settle();
      const service = bob.injector.get(CharacterService);
      await expect(service.saveNotes(hostCharacter().id, 'mine now')).rejects.toMatchObject({ code: 'forbidden' });
      expect(hostRecord().notes).toBeUndefined();
      bob.injector.destroy();
    });

    it('a held player (waiting for a pick) is refused', async () => {
      await gm.features.set({ dice: true, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: false });
      await settle();
      await hostGoesOffline();
      await ada.offline.act(hostCharacter().id, spend());
      await join(ada);
      expect(ada.copy.$readOnly()).toBe(true);

      await expect(ada.injector.get(CharacterService).saveNotes(hostCharacter().id, 'x')).rejects.toMatchObject({ code: 'forbidden' });
      expect(hostRecord().notes).toBeUndefined();
    });
  });

  describe('using the player version replays the queue on the host record', () => {
    const spendOn = { dice: true, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: false };

    it('a forged copy (extra money) is not applied, the queued actions are', async () => {
      await gm.features.set(spendOn);
      await settle();
      await hostGoesOffline();
      await ada.offline.act(hostCharacter().id, spend());
      await ada.copy.recordOffline({ ...ada.offline.$myCharacter()!, money: 9999 }, ada.offline.$queue());
      await join(ada);

      const refused = await gm.hostCopy.usePlayer('ada');
      await settle();

      expect(refused).toEqual([]);
      expect(hostRecord()).toMatchObject({ money: 20, statPoints: 2, attributes: [{ attributeId, points: 1, current: 11 }] });
    });

    it('reports the entries the host refuses (feature switched off meanwhile) and leaves the record alone', async () => {
      await gm.features.set(spendOn);
      await settle();
      await hostGoesOffline();
      await ada.offline.act(hostCharacter().id, spend());
      await join(ada);
      await gm.features.set({ ...spendOn, spendStatPoints: false });

      const refused = await gm.hostCopy.usePlayer('ada');

      expect(refused).toEqual([{ route: SPEND, error: 'character.errors.offlineNotAllowed' }]);
      expect(hostRecord().statPoints).toBe(3);
    });
  });

  describe('the queue survives a reload', () => {
    it('a new player-copy business on the same device finds the queue and the changed copy', async () => {
      await gm.features.set({ dice: true, notes: true, spendStatPoints: true, equip: false, useConsumables: false, sell: false });
      await settle();
      await hostGoesOffline();
      await ada.offline.act(hostCharacter().id, spend());

      const reloaded = withOffline(ada);
      await settle();

      expect(reloaded.offline.$queue()).toEqual([queuedSpend()]);
      expect(reloaded.offline.$myCharacter()).toMatchObject({ statPoints: 2 });
    });
  });
});
