import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { CharacterBusiness } from '../../character/business/character.business';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldRules } from '../models/world';
import { WorldInfoBusiness } from './world-info.business';
import { WorldLibraryBusiness } from './world-library.business';
import { WorldSessionBusiness } from './world-session.business';

const linear = { preset: 'linear', step: 1 } as const;

describe('saving the world rules (GM + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
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
      offlineFeatures: world.offlineFeatures,
      ...changes,
    };
  };
  const mine = () => ada.injector.get(CharacterBusiness).$myCharacter()!;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: linear },
        { name: 'Mana', baseValue: 5, formula: linear },
      ],
      levelCurve: { preset: 'growing' },
      maxLevel: 20,
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await ada.injector.get(CharacterBusiness).create('Ada');
    await settle();
    // 500 XP is level 3 on the growing curve (200 + 300)
    await session().update((w) => ({ ...w, characters: w.characters.map((c) => ({ ...c, xp: 500, level: 3 })) }));
    await settle();
  });

  afterEach(() => [gm, ada].forEach((d) => d.injector.destroy()));

  it('stores the world and republishes world/info to the players', async () => {
    await session().saveRules(rules({ startingStatPoints: 9, startingMoney: 250, maxLevel: 15 }));
    await settle();

    expect(session().$world()).toMatchObject({ startingStatPoints: 9, startingMoney: 250, maxLevel: 15 });
    expect(ada.injector.get(WorldInfoBusiness).$info()).toMatchObject({ startingStatPoints: 9, startingMoney: 250, maxLevel: 15 });
  });

  it('gives players their recomputed sheet', async () => {
    await session().saveRules(rules({ levelCurve: { preset: 'flat' } }));
    await settle();

    // flat: 100 XP per level, so 500 XP is level 6
    expect(mine()).toMatchObject({ xp: 500, level: 6 });
  });

  it('removes a deleted attribute from the players sheets and from world/info', async () => {
    const mana = session().$world()!.attributes.find((a) => a.name === 'Mana')!;
    await session().saveRules(rules({ attributes: rules().attributes.filter((a) => a.id !== mana.id) }));
    await settle();

    expect(ada.injector.get(WorldInfoBusiness).$info()!.attributes.map((a) => a.name)).toEqual(['Life']);
    expect(mine().attributes.map((a) => a.attributeId)).not.toContain(mana.id);
  });

  it('refuses invalid rules with the wizard validation and changes nothing', async () => {
    await expect(session().saveRules(rules({ maxLevel: 1 }))).rejects.toBeDefined();
    await expect(session().saveRules(rules({ levelCurve: { preset: 'custom', expression: 'level +' } }))).rejects.toBeDefined();
    await settle();

    expect(session().$world()!.maxLevel).toBe(20);
    expect(ada.injector.get(WorldInfoBusiness).$info()!.maxLevel).toBe(20);
  });
});
