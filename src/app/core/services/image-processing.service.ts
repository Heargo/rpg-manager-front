import { Injectable } from '@angular/core';
import { fitWithin } from '../helpers/image-size';

export const DEFAULT_IMAGE_MAX_SIZE = 512;

/** Browser image APIs: decode, shrink and re-encode as WebP (PNG where WebP encoding isn't supported). */
@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  async resize(file: Blob, max = DEFAULT_IMAGE_MAX_SIZE): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D canvas unavailable');
      context.drawImage(bitmap, 0, 0, width, height);
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
      // Browsers that can't encode WebP silently return PNG; keep whatever came back.
      return webp;
    } finally {
      bitmap.close();
    }
  }
}
