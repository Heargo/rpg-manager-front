import { TestBed } from '@angular/core/testing';
import { WorldLibraryBusiness } from '../app/modules/world/business/world-library.business';
import { WorldSessionBusiness } from '../app/modules/world/business/world-session.business';
import { World } from '../app/modules/world/models/world';

/** Opens a world whose active packs are `packs`, in the world session the generators read their packs from. */
export async function openWorldWithPacks(packs: string[]): Promise<World> {
  const world = await TestBed.inject(WorldLibraryBusiness).create({ name: 'Eldoria', attributes: [], packs });
  return TestBed.inject(WorldSessionBusiness).open(world.id);
}
