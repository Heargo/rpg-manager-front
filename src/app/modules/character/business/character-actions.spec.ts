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
import { attributeStats } from '../helpers/character-stats';
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
      attributes: [
        { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
        { name: 'Mana', baseValue: 10, formula: { preset: 'custom', expression: 'base + playerLevel * 10' } },
      ],
      levelCurve: { preset: 'growing' },
      statPointsPerLevel: 3,
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

  describe('grant-xp', () => {
    it('starts characters at level 1 with 0 XP', () => {
      expect(mine(ada)).toMatchObject({ xp: 0, level: 1 });
    });

    it('lets the game master grant XP, and the character levels up and gets stat points', async () => {
      const gmChars = gm.injector.get(CharacterBusiness);

      await gmChars.act(mine(ada).id, { kind: 'grant-xp', amount: 150 });
      await settle();
      expect(mine(ada)).toMatchObject({ xp: 150, level: 1, statPoints: 1 });

      await gmChars.act(mine(ada).id, { kind: 'grant-xp', amount: 100 });
      await settle();
      expect(mine(ada)).toMatchObject({ xp: 250, level: 2, statPoints: 4 });
      expect(mine(bob)).toMatchObject({ xp: 0, level: 1, statPoints: 1 });
    });

    it('gains several levels from one grant', async () => {
      await gm.injector.get(CharacterBusiness).act(mine(ada).id, { kind: 'grant-xp', amount: 1000 });
      await settle();
      expect(mine(ada)).toMatchObject({ xp: 1000, level: 4, statPoints: 10 });
    });

    it('raises maxima that use playerLevel, and current by the same delta', async () => {
      const gmChars = gm.injector.get(CharacterBusiness);
      const manaId = mine(ada).attributes[1].attributeId;
      expect(mine(ada).attributes[1].current).toBe(20);
      await gmChars.act(mine(ada).id, { kind: 'set-current', attributeId: manaId, value: 5 });
      await gmChars.act(mine(ada).id, { kind: 'grant-xp', amount: 200 });
      await settle();
      expect(mine(ada).level).toBe(2);
      // max 10 + 2 * 10 = 30 (was 20): current 5 -> 15.
      expect(mine(ada).attributes[1].current).toBe(15);
      const stat = attributeStats(
        gm.injector.get(WorldSessionBusiness).$world()!.attributes,
        mine(ada),
      ).find((entry) => entry.attributeId === manaId)!;
      expect(stat).toMatchObject({ max: 30, current: 15 });
    });

    it('refuses a player, even for their own character', async () => {
      await expect(
        ada.injector.get(CharacterBusiness).act(mine(ada).id, { kind: 'grant-xp', amount: 500 }),
      ).rejects.toMatchObject({ message: 'character.errors.gameMasterOnly' });
      await expect(
        ada.injector.get(CharacterBusiness).act(mine(bob).id, { kind: 'grant-xp', amount: 500 }),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await settle();
      expect(mine(ada)).toMatchObject({ xp: 0, level: 1 });
    });

    it('refuses an amount below 1', async () => {
      await expect(
        gm.injector.get(CharacterBusiness).act(mine(ada).id, { kind: 'grant-xp', amount: 0 }),
      ).rejects.toMatchObject({ message: 'character.errors.invalidAmount' });
    });
  });
});
