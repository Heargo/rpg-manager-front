import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../app/core/business/image.business';
import { ProfileBusiness } from '../app/core/business/profile.business';
import { WordListBusiness } from '../app/core/business/word-list.business';
import { ImageProcessingService } from '../app/core/services/image-processing.service';
import { ImageStorageService } from '../app/core/services/image-storage.service';
import { ImageTransferService } from '../app/core/services/image-transfer.service';
import { CharacterHostBusiness } from '../app/modules/character/business/character-host.business';
import { CharacterBusiness } from '../app/modules/character/business/character.business';
import { CharacterService } from '../app/modules/character/services/character.service';
import { DiceHostBusiness } from '../app/modules/dice/business/dice-host.business';
import { DiceRollBusiness } from '../app/modules/dice/business/dice-roll.business';
import { DiceService } from '../app/modules/dice/services/dice.service';
import { GameSessionBusiness } from '../app/modules/play/business/game-session.business';
import { RoomHostBusiness } from '../app/modules/room/business/room-host.business';
import { RoomBusiness } from '../app/modules/room/business/room.business';
import { HostLockService } from '../app/modules/room/services/host-lock.service';
import { RoomStorageService } from '../app/modules/room/services/room-storage.service';
import { RoomService } from '../app/modules/room/services/room.service';
import { ItemHostBusiness } from '../app/modules/item/business/item-host.business';
import { ItemService } from '../app/modules/item/services/item.service';
import { TableHostBusiness } from '../app/modules/table/business/table-host.business';
import { TableBusiness } from '../app/modules/table/business/table.business';
import { TableService } from '../app/modules/table/services/table.service';
import { WorldInfoBusiness } from '../app/modules/world/business/world-info.business';
import { WorldLibraryBusiness } from '../app/modules/world/business/world-library.business';
import { WorldSessionBusiness } from '../app/modules/world/business/world-session.business';
import { WorldService } from '../app/modules/world/services/world.service';
import { WorldStorageService } from '../app/modules/world/services/world-storage.service';
import { MemoryImageStorage } from './memory-image-storage';
import { createPeerNetwork, flush } from './peer-network';

/**
 * Everything one device of a room runs (room, world, characters, table, dice, game session), so each test device
 * gets its own instances. Add new per-device services here.
 */
const GAME_DEVICE = [
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
  TableService,
  TableHostBusiness,
  TableBusiness,
  DiceService,
  DiceHostBusiness,
  DiceRollBusiness,
  ItemService,
  ItemHostBusiness,
  GameSessionBusiness,
  ImageTransferService,
  ImageBusiness,
  {
    provide: ImageProcessingService,
    useValue: { resize: async (file: Blob) => file },
  },
  { provide: WordListBusiness, useValue: {} },
];

/** One app instance on the fake network, with its own profile and in-memory image store. */
export function gameDevice(
  net: ReturnType<typeof createPeerNetwork>,
  playerId: string,
  name: string,
) {
  const images = new MemoryImageStorage();
  const injector = net.device([
    ...GAME_DEVICE,
    {
      provide: ProfileBusiness,
      useValue: { $profile: signal({ playerId, name }) },
    },
    { provide: ImageStorageService, useValue: images },
  ]);
  return { injector, images };
}

/** Lets effects, messages and saves run. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await flush();
  }
}
