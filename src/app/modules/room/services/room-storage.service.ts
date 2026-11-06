import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../../../core/helpers/app-database';
import { HostedRoomRecord, JoinedRoomRecord } from '../models/room';

const CURRENT = 'current';

/** IndexedDB for rooms: the one this device hosts, and the ones it joined. */
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

  async listJoined(): Promise<JoinedRoomRecord[]> {
    return (await (await this.db()).getAll('joinedRooms')) as unknown as JoinedRoomRecord[];
  }

  async saveJoined(record: JoinedRoomRecord): Promise<void> {
    await (await this.db()).put('joinedRooms', record as unknown as { id: string } & Record<string, unknown>);
  }

  async deleteJoined(id: string): Promise<void> {
    await (await this.db()).delete('joinedRooms', id);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
