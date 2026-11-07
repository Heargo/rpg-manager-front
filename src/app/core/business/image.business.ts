import { inject, Injectable } from '@angular/core';
import { base64ToBytes, bytesToBase64 } from '../helpers/base64';
import { DEFAULT_IMAGE_MAX_SIZE, ImageProcessingService } from '../services/image-processing.service';
import { ImageStorageService } from '../services/image-storage.service';
import { ImageTransferService } from '../services/image-transfer.service';
import { PeerApiError } from '../p2p/helpers/peer-api-error';

export interface Base64Image {
  type: string;
  data: string;
}

/** Images used by every feature (world icons, portraits, items, illustrations): stored once, by content hash. */
@Injectable({ providedIn: 'root' })
export class ImageBusiness {
  private readonly storage = inject(ImageStorageService);
  private readonly processing = inject(ImageProcessingService);
  private readonly transfer = inject(ImageTransferService);
  private readonly urls = new Map<string, string>();
  private readonly fetching = new Map<string, Promise<boolean>>();

  /** Shrinks an uploaded file (max 512 px, WebP) and stores it. Returns its id. */
  async storeUpload(file: Blob, max = DEFAULT_IMAGE_MAX_SIZE): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Not an image');
    return this.storage.put(await this.processing.resize(file, max));
  }

  /** A URL to show the image in an `<img>`; created once per id and kept for the session. */
  async url(id: string): Promise<string | undefined> {
    const cached = this.urls.get(id);
    if (cached) return cached;
    let blob = await this.storage.get(id);
    if (!blob && (await this.fetchFromHost(id))) blob = await this.storage.get(id);
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

  /**
   * Host: answers players' `image/get` requests from this device's store. Returns a function that stops serving.
   * Only ids that exist are served, and an id is a hash, so a player can only get images it already knows about.
   */
  serveToPlayers(): () => void {
    return this.transfer.serve(async (payload) => {
      const id = (payload as { id?: unknown } | null)?.id;
      if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) throw new PeerApiError('invalid', 'Bad image id');
      const image = await this.toBase64(id);
      if (!image) throw new PeerApiError('not-found', 'No such image');
      return image;
    });
  }

  /** Player: gets a missing image from the host, keeps it only if its bytes match the id. One request per id at a time. */
  private fetchFromHost(id: string): Promise<boolean> {
    if (!this.transfer.canFetch()) return Promise.resolve(false);
    let pending = this.fetching.get(id);
    if (!pending) {
      pending = this.transfer
        .fetch(id)
        .then(async (image) => (await this.fromBase64(image)) === id)
        .catch(() => false)
        .finally(() => this.fetching.delete(id));
      this.fetching.set(id, pending);
    }
    return pending;
  }

  /** Stores an image from base64 (export files, peers) and returns its id, computed from the bytes. */
  async fromBase64(image: Base64Image): Promise<string> {
    return this.storage.put(new Blob([base64ToBytes(image.data) as BlobPart], { type: image.type }));
  }
}
