import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { QrScannerService } from '../../services/qr-scanner.service';
import { QrScanComponent } from './qr-scan.component';

describe('QrScanComponent dialog', () => {
  const stop = vi.fn();
  let onText: (text: string) => void;

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: QrScannerService,
          useValue: {
            start: async (
              _video: HTMLVideoElement,
              callback: (text: string) => void,
            ) => {
              onText = callback;
              return { stop };
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(QrScanComponent);
    fixture.componentRef.setInput('place', 'host-pending-invite');
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, closed: () => closed };
  }

  beforeEach(() => stop.mockClear());

  it('closes and stops the camera on Escape', async () => {
    const { fixture, closed } = await render();
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
      }),
    );
    fixture.detectChanges();
    expect(closed()).toBe(1);
    expect(stop).toHaveBeenCalled();
  });

  it('is a modal dialog', async () => {
    await render();
    expect(
      document.querySelector('[role="dialog"][aria-modal="true"]'),
    ).not.toBeNull();
  });
});
