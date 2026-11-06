import { Injectable } from '@angular/core';

/** QR codes as image data URLs (the `qrcode` library, loaded on first use so it stays out of the main bundle). */
@Injectable({ providedIn: 'root' })
export class QrService {
  async toDataUrl(text: string): Promise<string> {
    const { toDataURL } = await import('qrcode');
    // Low error correction keeps ~800-character codes at a size phones scan easily.
    return toDataURL(text, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
  }
}
