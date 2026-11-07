import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { encodeSignal } from '../../../../core/p2p/helpers/signal-codec';
import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../../testing/sdp-samples';
import { QrScanError, QrScannerService } from '../../services/qr-scanner.service';
import { QrScanComponent } from './qr-scan.component';

const offerCode = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
const answerCode = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });

/** Contract: `[data-test="scan-close"]`, `[data-test="scan-paste"]` (textarea) and `[data-test="scan-use"]` (button). */
describe('QrScanComponent', () => {
  let onText: (text: string) => void;
  const stop = vi.fn();
  const start = vi.fn();

  async function render(place: 'host-pending-invite' | 'join-entry' = 'host-pending-invite') {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: QrScannerService, useValue: { start } }],
    });
    const fixture = TestBed.createComponent(QrScanComponent);
    fixture.componentRef.setInput('place', place);
    const scanned: string[] = [];
    let closed = 0;
    fixture.componentInstance.scanned.subscribe((text: string) => scanned.push(text));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, scanned, closed: () => closed };
  }

  beforeEach(() => {
    stop.mockClear();
    start.mockReset();
    start.mockImplementation(async (_video: HTMLVideoElement, callback: (text: string) => void) => {
      onText = callback;
      return { stop };
    });
  });

  it('emits the decoded text', async () => {
    const { fixture, scanned } = await render();
    onText(answerCode);
    fixture.detectChanges();
    expect(scanned).toEqual([answerCode]);
  });

  it('stops the camera when the dialog is closed', async () => {
    const { el, closed } = await render();
    (el.querySelector('[data-test="scan-close"]') as HTMLButtonElement).click();
    expect(stop).toHaveBeenCalled();
    expect(closed()).toBe(1);
  });

  it('stops the camera once a code is scanned', async () => {
    const { fixture } = await render();
    onText(answerCode);
    fixture.detectChanges();
    expect(stop).toHaveBeenCalled();
  });

  it('stops the camera when the component is destroyed', async () => {
    const { fixture } = await render();
    fixture.destroy();
    expect(stop).toHaveBeenCalled();
  });

  it('keeps scanning and explains when the wrong kind of code is scanned', async () => {
    const { fixture, el, scanned } = await render('host-pending-invite');
    onText(offerCode);
    fixture.detectChanges();
    expect(scanned).toEqual([]);
    expect(stop).not.toHaveBeenCalled();
    expect(el.querySelector('p-message, .scan-error')).not.toBeNull();
  });

  it('shows the paste fallback when the camera permission is denied', async () => {
    start.mockRejectedValue(new QrScanError('denied'));
    const { fixture, el, scanned } = await render();
    const paste = el.querySelector('[data-test="scan-paste"]') as HTMLTextAreaElement;
    expect(paste).not.toBeNull();
    paste.value = answerCode;
    paste.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('[data-test="scan-use"]') as HTMLButtonElement).click();
    expect(scanned).toEqual([answerCode]);
  });

  it('shows the paste fallback when there is no camera', async () => {
    start.mockRejectedValue(new QrScanError('no-camera'));
    const { el } = await render();
    expect(el.querySelector('[data-test="scan-paste"]')).not.toBeNull();
  });

  it('shows no paste fallback while the camera works', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-test="scan-paste"]')).toBeNull();
  });
});
