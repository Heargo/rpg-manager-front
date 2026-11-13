import { Injectable } from '@angular/core';
import { fitWithin, isOpaque } from '../helpers/image-size';

export const DEFAULT_IMAGE_MAX_SIZE = 512;

/**
 * Browser image APIs: decode, shrink and re-encode as WebP. Safari can't encode WebP and returns PNG, often several
 * hundred KB for a photo: an opaque image becomes JPEG there instead, transparent ones stay PNG.
 */
@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  /** The pixel size of an image, decoded; rejects when the bytes are not an image. */
  async dimensions(file: Blob): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  async resize(file: Blob, max = DEFAULT_IMAGE_MAX_SIZE): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D canvas unavailable');
      context.drawImage(bitmap, 0, 0, width, height);
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
      if (webp.type === 'image/webp') return webp;
      // No WebP encoder (Safari): the browser silently returned PNG.
      if (!isOpaque(context.getImageData(0, 0, width, height).data)) return webp;
      const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
      return jpeg.size < webp.size ? jpeg : webp;
    } finally {
      bitmap.close();
    }
  }
}
