import { inject, Injectable } from '@angular/core';
import { acceptScan, ScanPlace, ScanVerdict } from '../helpers/qr-scan.rules';
import {
  QrScanSession,
  QrScannerService,
} from '../services/qr-scanner.service';

/** What the scanner dialog needs: open the camera, and check a scanned or pasted text is the right kind. */
@Injectable({ providedIn: 'root' })
export class QrScanBusiness {
  private readonly scanner = inject(QrScannerService);

  start(
    video: HTMLVideoElement,
    onText: (text: string) => void,
  ): Promise<QrScanSession> {
    return this.scanner.start(video, onText);
  }

  accept(text: string, place: ScanPlace): ScanVerdict {
    return acceptScan(text, place);
  }
}
