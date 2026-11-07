import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { InventoryItem } from '../../world/models/world';
import { CharacterBusiness } from './character.business';

const potion: InventoryItem = {
  id: 'inv-potion',
  equipped: false,
  position: 0,
  item: {
    id: 'potion',
    name: 'Potion',
    description: '',
    rarity: 'common',
    type: 'consumable',
    slot: 'none',
    price: 20,
    modifiers: [{ attribute: 'Life', value: 5 }],
  },
};

describe('character actions (host + players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  let bob: ReturnType<typeof gameDevice>;

  async function join(player: ReturnType<typeof gameDevice>, name: string) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.injector
      .get(RoomBusiness)
      .join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await player.injector.get(CharacterBusiness).create(name);
    await settle();
  }

  const mine = (d: ReturnType<typeof gameDevice>) =>
    d.injector.get(CharacterBusiness).$myCharacter()!;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    bob = gameDevice(net, 'bob', 'Bob');
    [gm, ada, bob].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
      startingStatPoints: 1,
      startingMoney: 5,
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await join(ada, 'Ada');
    await join(bob, 'Bob');
  });

  afterEach(() => [gm, ada, bob].forEach((d) => d.injector.destroy()));

  it('lets a player spend their points, and everyone sees the new sheet', async () => {
    const lifeId = mine(ada).attributes[0].attributeId;

    const saved = await ada.injector
      .get(CharacterBusiness)
      .act(mine(ada).id, { kind: 'spend-stat-point', attributeId: lifeId });
    await settle();

    expect(saved).toMatchObject({ statPoints: 0, rev: 2 });
    expect(mine(ada).attributes[0]).toMatchObject({ level: 1, current: 11 });
    const seenByBob = bob.injector
      .get(CharacterBusiness)
      .$characters()!
      .find((c) => c.playerId === 'ada')!;
    expect(seenByBob.rev).toBe(2);
    await expect(
      ada.injector
        .get(CharacterBusiness)
        .act(mine(ada).id, { kind: 'spend-stat-point', attributeId: lifeId }),
    ).rejects.toMatchObject({
      code: 'rejected',
      message: 'character.errors.noStatPoints',
    });
  });

  it("refuses a player acting on someone else's character or doing the game master's actions", async () => {
    const adaChars = ada.injector.get(CharacterBusiness);
    await expect(
      adaChars.act(mine(bob).id, { kind: 'grant-stat-points', amount: 1 }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      adaChars.act(mine(ada).id, { kind: 'grant-stat-points', amount: 5 }),
    ).rejects.toMatchObject({
      message: 'character.errors.gameMasterOnly',
    });
    await expect(
      adaChars.act(mine(bob).id, { kind: 'sell', inventoryId: 'x' }),
    ).rejects.toMatchObject({
      message: 'character.errors.notYours',
    });
  });

  it('lets the game master grant points, set values, and players use and sell items', async () => {
    const gmChars = gm.injector.get(CharacterBusiness);
    const lifeId = mine(ada).attributes[0].attributeId;
    await gmChars.act(mine(ada).id, { kind: 'grant-stat-points', amount: 3 });
    await gmChars.act(mine(ada).id, {
      kind: 'set-current',
      attributeId: lifeId,
      value: 2,
    });
    // Until the catalogue can give items (L08), put two potions in the bag directly.
    await gm.injector.get(WorldSessionBusiness).update((world) => ({
      ...world,
      characters: world.characters.map((c) =>
        c.playerId === 'ada'
          ? { ...c, inventory: [potion, { ...potion, id: 'inv-potion-2' }] }
          : c,
      ),
    }));
    await settle();
    await settle();
    expect(mine(ada)).toMatchObject({ statPoints: 4 });

    const adaChars = ada.injector.get(CharacterBusiness);
    await adaChars.act(mine(ada).id, {
      kind: 'use',
      inventoryId: 'inv-potion',
    });
    await adaChars.act(mine(ada).id, {
      kind: 'sell',
      inventoryId: 'inv-potion-2',
    });
    await settle();

    expect(mine(ada).attributes[0].current).toBe(7);
    expect(mine(ada)).toMatchObject({ money: 25, inventory: [] });
    expect(
      gm.injector
        .get(WorldSessionBusiness)
        .$world()!
        .characters.find((c) => c.playerId === 'ada')!.money,
    ).toBe(25);
  });
});
