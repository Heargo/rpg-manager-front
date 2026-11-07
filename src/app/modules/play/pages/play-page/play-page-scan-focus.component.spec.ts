import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { QrScannerService } from '../../../room/services/qr-scanner.service';
import { PlayBusiness } from '../../business/play.business';
import { PlayPageComponent } from './play-page.component';

describe('PlayPageComponent scanner focus', () => {
  it('gives focus back to the Scan button when the scanner closes', async () => {
    const play = {
      load: async () => undefined,
      $worlds: signal([]),
      $joinedRooms: signal([]),
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
          useValue: { start: async () => ({ stop: () => undefined }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(PlayPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const scan = fixture.nativeElement.querySelector(
      '[data-test="scan"]',
    ) as HTMLElement;
    scan.click();
    fixture.detectChanges();
    await fixture.whenStable();
    (document.querySelector('[data-test="scan-close"]') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(scan);
  });
});
