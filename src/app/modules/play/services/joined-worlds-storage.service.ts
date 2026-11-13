import { Injectable } from '@angular/core';
import {
  AppDatabase,
  openAppDatabase,
} from '../../../core/helpers/app-database';
import { JoinedWorld } from '../models/joined-world';

/** IndexedDB for the worlds this device joined as a player, by world id. */
@Injectable({ providedIn: 'root' })
export class JoinedWorldsStorageService {
  private database?: Promise<AppDatabase>;

  async list(): Promise<JoinedWorld[]> {
    return (await (
      await this.db()
    ).getAll('joinedWorlds')) as unknown as JoinedWorld[];
  }

  async save(world: JoinedWorld): Promise<void> {
    await (
      await this.db()
    ).put(
      'joinedWorlds',
      world as unknown as { worldId: string } & Record<string, unknown>,
    );
  }

  async delete(worldId: string): Promise<void> {
    await (await this.db()).delete('joinedWorlds', worldId);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
