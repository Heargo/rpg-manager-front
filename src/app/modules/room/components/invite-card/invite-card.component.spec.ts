import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { encodeSignal } from '../../../../core/p2p/helpers/signal-codec';
import { CHROME_OFFER, FIREFOX_ANSWER } from '../../../../../testing/sdp-samples';
import { PendingInvite, RoomBusiness } from '../../business/room.business';
import { QrScannerService } from '../../services/qr-scanner.service';
import { InviteCardComponent } from './invite-card.component';

const answerCode = encodeSignal({ type: 'answer', sdp: FIREFOX_ANSWER });
const offerCode = encodeSignal({ type: 'offer', sdp: CHROME_OFFER });

/** Contract: the host's pending invite has a `[data-test="scan"]` button that opens the scanner. */
describe('InviteCardComponent scanning', () => {
  let onText: (text: string) => void;
  const room = {
    accept: vi.fn(async () => undefined),
    inviteLink: vi.fn(() => 'https://app.example/join#x'),
    qrCode: vi.fn(),
    describeError: vi.fn(() => 'error'),
    cancelInvite: vi.fn(),
    retryInvite: vi.fn(),
  };

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: RoomBusiness, useValue: room },
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
    const fixture = TestBed.createComponent(InviteCardComponent);
    const invite: PendingInvite = { id: 'i1', offerCode: 'offer', createdAt: 0, state: 'waiting' };
    fixture.componentRef.setInput('invite', invite);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => room.accept.mockClear());

  it("accepts the player's answer read from their QR code", async () => {
    const fixture = await render();
    (fixture.nativeElement.querySelector('[data-test="scan"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    onText(answerCode);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(room.accept).toHaveBeenCalledWith('i1', answerCode);
  });

  it('does not accept an invite code scanned by mistake', async () => {
    const fixture = await render();
    (fixture.nativeElement.querySelector('[data-test="scan"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    onText(offerCode);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(room.accept).not.toHaveBeenCalled();
  });
});
