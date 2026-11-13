import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldRules } from '../models/world';
import { WorldInfoBusiness } from './world-info.business';
import { WorldLibraryBusiness } from './world-library.business';
import { WorldSessionBusiness } from './world-session.business';

describe('economy world rules: selling (GM + player)', () => {
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  const session = () => gm.injector.get(WorldSessionBusiness);
  const rules = (changes: Partial<WorldRules> = {}): WorldRules => {
    const world = session().$world()!;
    return {
      attributes: world.attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
      startingStatPoints: world.startingStatPoints,
      startingMoney: world.startingMoney,
      levelCurve: world.levelCurve,
      maxLevel: world.maxLevel,
      statPointsPerLevel: world.statPointsPerLevel,
      startingSkillPoints: world.startingSkillPoints,
      skillPointsPerLevel: world.skillPointsPerLevel,
      offlineFeatures: world.offlineFeatures,
      ...changes,
    };
  };

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('starts a world with sell anywhere on, full price, merchants buying at 1 and paying 0.5', () => {
    expect(session().$world()).toMatchObject({
      sellAnywhere: true, sellAnywhereRatio: 1, merchantBuyRatio: 1, merchantSellRatio: 0.5,
    });
  });

  it('saves the four settings and tells the players what Sell anywhere does', async () => {
    await session().saveRules(
      rules({ sellAnywhere: false, sellAnywhereRatio: 0.25, merchantBuyRatio: 2, merchantSellRatio: 0.75 }),
    );
    await settle();

    expect(session().$world()).toMatchObject({
      sellAnywhere: false, sellAnywhereRatio: 0.25, merchantBuyRatio: 2, merchantSellRatio: 0.75,
    });
    expect(ada.injector.get(WorldInfoBusiness).$info()).toMatchObject({ sellAnywhere: false, sellAnywhereRatio: 0.25 });
  });

  it('refuses a ratio outside 0 to 10 and changes nothing', async () => {
    await expect(session().saveRules(rules({ merchantBuyRatio: 11 }))).rejects.toBeDefined();
    await expect(session().saveRules(rules({ sellAnywhereRatio: -1 }))).rejects.toBeDefined();

    expect(session().$world()!.merchantBuyRatio).toBe(1);
  });
});
