import { inject, Injectable } from '@angular/core';
import { base64ToBytes, bytesToBase64 } from '../helpers/base64';
import { DEFAULT_IMAGE_MAX_SIZE, ImageProcessingService } from '../services/image-processing.service';
import { ImageStorageService } from '../services/image-storage.service';

export interface Base64Image {
  type: string;
  data: string;
}

/** Images used by every feature (world icons, portraits, items, illustrations): stored once, by content hash. */
@Injectable({ providedIn: 'root' })
export class ImageBusiness {
  private readonly storage = inject(ImageStorageService);
  private readonly processing = inject(ImageProcessingService);
  private readonly urls = new Map<string, string>();

  /** Shrinks an uploaded file (max 512 px, WebP) and stores it. Returns its id. */
  async storeUpload(file: Blob, max = DEFAULT_IMAGE_MAX_SIZE): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Not an image');
    return this.storage.put(await this.processing.resize(file, max));
  }

  /** A URL to show the image in an `<img>`; created once per id and kept for the session. */
  async url(id: string): Promise<string | undefined> {
    const cached = this.urls.get(id);
    if (cached) return cached;
    const blob = await this.storage.get(id);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    this.urls.set(id, url);
    return url;
  }

  async toBase64(id: string): Promise<Base64Image | undefined> {
    const blob = await this.storage.get(id);
    if (!blob) return undefined;
    return { type: blob.type, data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) };
  }

  /** Stores an image from base64 (export files, peers) and returns its id, computed from the bytes. */
  async fromBase64(image: Base64Image): Promise<string> {
    return this.storage.put(new Blob([base64ToBytes(image.data) as BlobPart], { type: image.type }));
  }
}
