import { Injectable } from '@angular/core';
import { pickDecoder } from '../helpers/qr-scan.rules';

export class QrScanError extends Error {
  constructor(readonly reason: 'denied' | 'no-camera') {
    super(`QR scan unavailable (${reason})`);
  }
}

export interface QrScanSession {
  stop(): void;
}

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = (new (options: { formats: string[] }) => Detector) & {
  getSupportedFormats?: () => Promise<string[]>;
};

/** Reads QR codes from the rear camera: `BarcodeDetector` when it reads QR, else `jsqr` (loaded on first use). */
@Injectable({ providedIn: 'root' })
export class QrScannerService {
  async start(
    video: HTMLVideoElement,
    onText: (text: string) => void,
  ): Promise<QrScanSession> {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    )
      throw new QrScanError('no-camera');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (error) {
      const name = (error as { name?: string }).name;
      throw new QrScanError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : 'no-camera',
      );
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
    try {
      const read = await this.reader();
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play().catch(() => undefined);
      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2 && video.videoWidth > 0) {
            const text = await read(video);
            if (text && !stopped) onText(text);
          }
        } catch {
          // A bad frame: try the next one.
        }
        if (!stopped) timer = setTimeout(tick, 150);
      };
      void tick();
    } catch (error) {
      stop();
      throw error;
    }
    return { stop };
  }

  private async reader(): Promise<
    (video: HTMLVideoElement) => Promise<string | null>
  > {
    const globals = globalThis as { BarcodeDetector?: DetectorCtor };
    const Ctor = globals.BarcodeDetector;
    if (Ctor && pickDecoder(globals) === 'barcode-detector') {
      const formats = (await Ctor.getSupportedFormats?.().catch(
        () => undefined,
      )) ?? ['qr_code'];
      if (formats.includes('qr_code')) {
        try {
          const detector = new Ctor({ formats: ['qr_code'] });
          return async (video) =>
            (await detector.detect(video))[0]?.rawValue ?? null;
        } catch {
          // Constructor refused: use jsqr below.
        }
      }
    }
    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    return async (video) => {
      if (!context) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(image.data, image.width, image.height)?.data ?? null;
    };
  }
}
