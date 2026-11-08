import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Npc } from '../models/npc';
import { NpcCatalogueBusiness } from './npc-catalogue.business';

const draft: Omit<Npc, 'id'> = {
  name: 'Secret Ogre', statPoints: 0, xp: 200, level: 3, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles: ['enemy'], description: '', xpReward: 40, loot: [],
};

describe('saving an NPC from the editor (GM + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  let worldId: string;
  const catalogue = () => gm.injector.get(NpcCatalogueBusiness);
  const inMemory = () => gm.injector.get(WorldSessionBusiness).$world()!.npcs;
  const onDisk = async () => (await gm.injector.get(WorldLibraryBusiness).get(worldId))!.npcs;

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
    worldId = world.id;
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('adds a new NPC with a new id to the world and stores it', async () => {
    const saved = await catalogue().save(draft);

    expect(saved.id).toBeTruthy();
    expect(saved).toMatchObject(draft);
    expect(inMemory()).toEqual([saved]);
    expect(await onDisk()).toEqual([saved]);
  });

  it('replaces an existing NPC in place, keeping its id and position', async () => {
    const first = await catalogue().save(draft);
    const second = await catalogue().save({ ...draft, name: 'Baker' });

    const updated = await catalogue().save({ ...first, name: 'Ogre King', xpReward: 99 });

    expect(updated).toMatchObject({ id: first.id, name: 'Ogre King', xpReward: 99 });
    expect(inMemory().map((n) => n.name)).toEqual(['Ogre King', 'Baker']);
    expect(inMemory().map((n) => n.id)).toEqual([first.id, second.id]);
    expect((await onDisk()).map((n) => n.name)).toEqual(['Ogre King', 'Baker']);
  });

  it('never sends the saved NPC to a player', async () => {
    await catalogue().save(draft);
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();

    const info = ada.injector.get(WorldInfoBusiness).$info();
    expect(info).not.toHaveProperty('npcs');
    expect(JSON.stringify(info)).not.toContain('Secret Ogre');
  });
});
