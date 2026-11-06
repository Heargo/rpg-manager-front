import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../../../core/helpers/app-database';
import { World } from '../models/world';

/** Worlds in IndexedDB. Stores and returns whole worlds; summaries and rules live in the business. */
@Injectable({ providedIn: 'root' })
export class WorldStorageService {
  private database?: Promise<AppDatabase>;

  async list(): Promise<World[]> {
    return (await (await this.db()).getAll('worlds')) as unknown as World[];
  }

  async get(id: string): Promise<World | undefined> {
    return (await (await this.db()).get('worlds', id)) as unknown as World | undefined;
  }

  async put(world: World): Promise<void> {
    await (await this.db()).put('worlds', world as unknown as { id: string } & Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('worlds', id);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
