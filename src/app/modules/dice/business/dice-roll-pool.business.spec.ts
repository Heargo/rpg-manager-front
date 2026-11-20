import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { gameDevice, settle } from '../../../../testing/game-device';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { DiceRollBusiness } from './dice-roll.business';

const pool = [
  { sides: 6, count: 2 },
  { sides: 4, count: 1 },
];

describe('dice pool rolls (host + player)', () => {
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
    const worldId = (await gm.injector.get(WorldLibraryBusiness).create({ name: 'Eldoria', attributes: [] })).id;
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', worldId);
    await settle();
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
  });

  afterEach(() => {
    [gm, ada].forEach((d) => d.injector.destroy());
  });

  it('rolls a mixed pool with a modifier on this device', () => {
    const dice = ada.injector.get(DiceRollBusiness);

    const roll = dice.rollPool(pool, 3);

    expect(roll.groups.map((g) => g.sides)).toEqual([6, 4]);
    expect(roll.groups.map((g) => g.values.length)).toEqual([2, 1]);
    expect(roll.groups[0].values.every((v) => v >= 1 && v <= 6)).toBe(true);
    expect(roll.groups[1].values.every((v) => v >= 1 && v <= 4)).toBe(true);
    expect(roll.modifier).toBe(3);
    const sum = roll.groups.flatMap((g) => g.values).reduce((a, b) => a + b, 0);
    expect(roll.total).toBe(sum + 3);
    expect(roll.notation).toBe('2d6+1d4+3');
  });

  it('throws every die of the pool in the 3D plan', () => {
    const dice = ada.injector.get(DiceRollBusiness);

    const roll = dice.rollPool(pool, 3);

    expect(roll.plan.dice).toHaveLength(3);
    expect(roll.plan.dice.map((d) => d.value)).toEqual(roll.groups.flatMap((g) => g.values));
  });

  it('keeps the full notation in the history, newest first', () => {
    const dice = ada.injector.get(DiceRollBusiness);

    dice.rollPool([{ sides: 20, count: 1 }], 0);
    const roll = dice.rollPool(pool, -2);

    expect(dice.$current()).toBe(roll);
    expect(dice.$history().map((r) => r.notation)).toEqual(['2d6+1d4-2', '1d20']);
  });

  it('shares the pool and the modifier with the table: the host draws and the player sees the same breakdown', async () => {
    const adaDice = ada.injector.get(DiceRollBusiness);
    const gmDice = gm.injector.get(DiceRollBusiness);
    adaDice.$shareWithTable.set(true);

    const roll = await adaDice.rollPoolAtTable(pool, 3);
    await settle();

    expect(roll.shared).toEqual({ name: 'Ada', mine: true });
    expect(roll.notation).toBe('2d6+1d4+3');
    expect(roll.groups.map((g) => g.values.length)).toEqual([2, 1]);
    const [onTable] = gmDice.$tableRolls()!;
    expect(onTable).toMatchObject({
      id: roll.id,
      by: { playerId: 'ada', name: 'Ada' },
      modifier: 3,
      pool: roll.groups,
    });

    const seen = gmDice.presentShared(onTable);
    expect(seen.notation).toBe('2d6+1d4+3');
    expect(seen.groups).toEqual(roll.groups);
    expect(seen.modifier).toBe(3);
    expect(seen.total).toBe(roll.total);
    expect(seen.plan.dice).toHaveLength(3);
  });
});
