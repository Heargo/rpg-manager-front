import { computed, inject, Injectable } from '@angular/core';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';

/** The "Play" hub: the worlds this device hosts and the rooms it joined, tying the world and room features together. */
@Injectable({ providedIn: 'root' })
export class PlayBusiness {
  private readonly worlds = inject(WorldLibraryBusiness);
  private readonly room = inject(RoomBusiness);

  readonly $worlds = this.worlds.$worlds;
  readonly $joinedRooms = this.room.$recentRooms;
  readonly $roomStatus = this.room.$status;
  readonly $roomName = computed(() => this.room.$room()?.name);
  /** The world whose room is open on this device, if any. */
  readonly $hostedWorldId = computed(() => (this.room.$isHost() ? this.room.$room()?.worldId : undefined));

  load(): Promise<void> {
    return this.worlds.load();
  }

  /** Opens a room for the world. Resolves false when another tab is already hosting. */
  async hostWorld(worldId: string): Promise<boolean> {
    const world = await this.worlds.get(worldId);
    if (!world) throw new Error(`World ${worldId} not found`);
    return this.room.hostRoom(world.name, world.id);
  }

  /** Deletes a world, closing its room first if it's the one open. */
  async deleteWorld(worldId: string): Promise<void> {
    if (this.$hostedWorldId() === worldId) this.room.leave();
    await this.worlds.remove(worldId);
  }

  async exportWorld(worldId: string): Promise<{ blob: Blob; fileName: string }> {
    const world = await this.worlds.get(worldId);
    const blob = await this.worlds.exportWorld(worldId);
    const slug =
      (world?.name ?? 'world')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'world';
    return { blob, fileName: `${slug}.rpg-world.json` };
  }

  importWorld(text: string): Promise<unknown> {
    return this.worlds.importWorld(text);
  }

  forgetRoom(roomId: string): Promise<void> {
    return this.room.forgetRecentRoom(roomId);
  }

  describeError(error: unknown): string {
    return this.room.describeError(error);
  }
}
