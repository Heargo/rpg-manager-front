import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';

/** QR codes as image data URLs (the `qrcode` library). */
@Injectable({ providedIn: 'root' })
export class QrService {
  toDataUrl(text: string): Promise<string> {
    // Low error correction keeps ~800-character codes at a size phones scan easily.
    return toDataURL(text, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
  }
}
