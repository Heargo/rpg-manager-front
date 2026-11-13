import { Injectable } from '@angular/core';
import {
  DetectedShape,
  DetectOptions,
  detectShapes,
} from '../helpers/shape-detection';
import { SpriteImage } from '../models/sprite';

/** Runs shape detection in a Web Worker so a large image does not freeze the page; inline where workers do not exist. */
@Injectable({ providedIn: 'root' })
export class SpriteShapeService {
  detect(image: SpriteImage, options: DetectOptions): Promise<DetectedShape[]> {
    if (typeof Worker === 'undefined')
      return Promise.resolve(detectShapes(image, options));
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./shape-detection.worker', import.meta.url),
        { type: 'module' },
      );
      worker.onmessage = ({ data }: MessageEvent<DetectedShape[]>) => {
        worker.terminate();
        resolve(data);
      };
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };
      worker.postMessage({ image, options });
    });
  }
}
