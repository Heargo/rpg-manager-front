import { Injectable, signal } from '@angular/core';
import { PackLanguage } from '../packs/pack';

/**
 * The packs of the world being played, for the generators and sprites. The world session sets it; `null` when no
 * world is open, so the generators use the Base of the app language.
 */
@Injectable({ providedIn: 'root' })
export class ActivePacksBusiness {
  private readonly worldPacks = signal<string[] | null>(null);

  private readonly language = signal<PackLanguage | null>(null);

  readonly $worldPacks = this.worldPacks.asReadonly();
  /** The language of the world being played; `null` when no world is open. */
  readonly $worldLanguage = this.language.asReadonly();

  set(packs: string[] | null, language: PackLanguage | null): void {
    this.worldPacks.set(packs);
    this.language.set(language);
  }
}
