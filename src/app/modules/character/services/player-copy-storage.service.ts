import { Injectable } from '@angular/core';
import {
  AppDatabase,
  openAppDatabase,
} from '../../../core/helpers/app-database';
import { Character } from '../../world/models/world';
import { QueuedAction } from '../models/player-copy';

/** The saved copy with the actions queued while the host was offline. */
export interface StoredPlayerCopy {
  character: Character;
  queue: QueuedAction[];
}

/** IndexedDB: the player's own copy of their character, one per room. */
@Injectable({ providedIn: 'root' })
export class PlayerCopyStorageService {
  private database?: Promise<AppDatabase>;

  async load(roomId: string): Promise<StoredPlayerCopy | undefined> {
    const record = await (await this.db()).get('playerCopies', roomId);
    if (!record) return undefined;
    return {
      character: record.character as unknown as Character,
      queue: (record.queue ?? []) as QueuedAction[],
    };
  }

  async save(
    roomId: string,
    character: Character,
    queue: QueuedAction[] = [],
  ): Promise<void> {
    await (
      await this.db()
    ).put('playerCopies', {
      roomId,
      character: character as unknown as Record<string, unknown>,
      queue,
    });
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
