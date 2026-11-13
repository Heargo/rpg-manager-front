import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../helpers/app-database';
import { Pack } from '../packs/pack';

/** An official pack downloaded on this device. */
export interface StoredPack {
  id: string;
  manifest: Pack;
  source: 'official';
  enabled: boolean;
  installedAt: number;
  size: number;
}

/** A pack file as stored: raw bytes for images (structured-clone safe), parsed JSON otherwise. */
export type StoredPackFile =
  | { kind: 'blob'; bytes: ArrayBuffer; type: string }
  | { kind: 'json'; value: unknown };

/** Downloaded official packs and their files in IndexedDB. */
@Injectable({ providedIn: 'root' })
export class PackStorageService {
  private database?: Promise<AppDatabase>;

  async list(): Promise<StoredPack[]> {
    return (await (await this.db()).getAll('packs')) as unknown as StoredPack[];
  }

  /** Stores the pack and all its files in one transaction. */
  async install(
    pack: StoredPack,
    files: Map<string, StoredPackFile>,
  ): Promise<void> {
    const tx = (await this.db()).transaction(
      ['packs', 'packFiles'],
      'readwrite',
    );
    const packs = tx.objectStore('packs');
    const store = tx.objectStore('packFiles');
    void packs.put(pack as unknown as { id: string });
    for (const [path, file] of files)
      void store.put(file, `${pack.id}/${path}`);
    await tx.done;
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const db = await this.db();
    const stored = await db.get('packs', id);
    if (stored) await db.put('packs', { ...stored, enabled });
  }

  async getFile(
    packId: string,
    path: string,
  ): Promise<StoredPackFile | undefined> {
    return (await (await this.db()).get('packFiles', `${packId}/${path}`)) as
      StoredPackFile | undefined;
  }

  /** Deletes the pack and every file under its id. */
  async remove(id: string): Promise<void> {
    const tx = (await this.db()).transaction(
      ['packs', 'packFiles'],
      'readwrite',
    );
    void tx.objectStore('packs').delete(id);
    void tx
      .objectStore('packFiles')
      .delete(IDBKeyRange.bound(`${id}/`, `${id}/￿`));
    await tx.done;
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}
