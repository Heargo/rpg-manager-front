import { inject, Injectable } from '@angular/core';
import { PeerApi, PeerHandler } from '../p2p/peer-api.service';

export const IMAGE_ROUTES = { get: 'image/get' } as const;

export interface ImageGetRequest {
  id: string;
}

export interface TransferredImage {
  type: string;
  data: string;
}

/** Images between devices in a room: players ask the host for an image they don't have yet. */
@Injectable({ providedIn: 'root' })
export class ImageTransferService {
  private readonly api = inject(PeerApi);

  /** True on a player connected to a host (the only case where fetching makes sense). */
  canFetch(): boolean {
    return this.api.$role() === 'client' && this.api.$hostOnline();
  }

  fetch(id: string): Promise<TransferredImage> {
    return this.api.request<TransferredImage, ImageGetRequest>(IMAGE_ROUTES.get, { id }, 20_000);
  }

  serve(handler: PeerHandler<unknown, TransferredImage>): () => void {
    return this.api.serve(IMAGE_ROUTES.get, handler);
  }
}
