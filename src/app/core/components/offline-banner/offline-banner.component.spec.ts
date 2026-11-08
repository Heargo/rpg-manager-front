import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { OfflineBannerComponent } from './offline-banner.component';

/** Contract: `.offline-banner` exists only while the device is offline (browser online/offline events). */
async function render() {
  TestBed.configureTestingModule({ imports: [OfflineBannerComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(OfflineBannerComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture };
}

describe('OfflineBannerComponent', () => {
  afterEach(() => window.dispatchEvent(new Event('online')));

  it('is absent while the device is online', async () => {
    const { el } = await render();
    expect(el.querySelector('.offline-banner')).toBeNull();
  });

  it('appears with the offline message when the device goes offline, and goes away when it is back', async () => {
    const { el, fixture } = await render();

    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    const banner = el.querySelector('.offline-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("You're offline");

    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(el.querySelector('.offline-banner')).toBeNull();
  });
});
