import { effect, inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { DiceHostBusiness } from '../../dice/business/dice-host.business';
import { ItemHostBusiness } from '../../item/business/item-host.business';
import { TableHostBusiness } from '../../table/business/table-host.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';

/**
 * Host: while this device hosts a world's room (including after a reload), keeps that world open and the game's
 * request handlers running. Started at app launch.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionBusiness {
  private readonly room = inject(RoomBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly characters = inject(CharacterHostBusiness);
  private readonly images = inject(ImageBusiness);
  private readonly table = inject(TableHostBusiness);
  private readonly dice = inject(DiceHostBusiness);
  private readonly items = inject(ItemHostBusiness);

  private openWorldId: string | undefined;
  private stops: (() => void)[] = [];
  /** Bumped on every start/stop, so a slow open that's no longer wanted doesn't start handlers. */
  private generation = 0;

  constructor() {
    effect(() => {
      const worldId = this.room.$isHost() ? this.room.$room()?.worldId : undefined;
      if (worldId === this.openWorldId) return;
      this.stop();
      if (worldId) void this.start(worldId);
    });
  }

  private async start(worldId: string): Promise<void> {
    this.openWorldId = worldId;
    const generation = ++this.generation;
    try {
      await this.session.open(worldId);
    } catch (error) {
      console.error('Could not open the hosted world', error);
      return;
    }
    if (generation !== this.generation) return;
    this.stops = [this.characters.start(), this.table.start(), this.dice.start(), this.items.start(), this.images.serveToPlayers()];
  }

  private stop(): void {
    this.generation++;
    this.stops.forEach((stop) => stop());
    this.stops = [];
    if (this.openWorldId) this.session.close();
    this.openWorldId = undefined;
  }
}
