import { Injectable } from '@angular/core';

/** QR codes as image data URLs (the `qrcode` library, loaded on first use so it stays out of the main bundle). */
@Injectable({ providedIn: 'root' })
export class QrService {
  async toDataUrl(text: string): Promise<string> {
    const { toDataURL } = await import('./qr-encoder');
    // ~800-character codes give a dense QR (~97 modules): lowest error correction, the full 4-module quiet zone
    // scanners need, and a large bitmap so each module stays several screen pixels wide.
    return toDataURL(text, { errorCorrectionLevel: 'L', margin: 4, width: 1024 });
  }
}
