import { inject, Injectable, signal } from '@angular/core';
import { toWorldInfo } from '../helpers/world.factory';
import { World } from '../models/world';
import { WorldService } from '../services/world.service';
import { WorldLibraryBusiness } from './world-library.business';

/**
 * Host: the world being played, in memory. Changes go through `update()`, one at a time (requests from several
 * players can arrive together), are saved, and the world's public info is published.
 */
@Injectable({ providedIn: 'root' })
export class WorldSessionBusiness {
  private readonly library = inject(WorldLibraryBusiness);
  private readonly service = inject(WorldService);

  private readonly world = signal<World | null>(null);
  private queue: Promise<unknown> = Promise.resolve();

  readonly $world = this.world.asReadonly();

  async open(worldId: string): Promise<World> {
    const world = await this.library.get(worldId);
    if (!world) throw new Error(`World ${worldId} not found`);
    this.world.set(world);
    this.service.publishInfo(toWorldInfo(world));
    return world;
  }

  close(): void {
    this.world.set(null);
  }

  /** Applies a change to the open world and saves it. Runs after any change already in progress. */
  update(change: (world: World) => World | Promise<World>): Promise<World> {
    const run = this.queue.then(async () => {
      const current = this.world();
      if (!current) throw new Error('No world is open');
      const saved = await this.library.save(await change(current));
      // The world may have been closed while saving.
      if (this.world()?.id === saved.id) {
        this.world.set(saved);
        this.service.publishInfo(toWorldInfo(saved));
      }
      return saved;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
