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

const goblin: Npc = {
  id: 'n1', name: 'Secret Goblin', statPoints: 0, xp: 0, level: 3, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles: ['enemy'], description: 'Hidden lair.', xpReward: 20, loot: [],
};

describe('NPCs stay on the host (GM + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;

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
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('keeps the NPCs in the hosted world and out of world/info for the player', async () => {
    await gm.injector.get(WorldSessionBusiness).update((w) => ({ ...w, npcs: [goblin] }));
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();

    expect(gm.injector.get(WorldSessionBusiness).$world()!.npcs).toEqual([goblin]);
    const info = ada.injector.get(WorldInfoBusiness).$info();
    expect(info?.name).toBe('Eldoria');
    expect(info).not.toHaveProperty('npcs');
    expect(JSON.stringify(info)).not.toContain('Secret Goblin');
    expect(JSON.stringify(gm.injector.get(WorldInfoBusiness).$info())).not.toContain('Secret Goblin');
  });
});
