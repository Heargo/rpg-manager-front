import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { encodeSignal } from '../../../../core/p2p/helpers/signal-codec';
import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../../testing/sdp-samples';
import { QrScannerService } from '../../../room/services/qr-scanner.service';
import { PlayBusiness } from '../../business/play.business';
import { PlayPageComponent } from './play-page.component';

const offerCode = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });
const answerCode = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });

/** Contract: the join entry has a `[data-test="scan"]` button that opens the scanner. */
describe('PlayPageComponent join entry scanning', () => {
  let onText: (text: string) => void;
  const navigate = vi.fn(async () => true);

  async function render() {
    const play = {
      load: async () => undefined,
      $worlds: signal([]),
      $joinedWorlds: signal([]),
      $roomStatus: signal('idle'),
      $roomName: signal(undefined),
      $hostedWorldId: signal(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: PlayBusiness, useValue: play },
        {
          provide: QrScannerService,
          useValue: {
            start: async (_video: HTMLVideoElement, callback: (text: string) => void) => {
              onText = callback;
              return { stop: () => undefined };
            },
          },
        },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(navigate);
    const fixture = TestBed.createComponent(PlayPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function openScanner(fixture: Awaited<ReturnType<typeof render>>) {
    (fixture.nativeElement.querySelector('[data-test="scan"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => navigate.mockClear());

  it('opens the join flow with a scanned invite link', async () => {
    const fixture = await render();
    await openScanner(fixture);
    onText(`https://app.example/join#${offerCode}`);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/join'], { fragment: offerCode });
  });

  it('opens the join flow with a scanned invite code', async () => {
    const fixture = await render();
    await openScanner(fixture);
    onText(offerCode);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/join'], { fragment: offerCode });
  });

  it('does not join with an answer code', async () => {
    const fixture = await render();
    await openScanner(fixture);
    onText(answerCode);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
  });
});
