import { Injectable } from '@angular/core';
import {
  AppDatabase,
  openAppDatabase,
} from '../../../core/helpers/app-database';
import { Character } from '../../world/models/world';

/** IndexedDB: the player's own copy of their character, one per room. */
@Injectable({ providedIn: 'root' })
export class PlayerCopyStorageService {
  private database?: Promise<AppDatabase>;

  async load(roomId: string): Promise<Character | undefined> {
    const record = await (await this.db()).get('playerCopies', roomId);
    return record?.character as unknown as Character | undefined;
  }

  async save(roomId: string, character: Character): Promise<void> {
    await (
      await this.db()
    ).put('playerCopies', {
      roomId,
      character: character as unknown as Record<string, unknown>,
    });
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
