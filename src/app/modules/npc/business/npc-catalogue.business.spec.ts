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

const npc = (id: string, name: string): Npc => ({
  id, name, statPoints: 0, xp: 0, level: 3, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles: ['enemy'], description: '', xpReward: 20, loot: [],
});

describe('NpcCatalogueBusiness (GM + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  const catalogue = () => gm.injector.get(NpcCatalogueBusiness);
  const stored = () => gm.injector.get(WorldSessionBusiness).$world()!.npcs;

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
      .update((w) => ({ ...w, npcs: [npc('n1', 'Goblin'), npc('n2', 'Baker')] }));
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('lists the hosted world NPCs', () => {
    expect(catalogue().$world()!.npcs.map((n) => n.name)).toEqual(['Goblin', 'Baker']);
  });

  it('duplicates an NPC with a new id and a "(copy)" name, and stores the world', async () => {
    await catalogue().duplicate('n1');
    const names = stored().map((n) => n.name);
    expect(names).toEqual(['Goblin', 'Baker', 'Goblin (copy)']);
    const copy = stored()[2];
    expect(copy.id).not.toBe('n1');
    expect(copy.xpReward).toBe(20);
  });

  it('deletes an NPC and stores the world', async () => {
    await catalogue().remove('n1');
    expect(stored().map((n) => n.id)).toEqual(['n2']);
  });

  it('never sends the catalogue to a player', async () => {
    await catalogue().duplicate('n1');
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    const info = ada.injector.get(WorldInfoBusiness).$info();
    expect(info).not.toHaveProperty('npcs');
    expect(JSON.stringify(info)).not.toContain('Goblin');
  });
});
