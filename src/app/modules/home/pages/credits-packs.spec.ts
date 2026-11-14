import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { PackBusiness } from '../../../core/business/pack.business';
import { extraPackService, provideExtraPack } from '../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { CreditsPageComponent } from './credits-page.component';

async function render(enableExtra: boolean) {
  TestBed.configureTestingModule({
    imports: [CreditsPageComponent],
    providers: [...TEST_PROVIDERS, provideExtraPack(extraPackService())],
  });
  if (enableExtra) await TestBed.inject(PackBusiness).enable('extra');
  const fixture = TestBed.createComponent(CreditsPageComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, packs: () => el.querySelector<HTMLElement>('[data-test="packs"]') };
}

describe('CreditsPageComponent packs', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  it('lists an installed non-Base pack with its author and a license link', async () => {
    const { fixture, packs } = await render(true);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(packs()).not.toBeNull();
    });

    const text = packs()!.textContent!;
    expect(text).toContain('Extra');
    expect(text).toContain('Jane Doe');
    expect(text).toContain('CC0-1.0');
    expect(packs()!.querySelector('a[href="https://creativecommons.org/publicdomain/zero/1.0/"]')).not.toBeNull();
  });

  it('adds nothing when only Base is installed, and keeps the Fantasy items credit', async () => {
    const { fixture, el, packs } = await render(false);
    await fixture.whenStable();

    expect(packs()).toBeNull();
    expect(el.querySelector('[data-test="sprites"]')!.textContent).toContain('Florian Sciberras');
  });
});
