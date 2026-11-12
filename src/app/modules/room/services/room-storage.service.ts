import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../../../core/helpers/app-database';
import { HostedRoomRecord } from '../models/room';

const CURRENT = 'current';

/** IndexedDB for rooms: the one this device hosts. */
@Injectable({ providedIn: 'root' })
export class RoomStorageService {
  private database?: Promise<AppDatabase>;

  async loadHosted(): Promise<HostedRoomRecord | undefined> {
    return (await (await this.db()).get('hostedRoom', CURRENT)) as unknown as HostedRoomRecord | undefined;
  }

  async saveHosted(record: HostedRoomRecord): Promise<void> {
    await (await this.db()).put('hostedRoom', record as unknown as Record<string, unknown>, CURRENT);
  }

  async clearHosted(): Promise<void> {
    await (await this.db()).delete('hostedRoom', CURRENT);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
