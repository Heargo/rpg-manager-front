import { Injectable } from '@angular/core';
import {
  AppDatabase,
  openAppDatabase,
} from '../../../core/helpers/app-database';
import { SpriteSet } from '../models/sprite-set';

/** IndexedDB for the sprite sets saved on this device (not per world). */
@Injectable({ providedIn: 'root' })
export class SpriteSetStorageService {
  private database?: Promise<AppDatabase>;

  /** Every saved set, the latest changed first. */
  async list(): Promise<SpriteSet[]> {
    const sets = (await (
      await this.db()
    ).getAll('spriteSets')) as unknown as SpriteSet[];
    return sets.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async save(set: SpriteSet): Promise<void> {
    await (
      await this.db()
    ).put('spriteSets', set as unknown as { id: string } & Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('spriteSets', id);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
