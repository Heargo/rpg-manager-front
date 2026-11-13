import { Injectable } from '@angular/core';
import { SpriteImage } from '../models/sprite';

/** Browser plumbing: decode an image file, encode PNG, trigger a download. */
@Injectable({ providedIn: 'root' })
export class SpriteFileService {
  /** Downloads an image of the app (a bundled sprite) and decodes it. */
  async fetchImage(url: string): Promise<SpriteImage> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot load ${url}`);
    return this.decode(await response.blob());
  }

  async decode(file: Blob): Promise<SpriteImage> {
    const bitmap = await createImageBitmap(file, { premultiplyAlpha: 'none' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { width, height, data } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return { width, height, data };
  }

  encodePng(image: SpriteImage): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas
      .getContext('2d')!
      .putImageData(
        new ImageData(
          new Uint8ClampedArray(image.data),
          image.width,
          image.height,
        ),
        0,
        0,
      );
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('PNG export failed')),
        'image/png',
      ),
    );
  }

  readText(file: Blob): Promise<string> {
    return file.text();
  }

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
