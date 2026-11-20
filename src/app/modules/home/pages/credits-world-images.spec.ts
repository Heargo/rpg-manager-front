import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { provideBasePack } from '../../../../testing/base-pack';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { CreditsPageComponent } from './credits-page.component';

import baseAssets from '../../../../../public/packs/base-assets/pack.json';

const manifestNotice: string = (baseAssets as { notice?: string }).notice ?? 'MISSING NOTICE';

describe('CreditsPageComponent world images', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ imports: [CreditsPageComponent], providers: [...TEST_PROVIDERS, provideBasePack()] });
  });

  it('lists the nine base-assets landscapes, each with its Vecteezy source link', async () => {
    const fixture = TestBed.createComponent(CreditsPageComponent);
    const el = fixture.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.querySelectorAll('[data-test="world-images"] a[href^="https://www.vecteezy.com/"]').length).toBe(9);
    });

    const section = el.querySelector<HTMLElement>('[data-test="world-images"]')!;
    expect(section.textContent).toContain('Vecteezy');
    expect(section.querySelector('a[href="https://www.vecteezy.com/vector-art/273915-ocean-background"]')).not.toBeNull();
    expect(section.querySelector('a[href="https://www.vecteezy.com/vector-art/8277965-mountain-landscape-with-pines-and-forests-under-winter-skies"]')).not.toBeNull();
  });

  it('lists them too when the open world does not use base-assets', async () => {
    TestBed.inject(ActivePacksBusiness).set(['base-en'], 'en');
    const fixture = TestBed.createComponent(CreditsPageComponent);
    const el = fixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.querySelectorAll('[data-test="world-images"] a[href^="https://www.vecteezy.com/"]').length).toBe(9);
    });
  });

  it('shows the notice of the base-assets manifest', async () => {
    const fixture = TestBed.createComponent(CreditsPageComponent);
    const el = fixture.nativeElement as HTMLElement;

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.querySelector('[data-test="world-images"]')?.textContent).toContain(manifestNotice);
    });
  });
});
