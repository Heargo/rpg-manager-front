import { Injectable, signal } from '@angular/core';

/**
 * The packs of the world being played, for the generators and sprites. The world session sets it; `null` when no
 * world is open, so the generators use the Base of the app language.
 */
@Injectable({ providedIn: 'root' })
export class ActivePacksBusiness {
  private readonly worldPacks = signal<string[] | null>(null);

  readonly $worldPacks = this.worldPacks.asReadonly();

  set(packs: string[] | null): void {
    this.worldPacks.set(packs);
  }
}
