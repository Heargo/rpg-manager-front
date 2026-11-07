import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { gameDevice, settle } from '../../../../testing/game-device';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { Character } from '../../world/models/world';
import { PlayerCopyService } from '../services/player-copy.service';
import { PlayerCopyStorageService } from '../services/player-copy-storage.service';
import { CharacterBusiness } from './character.business';
import { PlayerCopyHostBusiness } from './player-copy-host.business';
import { PlayerCopyBusiness } from './player-copy.business';

type Device = ReturnType<typeof gameDevice> & { copy: PlayerCopyBusiness; hostCopy: PlayerCopyHostBusiness };

/** The player-copy businesses, one instance per device, built on top of the device's own services. */
function withPlayerCopy(device: ReturnType<typeof gameDevice>): Device {
  const child = createEnvironmentInjector(
    [PlayerCopyService, PlayerCopyStorageService, PlayerCopyBusiness, PlayerCopyHostBusiness],
    device.injector,
  );
  return { ...device, injector: device.injector, copy: child.get(PlayerCopyBusiness), hostCopy: child.get(PlayerCopyHostBusiness) };
}

describe('player copy and "Pick a save" (host + player over the fake network)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: Device;
  let ada: Device;
  let roomId: string;

  const rooms = (d: Device) => d.injector.get(RoomBusiness);
  const characters = (d: Device) => d.injector.get(CharacterBusiness);
  const hostCharacter = () => characters(gm).$characters()!.find((c) => c.playerId === 'ada')!;

  async function join(player: Device) {
    const invite = await rooms(gm).invite();
    const { answerCode, joined } = await rooms(player).join(invite.offerCode);
    await rooms(gm).accept(invite.id, answerCode);
    await joined;
    await settle();
  }

  /** Ada leaves; the game master grants her points while she is away; she comes back. */
  async function rejoinAfterHostChange(): Promise<Character> {
    rooms(ada).leave();
    await settle();
    await characters(gm).act(hostCharacter().id, { kind: 'grant-stat-points', amount: 2 });
    await settle();
    await join(ada);
    return hostCharacter();
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }));
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = withPlayerCopy(gameDevice(net, 'gm', 'Gm'));
    ada = withPlayerCopy(gameDevice(net, 'ada', 'Ada'));
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
  });

  afterEach(() => {
    [gm, ada].forEach((d) => d.injector.destroy());
    vi.unstubAllGlobals();
  });

  it("saves the player's own character per room on every state", async () => {
    expect(await ada.copy.savedCopy(roomId)).toEqual(hostCharacter());
    expect(hostCharacter()).toMatchObject({ statPoints: 3, rev: 1 });

    await characters(gm).act(hostCharacter().id, { kind: 'grant-stat-points', amount: 2 });
    await settle();

    expect(await ada.copy.savedCopy(roomId)).toMatchObject({ statPoints: 5, rev: 2 });
    expect(await ada.copy.savedCopy(roomId)).toEqual(hostCharacter());
  });

  it('equal hashes: no conflict, no dialog, the player stays free to play', async () => {
    rooms(ada).leave();
    await settle();
    await join(ada);

    expect(gm.hostCopy.$conflicts()).toEqual([]);
    expect(ada.copy.$readOnly()).toBe(false);
    expect(hostCharacter()).toMatchObject({ statPoints: 3, rev: 1 });
  });

  it('a first join with no copy at all is no conflict either', async () => {
    const bob = withPlayerCopy(gameDevice(net, 'bob', 'Bob'));
    await join(bob);
    expect(gm.hostCopy.$conflicts()).toEqual([]);
    expect(bob.copy.$readOnly()).toBe(false);
    bob.injector.destroy();
  });

  it("mismatch: the player turns read-only and the host gets a pending conflict with both versions", async () => {
    const before = hostCharacter();
    const host = await rejoinAfterHostChange();

    expect(host).toMatchObject({ statPoints: 5, rev: 2 });
    expect(ada.copy.$readOnly()).toBe(true);
    const conflicts = gm.hostCopy.$conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ playerId: 'ada', playerName: 'Ada', queued: [] });
    expect(conflicts[0].host).toEqual(host);
    expect(conflicts[0].player).toEqual(before);
    expect(conflicts[0].player).toMatchObject({ statPoints: 3, rev: 1 });
  });

  it('mismatch → keep host version: next rev, broadcast, overwrites the player copy', async () => {
    await rejoinAfterHostChange();

    await gm.hostCopy.keepHost('ada');
    await settle();

    expect(hostCharacter()).toMatchObject({ statPoints: 5, rev: 3 });
    expect(characters(ada).$myCharacter()).toEqual(hostCharacter());
    expect(await ada.copy.savedCopy(roomId)).toEqual(hostCharacter());
    expect(gm.hostCopy.$conflicts()).toEqual([]);
    expect(ada.copy.$readOnly()).toBe(false);
  });

  it("mismatch → use player version: the host's record replays the queue (none here), next rev, broadcast, kept as the copy; nothing is taken from the copy", async () => {
    await rejoinAfterHostChange();

    await gm.hostCopy.usePlayer('ada');
    await settle();

    expect(hostCharacter()).toMatchObject({ statPoints: 5, rev: 3 });
    const hostWorld = await gm.injector.get(WorldLibraryBusiness).get(rooms(gm).$room()!.worldId!);
    expect(hostWorld?.characters.find((c) => c.playerId === 'ada')).toEqual(hostCharacter());
    expect(characters(ada).$myCharacter()).toEqual(hostCharacter());
    expect(await ada.copy.savedCopy(roomId)).toEqual(hostCharacter());
    expect(gm.hostCopy.$conflicts()).toEqual([]);
    expect(ada.copy.$readOnly()).toBe(false);
  });
});
