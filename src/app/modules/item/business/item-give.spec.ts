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
import { Item } from '../../world/models/world';
import { ItemService } from '../services/item.service';

const sword: Item = {
  id: 'sword',
  name: 'Iron Sword',
  description: 'Sharp.',
  rarity: 'common',
  type: 'equipment',
  slot: 'weapon1',
  price: 10,
  modifiers: [{ attribute: 'Life', value: 2 }],
};

describe('giving a catalogue item (GM + players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;

  const mine = () =>
    ada.injector.get(CharacterBusiness).$myCharacter()!;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await gm.injector
      .get(WorldSessionBusiness)
      .update((w) => ({ ...w, items: [sword] }));
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector
      .get(RoomBusiness)
      .join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await ada.injector.get(CharacterBusiness).create('Ada');
    await settle();
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it("puts a copy of the catalogue item in the player's inventory, and the player sees it", async () => {
    const saved = await gm.injector
      .get(ItemService)
      .giveToPlayer(mine().id, 'sword');
    await settle();

    expect(saved.inventory).toHaveLength(1);
    expect(saved.inventory[0]).toMatchObject({
      equipped: false,
      item: { name: 'Iron Sword', price: 10 },
    });
    expect(mine().inventory).toHaveLength(1);
    expect(mine().inventory[0].item.name).toBe('Iron Sword');
    expect(mine().rev).toBe(saved.rev);
  });

  it('gives a separate inventory entry each time', async () => {
    const items = gm.injector.get(ItemService);
    await items.giveToPlayer(mine().id, 'sword');
    await items.giveToPlayer(mine().id, 'sword');
    await settle();

    const ids = mine().inventory.map((i) => i.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('rejects an item that is not in the catalogue', async () => {
    await expect(
      gm.injector.get(ItemService).giveToPlayer(mine().id, 'nope'),
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('refuses a player giving themselves an item', async () => {
    await expect(
      ada.injector.get(ItemService).giveToPlayer(mine().id, 'sword'),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await settle();
    expect(mine().inventory).toEqual([]);
  });
});
