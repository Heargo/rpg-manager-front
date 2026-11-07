import { ImageStorageService } from '../app/core/services/image-storage.service';

/** One device's image store, in memory (each test device gets its own; IndexedDB is shared in tests). */
export class MemoryImageStorage implements Pick<ImageStorageService, 'put' | 'get' | 'has' | 'delete'> {
  readonly images = new Map<string, { bytes: ArrayBuffer; type: string }>();

  async put(blob: Blob): Promise<string> {
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const id = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    this.images.set(id, { bytes, type: blob.type });
    return id;
  }

  async get(id: string): Promise<Blob | undefined> {
    const image = this.images.get(id);
    return image ? new Blob([image.bytes], { type: image.type }) : undefined;
  }

  async has(id: string): Promise<boolean> {
    return this.images.has(id);
  }

  async delete(id: string): Promise<void> {
    this.images.delete(id);
  }
}
