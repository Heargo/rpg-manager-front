import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { DiceRollBusiness } from '../../dice/business/dice-roll.business';
import { DiceService } from '../../dice/services/dice.service';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { TableService } from '../services/table.service';
import { NOTES_SAVE_DELAY_MS, TableBusiness } from './table.business';
import { gameDevice, settle } from '../../../../testing/game-device';

const device = gameDevice;

describe('game table (host + player)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof device>;
  let ada: ReturnType<typeof device>;
  let worldId: string;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }),
    );
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = device(net, 'gm', 'Gm');
    ada = device(net, 'ada', 'Ada');
    [gm, ada].forEach((d) => d.injector.get(GameSessionBusiness));

    worldId = (
      await gm.injector
        .get(WorldLibraryBusiness)
        .create({
          name: 'Eldoria',
          attributes: [{ name: 'Life', baseValue: 10 }],
        })
    ).id;
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', worldId);
    await settle();

    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await ada.injector
      .get(RoomBusiness)
      .join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
  });

  afterEach(() => {
    [gm, ada].forEach((d) => d.injector.destroy());
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows a quick image to every player, who fetches it from the host', async () => {
    const table = gm.injector.get(TableBusiness);

    await table.addQuickImage(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
    );
    await settle();

    const [imageId] = table.$quickImageIds();
    expect(imageId).toMatch(/^[0-9a-f]{64}$/);
    expect(gm.injector.get(TableBusiness).$scene()).toEqual({
      illustrationId: imageId,
    });
    expect(ada.injector.get(TableBusiness).$scene()).toEqual({
      illustrationId: imageId,
    });
    expect(await ada.injector.get(ImageBusiness).url(imageId)).toBe(
      'blob:test',
    );
    expect(ada.images.images.has(imageId)).toBe(true);
    expect(
      (await gm.injector.get(WorldLibraryBusiness).get(worldId))
        ?.illustrationId,
    ).toBe(imageId);

    await table.showIllustration(null);
    await table.removeQuickImage(imageId);
    await settle();
    expect(ada.injector.get(TableBusiness).$scene()).toEqual({});
    expect(table.$quickImageIds()).toEqual([]);
  });

  it('refuses table actions from players and images the host does not have', async () => {
    const id = 'a'.repeat(64);
    await expect(
      ada.injector.get(TableService).showIllustration(null),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      ada.injector.get(TableService).saveNotes('hacked'),
    ).rejects.toBeInstanceOf(PeerApiError);
    await expect(
      gm.injector.get(TableBusiness).showIllustration(id),
    ).rejects.toMatchObject({
      message: 'table.errors.imageMissing',
    });
  });

  it('saves the notes once typing pauses', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const table = gm.injector.get(TableBusiness);

    table.editNotes('Goblins');
    table.editNotes('Goblins at the bridge');
    expect(table.$notesState()).toBe('editing');
    await vi.advanceTimersByTimeAsync(NOTES_SAVE_DELAY_MS);
    vi.useRealTimers();
    await settle();

    expect(table.$notesState()).toBe('saved');
    expect(table.$savedNotes()).toBe('Goblins at the bridge');
    expect(
      (await gm.injector.get(WorldLibraryBusiness).get(worldId))?.notes,
    ).toBe('Goblins at the bridge');
  });

  it('shares a roll drawn by the host with the whole table', async () => {
    const adaDice = ada.injector.get(DiceRollBusiness);
    const gmDice = gm.injector.get(DiceRollBusiness);
    expect(adaDice.$canShare()).toBe(true);

    adaDice.$shareWithTable.set(true);
    const roll = await adaDice.rollAtTable(3, 6);
    await settle();

    expect(roll.shared).toEqual({ name: 'Ada', mine: true });
    expect(roll.values.every((value) => value >= 1 && value <= 6)).toBe(true);
    const [onTable] = gmDice.$tableRolls()!;
    expect(onTable).toMatchObject({
      id: roll.id,
      by: { playerId: 'ada', name: 'Ada' },
      values: roll.values,
    });
    expect(adaDice.takeUnseenTableRoll()).toBeNull();

    const seen = gmDice.takeUnseenTableRoll()!;
    expect(seen.id).toBe(roll.id);
    expect(gmDice.takeUnseenTableRoll()).toBeNull();
    const replayed = gmDice.presentShared(seen);
    expect(replayed.plan).toEqual(roll.plan);
    expect(replayed.shared).toEqual({ name: 'Ada', mine: false });
  });

  it('rolls on the device only while sharing is off', async () => {
    const adaDice = ada.injector.get(DiceRollBusiness);

    const roll = await adaDice.rollAtTable(1, 20);
    await settle();

    expect(roll.shared).toBeUndefined();
    expect(gm.injector.get(DiceRollBusiness).$tableRolls()).toEqual([]);
    await expect(
      ada.injector.get(DiceService).roll({ count: 0, sides: 6 }),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
});
