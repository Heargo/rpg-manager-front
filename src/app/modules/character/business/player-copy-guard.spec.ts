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
import { PlayerCopyService } from '../services/player-copy.service';
import { PlayerCopyStorageService } from '../services/player-copy-storage.service';
import { CharacterBusiness } from './character.business';
import { PlayerCopyHostBusiness } from './player-copy-host.business';
import { PlayerCopyBusiness } from './player-copy.business';

function withPlayerCopy(device: ReturnType<typeof gameDevice>) {
  const child: EnvironmentInjector = createEnvironmentInjector(
    [
      PlayerCopyService,
      PlayerCopyStorageService,
      PlayerCopyBusiness,
      PlayerCopyHostBusiness,
    ],
    device.injector,
  );
  return {
    ...device,
    child,
    copy: child.get(PlayerCopyBusiness),
    hostCopy: child.get(PlayerCopyHostBusiness),
  };
}
type Device = ReturnType<typeof withPlayerCopy>;

describe('player copy: the host holds players that are unchecked or waiting', () => {
  let gm: Device;
  let ada: Device;

  const rooms = (d: Device) => d.injector.get(RoomBusiness);
  const characters = (d: Device) => d.injector.get(CharacterBusiness);
  const hostCharacter = () =>
    characters(gm)
      .$characters()!
      .find((c) => c.playerId === 'ada')!;

  /** Connects `player` without waiting for effects: its hello has not run yet. */
  async function connect(player: Device) {
    const invite = await rooms(gm).invite();
    const { answerCode, joined } = await rooms(player).join(invite.offerCode);
    await rooms(gm).accept(invite.id, answerCode);
    await joined;
  }

  async function leaveAndGrant() {
    rooms(ada).leave();
    await settle();
    await characters(gm).act(hostCharacter().id, {
      kind: 'grant-stat-points',
      amount: 2,
    });
    await settle();
    await connect(ada);
    await settle();
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }),
    );
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const net = createPeerNetwork();
    gm = withPlayerCopy(gameDevice(net, 'gm', 'Gm'));
    ada = withPlayerCopy(gameDevice(net, 'ada', 'Ada'));
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
      startingStatPoints: 3,
      startingMoney: 20,
    });
    await rooms(gm).hostRoom('Eldoria', world.id);
    await settle();
    await connect(ada);
    await settle();
    await characters(ada).create('Ada');
    await settle();
  });

  afterEach(() => {
    [gm, ada].forEach((d) => {
      d.child.destroy();
      d.injector.destroy();
    });
    vi.unstubAllGlobals();
  });

  const spend = () =>
    characters(ada).act(hostCharacter().id, {
      kind: 'spend-stat-point',
      attributeId: hostCharacter().attributes[0].attributeId,
    });

  it('a checked player acts freely', async () => {
    await spend();
    expect(hostCharacter().statPoints).toBe(2);
  });

  it('rejects an action sent right after connecting, before the hello was served', async () => {
    rooms(ada).leave();
    await settle();
    await connect(ada);
    const before = hostCharacter();

    await expect(spend()).rejects.toMatchObject({ code: 'forbidden' });
    expect(hostCharacter()).toEqual(before);

    await settle();
    await spend();
    expect(hostCharacter().statPoints).toBe(before.statPoints - 1);
  });

  it('rejects the actions of a player waiting for the pick, and the host state stays as it was', async () => {
    await leaveAndGrant();
    expect(ada.copy.$readOnly()).toBe(true);
    const before = hostCharacter();

    await expect(spend()).rejects.toMatchObject({ code: 'forbidden' });
    expect(hostCharacter()).toEqual(before);

    await gm.hostCopy.keepHost('ada');
    await settle();
    await spend();
    expect(hostCharacter().statPoints).toBe(4);
  });

  it('drops the conflict of a player who left', async () => {
    await leaveAndGrant();
    expect(gm.hostCopy.$conflicts()).toHaveLength(1);

    rooms(ada).leave();
    await settle();

    expect(gm.hostCopy.$conflicts()).toEqual([]);
  });

  it('retries a failed submit so the player is not stuck read-only', async () => {
    const submit = vi
      .spyOn(ada.child.get(PlayerCopyService), 'submit')
      .mockRejectedValueOnce(new Error('timeout'));
    await leaveAndGrant();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    expect(submit.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(gm.hostCopy.$conflicts()).toHaveLength(1);
  });
});
