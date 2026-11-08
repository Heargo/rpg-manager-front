import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { PeerApi } from '../../../core/p2p/peer-api.service';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { NpcCatalogueBusiness } from '../../npc/business/npc-catalogue.business';
import { DEFAULT_NPC_VISIBILITY } from '../../npc/helpers/npc-visibility.rules';
import { Npc } from '../../npc/models/npc';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { WorldRules } from '../../world/models/world';
import { TableBusiness } from './table.business';

const linear = { preset: 'linear', step: 1 } as const;

describe('NPCs on the table (GM + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  let goblin: Npc;
  const ids: string[] = [];

  const session = () => gm.injector.get(WorldSessionBusiness);
  const gmTable = () => gm.injector.get(TableBusiness);
  const adaTable = () => ada.injector.get(TableBusiness);
  const rules = (npcVisibility: unknown): WorldRules => {
    const world = session().$world()!;
    return {
      attributes: world.attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
      startingStatPoints: world.startingStatPoints,
      startingMoney: world.startingMoney,
      levelCurve: world.levelCurve,
      maxLevel: world.maxLevel,
      statPointsPerLevel: world.statPointsPerLevel,
      offlineFeatures: world.offlineFeatures,
      npcVisibility,
    } as WorldRules;
  };
  const newNpc = (name: string, roles: Npc['roles'] = ['enemy']): Omit<Npc, 'id'> => {
    const life = session().$world()!.attributes[0].id;
    return {
      name, statPoints: 0, xp: 0, level: 3, money: 77, updatedAt: 1, skillPoints: 0, skills: [],
      attributes: [{ attributeId: life, level: 0, current: 4 }],
      inventory: [{
        id: 'e1', equipped: false, position: 0,
        item: { id: 'i1', name: 'Secret Sack', description: '', rarity: 'common', type: 'item', slot: 'none', price: 1, modifiers: [] },
      }],
      roles, description: 'Hidden lair.', xpReward: 123, loot: ['e1'],
    };
  };

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: linear }],
      barAttributes: { life: 'Life' },
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    ids.length = 0;
    const catalogue = gm.injector.get(NpcCatalogueBusiness);
    goblin = await catalogue.save(newNpc('Goblin'));
    for (const name of ['B', 'C', 'D', 'E']) ids.push((await catalogue.save(newNpc(name))).id);
    await settle();
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('starts with no NPC on the table', () => {
    expect(adaTable().$npcs()).toEqual([]);
    expect(gmTable().$npcs()).toEqual([]);
  });

  it('shows an NPC to every player as the public projection only', async () => {
    await gmTable().showNpc(goblin.id);
    await settle();

    const expected = [{ id: goblin.id, name: 'Goblin', level: 3, lifeBar: { percent: 40 } }];
    expect(adaTable().$npcs()).toEqual(expected);
    expect(gmTable().$npcs()).toEqual(expected);
    const json = JSON.stringify(adaTable().$npcs());
    for (const hidden of ['Hidden lair', 'Secret Sack', 'inventory', 'money', 'xpReward', 'loot', '123']) {
      expect(json).not.toContain(hidden);
    }
  });

  it('hides it again', async () => {
    await gmTable().showNpc(goblin.id);
    await settle();
    await gmTable().hideNpc(goblin.id);
    await settle();

    expect(adaTable().$npcs()).toEqual([]);
    expect(gmTable().$npcs()).toEqual([]);
  });

  it('shows up to 4 NPCs and refuses a 5th', async () => {
    await gmTable().showNpc(goblin.id);
    await gmTable().showNpc(ids[0]);
    await gmTable().showNpc(ids[1]);
    await gmTable().showNpc(ids[2]);
    await settle();
    expect(adaTable().$npcs()).toHaveLength(4);

    await expect(gmTable().showNpc(ids[3])).rejects.toMatchObject({ code: 'rejected' });
    await settle();
    expect(adaTable().$npcs()).toHaveLength(4);

    await gmTable().hideNpc(goblin.id);
    await gmTable().showNpc(ids[3]);
    await settle();
    expect(adaTable().$npcs().map((n) => n.name)).toEqual(['B', 'C', 'D', 'E']);
  });

  it('refuses an unknown NPC', async () => {
    await expect(gmTable().showNpc('nope')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('refuses a player showing or hiding an NPC', async () => {
    await expect(adaTable().showNpc(goblin.id)).rejects.toMatchObject({ code: 'forbidden' });
    await gmTable().showNpc(goblin.id);
    await settle();
    await expect(adaTable().hideNpc(goblin.id)).rejects.toMatchObject({ code: 'forbidden' });
    expect(adaTable().$npcs()).toHaveLength(1);
  });

  it('republishes a shown NPC when the GM edits it', async () => {
    await gmTable().showNpc(goblin.id);
    await settle();

    await gm.injector.get(NpcCatalogueBusiness).save({ ...goblin, name: 'Goblin King', level: 8 });
    await settle();

    expect(adaTable().$npcs()).toEqual([{ id: goblin.id, name: 'Goblin King', level: 8, lifeBar: { percent: 40 } }]);
  });

  it('republishes the shown NPCs when the visibility rules change', async () => {
    await gmTable().showNpc(goblin.id);
    await settle();

    await session().saveRules(rules({
      ...DEFAULT_NPC_VISIBILITY,
      enemy: { description: true, level: false, lifeBar: false, lifeNumbers: true, attributes: false, equipment: false },
    }));
    await settle();

    expect(adaTable().$npcs()).toEqual([
      { id: goblin.id, name: 'Goblin', description: 'Hidden lair.', life: { current: 4, max: 10 } },
    ]);
  });

  it('stops showing an NPC the GM deletes from the catalogue', async () => {
    await gmTable().showNpc(goblin.id);
    await settle();
    await gm.injector.get(NpcCatalogueBusiness).remove(goblin.id);
    await settle();

    expect(adaTable().$npcs()).toEqual([]);
  });

  it.each([
    ['a null payload', null],
    ['a missing npcId', { shown: true }],
    ['an empty npcId', { npcId: '', shown: true }],
    ['a non-boolean shown', (id: string) => ({ npcId: id, shown: 'x' })],
    ['a missing shown', (id: string) => ({ npcId: id })],
  ])('refuses %s as invalid and leaves the shown NPCs alone', async (_label, payload) => {
    await gmTable().showNpc(goblin.id);
    await settle();

    await expect(gm.injector.get(PeerApi).request('table/set-npc', typeof payload === 'function' ? payload(goblin.id) : payload)).rejects.toMatchObject({ code: 'invalid' });
    await settle();

    expect(gmTable().$npcs().map((n) => n.id)).toEqual([goblin.id]);
    expect(adaTable().$npcs().map((n) => n.id)).toEqual([goblin.id]);
  });
});
