import { computed, inject, Injectable, signal } from '@angular/core';
import { JoinedWorld } from '../models/joined-world';
import { JoinedWorldsStorageService } from '../services/joined-worlds-storage.service';

/** Player: the worlds joined on this device, kept locally so they can be listed and rejoined offline. */
@Injectable({ providedIn: 'root' })
export class JoinedWorldsBusiness {
  private readonly storage = inject(JoinedWorldsStorageService);
  private readonly worlds = signal<JoinedWorld[]>([]);

  /** Latest seen first. */
  readonly $worlds = computed(() =>
    [...this.worlds()].sort((a, b) => b.lastSeenAt - a.lastSeenAt),
  );

  async load(): Promise<void> {
    try {
      const stored = await this.storage.list();
      // Entries recorded while loading win over older stored ones (newest lastSeenAt per world).
      this.worlds.update((current) => {
        const merged = new Map(stored.map((w) => [w.worldId, w]));
        for (const w of current) {
          const other = merged.get(w.worldId);
          if (!other || w.lastSeenAt >= other.lastSeenAt)
            merged.set(w.worldId, w);
        }
        return [...merged.values()];
      });
    } catch (error) {
      console.warn('Could not load the joined worlds', error);
    }
  }

  /** Saves the world as seen now; a world already known (same id) is replaced. */
  async record(entry: Omit<JoinedWorld, 'lastSeenAt'>): Promise<void> {
    const world: JoinedWorld = { ...entry, lastSeenAt: Date.now() };
    this.worlds.update((worlds) => [
      ...worlds.filter((w) => w.worldId !== world.worldId),
      world,
    ]);
    await this.storage.save(world);
  }

  async remove(worldId: string): Promise<void> {
    this.worlds.update((worlds) => worlds.filter((w) => w.worldId !== worldId));
    await this.storage.delete(worldId);
  }
}
