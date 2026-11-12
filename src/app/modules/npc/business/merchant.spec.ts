import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { CharacterBusiness } from '../../character/business/character.business';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { InventoryItem } from '../../world/models/world';
import { Npc } from '../models/npc';
import { MerchantBusiness } from './merchant.business';
import { NpcCatalogueBusiness } from './npc-catalogue.business';

/**
 * Needs `MerchantBusiness` (and its service and host business) listed in `GAME_DEVICE` of `src/testing/game-device.ts`,
 * the host side started by `GameSessionBusiness`. Contract: `open(npcId, playerIds?)` / `close(npcId, playerIds?)` (GM; no ids = every
 * player), `buy(npcId, inventoryId)` and `sell(npcId, inventoryId)` (player) resolve with the updated Character, `$shops()` is the
 * list of shops open for this device's player: `{ npcId, name, stock: { id, item, price }[] }`.
 */
const linear = { preset: 'linear', step: 1 } as const;
const entry = (id: string, price: number, equipped = false): InventoryItem => ({
  id: `inv-${id}`, equipped, position: 0,
  item: { id, name: id, description: '', rarity: 'common', type: 'item', slot: 'none', price, modifiers: [] },
});

describe('merchants (GM + players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  let bob: ReturnType<typeof gameDevice>;
  let npcId: string;

  const merchantOf = (d: ReturnType<typeof gameDevice>) => d.injector.get(MerchantBusiness);
  const mine = (d: ReturnType<typeof gameDevice>) => d.injector.get(CharacterBusiness).$myCharacter()!;
  const stockNames = (d: ReturnType<typeof gameDevice>) => merchantOf(d).$shops().flatMap((shop) => shop.stock.map((s) => s.item.id));
  const hostNpc = () => gm.injector.get(WorldSessionBusiness).$world()!.npcs.find((n) => n.id === npcId)!;

  async function join(player: ReturnType<typeof gameDevice>, name: string) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await player.injector.get(CharacterBusiness).create(name);
    await settle();
  }

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
      attributes: [{ name: 'Life', baseValue: 10, formula: linear }],
      barAttributes: { life: 'Life' },
      startingMoney: 100,
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await join(ada, 'Ada');
    await join(bob, 'Bob');
    const npc: Omit<Npc, 'id'> = {
      name: 'Mira', statPoints: 0, xp: 0, level: 2, money: 0, updatedAt: 1, skillPoints: 0, skills: [], attributes: [],
      inventory: [entry('potion', 20), entry('crown', 500), entry('sword', 50, true)],
      roles: ['merchant'], description: '', xpReward: 0, loot: [], merchant: { buyRatio: 1.5, sellRatio: 0.5 },
    };
    npcId = (await gm.injector.get(NpcCatalogueBusiness).save(npc)).id;
    await settle();
  });

  afterEach(() => [gm, ada, bob].forEach((d) => d.injector.destroy()));

  it('shows no shop until the GM opens one', () => {
    expect(merchantOf(ada).$shops()).toEqual([]);
  });

  it('opens the shop for every player: unequipped stock only, at the merchant buy ratio', async () => {
    await merchantOf(gm).open(npcId);
    await settle();

    for (const player of [ada, bob]) {
      expect(merchantOf(player).$shops()).toHaveLength(1);
      expect(merchantOf(player).$shops()[0]).toMatchObject({ npcId, name: 'Mira' });
      expect(merchantOf(player).$shops()[0].stock.map((s) => [s.id, s.price])).toEqual([['inv-potion', 30], ['inv-crown', 750]]);
    }
  });

  it('opens the shop for one player only', async () => {
    await merchantOf(gm).open(npcId, ['ada']);
    await settle();

    expect(merchantOf(ada).$shops()).toHaveLength(1);
    expect(merchantOf(bob).$shops()).toEqual([]);
    await expect(merchantOf(bob).buy(npcId, 'inv-potion')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.closed' });
  });

  it('closes the shop', async () => {
    await merchantOf(gm).open(npcId);
    await settle();
    await merchantOf(gm).close(npcId, ['bob']);
    await settle();
    expect(merchantOf(bob).$shops()).toEqual([]);
    expect(merchantOf(ada).$shops()).toHaveLength(1);

    await merchantOf(gm).close(npcId);
    await settle();
    expect(merchantOf(ada).$shops()).toEqual([]);
    await expect(merchantOf(ada).buy(npcId, 'inv-potion')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.closed' });
  });

  it('refuses a player opening a shop', async () => {
    await expect(merchantOf(ada).open(npcId)).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('sells the item to the player: money, inventory, merchant stock and every open shop follow', async () => {
    await merchantOf(gm).open(npcId);
    await settle();

    const saved = await merchantOf(ada).buy(npcId, 'inv-potion');
    await settle();

    expect(saved.money).toBe(70);
    expect(mine(ada).money).toBe(70);
    expect(mine(ada).inventory.map((e) => e.item.id)).toEqual(['potion']);
    expect(hostNpc().inventory.map((e) => e.item.id)).toEqual(['crown', 'sword']);
    expect(stockNames(ada)).toEqual(['crown']);
    expect(stockNames(bob)).toEqual(['crown']);
  });

  it('refuses a purchase the player cannot afford, an equipped item and an unknown one', async () => {
    await merchantOf(gm).open(npcId);
    await settle();

    await expect(merchantOf(ada).buy(npcId, 'inv-crown')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.cantAfford' });
    await expect(merchantOf(ada).buy(npcId, 'inv-sword')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.notInStock' });
    await expect(merchantOf(ada).buy(npcId, 'inv-nothing')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.notInStock' });
    expect(mine(ada).money).toBe(100);
  });

  it('buys an item from the player at the merchant sell ratio and puts it in stock', async () => {
    await merchantOf(gm).open(npcId);
    await settle();
    await merchantOf(ada).buy(npcId, 'inv-potion');
    await settle();
    const owned = mine(ada).inventory[0].id;

    const saved = await merchantOf(ada).sell(npcId, owned);
    await settle();

    expect(saved.money).toBe(80);
    expect(mine(ada).inventory).toEqual([]);
    expect(hostNpc().inventory.map((e) => e.item.id)).toContain('potion');
    expect(stockNames(bob)).toContain('potion');
  });

  it('refuses a sale while the shop is closed and an item the player does not own', async () => {
    await expect(merchantOf(ada).sell(npcId, 'inv-x')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.closed' });
    await merchantOf(gm).open(npcId);
    await settle();
    await expect(merchantOf(ada).sell(npcId, 'inv-x')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.unknownItem' });
  });
});
