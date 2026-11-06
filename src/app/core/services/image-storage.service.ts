import { Injectable } from '@angular/core';
import { AppDatabase, openAppDatabase } from '../helpers/app-database';

/** Image blobs in IndexedDB, keyed by the SHA-256 of their bytes, so the same image is stored (and later sent) once. */
@Injectable({ providedIn: 'root' })
export class ImageStorageService {
  private database?: Promise<AppDatabase>;

  /** Stores the image and returns its id; storing the same bytes again returns the same id. */
  async put(blob: Blob): Promise<string> {
    const bytes = await blob.arrayBuffer();
    const id = await sha256Hex(bytes);
    const db = await this.db();
    if (!(await db.getKey('images', id))) {
      await db.put('images', { id, bytes, type: blob.type });
    }
    return id;
  }

  async get(id: string): Promise<Blob | undefined> {
    const stored = await (await this.db()).get('images', id);
    return stored ? new Blob([stored.bytes], { type: stored.type }) : undefined;
  }

  async has(id: string): Promise<boolean> {
    return (await (await this.db()).getKey('images', id)) !== undefined;
  }

  async delete(id: string): Promise<void> {
    await (await this.db()).delete('images', id);
  }

  private db(): Promise<AppDatabase> {
    this.database ??= openAppDatabase();
    return this.database;
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
