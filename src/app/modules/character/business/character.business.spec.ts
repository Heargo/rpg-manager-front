import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { ImageProcessingService } from '../../../core/services/image-processing.service';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { ImageTransferService } from '../../../core/services/image-transfer.service';
import { MemoryImageStorage } from '../../../../testing/memory-image-storage';
import { createPeerNetwork, flush } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { RoomBusiness } from '../../room/business/room.business';
import { HostLockService } from '../../room/services/host-lock.service';
import { RoomStorageService } from '../../room/services/room-storage.service';
import { RoomService } from '../../room/services/room.service';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { WorldService } from '../../world/services/world.service';
import { WorldStorageService } from '../../world/services/world-storage.service';
import { CharacterService } from '../services/character.service';
import { CharacterHostBusiness } from './character-host.business';
import { CharacterBusiness } from './character.business';

/** Everything a device runs, so each test device gets its own instances. */
const DEVICE = [
  RoomService,
  RoomStorageService,
  HostLockService,
  RoomHostBusiness,
  RoomBusiness,
  WorldService,
  WorldStorageService,
  WorldLibraryBusiness,
  WorldSessionBusiness,
  WorldInfoBusiness,
  CharacterService,
  CharacterHostBusiness,
  CharacterBusiness,
  GameSessionBusiness,
  ImageTransferService,
  ImageBusiness,
  { provide: ImageProcessingService, useValue: { resize: async (file: Blob) => file } },
  { provide: WordListBusiness, useValue: {} },
];

function device(net: ReturnType<typeof createPeerNetwork>, playerId: string, name: string) {
  const images = new MemoryImageStorage();
  const injector = net.device([
    ...DEVICE,
    { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } },
    { provide: ImageStorageService, useValue: images },
  ]);
  return { injector, images };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await flush();
  }
}

describe('character creation (host + players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: ReturnType<typeof device>;
  let ada: ReturnType<typeof device>;
  let bob: ReturnType<typeof device>;
  let worldId: string;

  async function join(player: EnvironmentInjector) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
  }

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }));
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = device(net, 'gm', 'Gm');
    ada = device(net, 'ada', 'Ada');
    bob = device(net, 'bob', 'Bob');
    [gm, ada, bob].forEach((d) => d.injector.get(GameSessionBusiness));

    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10 },
        { name: 'Strength', baseValue: 2 },
      ],
      startingStatPoints: 3,
      startingMoney: 20,
    });
    worldId = world.id;
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', worldId);
    await settle();
  });

  afterEach(() => {
    [gm, ada, bob].forEach((d) => d.injector.destroy());
    vi.unstubAllGlobals();
  });

  it('sends a new player to character creation, then creates the character from the world defaults', async () => {
    await join(ada.injector);
    const characters = ada.injector.get(CharacterBusiness);

    expect(ada.injector.get(WorldInfoBusiness).$info()?.name).toBe('Eldoria');
    expect(characters.$characters()).toEqual([]);
    expect(characters.$needsCharacter()).toBe(true);
    expect(characters.takeCreationOffer()).toBe(true);
    expect(characters.takeCreationOffer()).toBe(false);

    const portrait = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/webp' });
    const created = await characters.create('  Ada  the Bold ', portrait);
    await settle();

    expect(created).toMatchObject({ playerId: 'ada', name: 'Ada the Bold', statPoints: 3, money: 20, rev: 1 });
    expect(created.attributes.map((a) => a.current)).toEqual([10, 2]);
    expect(characters.$myCharacter()?.id).toBe(created.id);
    expect(characters.$needsCharacter()).toBe(false);

    // Saved in the host's world, which the game master sees too.
    const hostWorld = await gm.injector.get(WorldLibraryBusiness).get(worldId);
    expect(hostWorld?.characters.map((c) => c.name)).toEqual(['Ada the Bold']);
    expect(gm.injector.get(CharacterBusiness).$characters()?.map((c) => c.name)).toEqual(['Ada the Bold']);
    expect(gm.images.images.has(created.portraitId!)).toBe(true);
  });

  it('refuses a second character for the same player, with a readable reason', async () => {
    await join(ada.injector);
    const characters = ada.injector.get(CharacterBusiness);
    await characters.create('Ada');

    const error = await characters.create('Ada again').catch((e: unknown) => e);
    expect(characters.describeError(error)).toBe('You already have a character in this room.');
  });

  it("lets another player see a portrait they don't have, fetched from the host and checked", async () => {
    await join(ada.injector);
    await join(bob.injector);
    const created = await ada.injector.get(CharacterBusiness).create('Ada', new Blob([new Uint8Array([9, 8, 7])], { type: 'image/webp' }));
    await settle();
    expect(bob.images.images.has(created.portraitId!)).toBe(false);

    const url = await bob.injector.get(ImageBusiness).url(created.portraitId!);

    expect(url).toBe('blob:test');
    expect(bob.images.images.has(created.portraitId!)).toBe(true);
  });

  it('does not let the game master create a character', async () => {
    const error = await gm.injector.get(CharacterBusiness).create('GM').catch((e: unknown) => e);
    expect(gm.injector.get(CharacterBusiness).describeError(error)).toBe("The game master doesn't play a character.");
  });

  it('keeps characters across a host reload (game session reopens the world)', async () => {
    await join(ada.injector);
    await ada.injector.get(CharacterBusiness).create('Ada');
    await settle();

    gm.injector.destroy();
    gm = device(net, 'gm', 'Gm');
    gm.injector.get(GameSessionBusiness);
    await gm.injector.get(RoomBusiness).whenReady();
    await settle();

    expect(gm.injector.get(WorldSessionBusiness).$world()?.characters.map((c) => c.name)).toEqual(['Ada']);
    expect(gm.injector.get(CharacterBusiness).$characters()?.map((c) => c.name)).toEqual(['Ada']);
  });
});
