import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { extraPackService, provideExtraPack } from '../../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PacksToolPageComponent } from './packs-tool-page.component';

// The real base-assets manifest: 101 masked sprites, then 9 world images.
async function openAssetsDetails() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PacksToolPageComponent],
    providers: [...TEST_PROVIDERS, provideExtraPack(extraPackService())],
  });
  const fixture = TestBed.createComponent(PacksToolPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  await settle(() => expect(el.querySelectorAll('[data-test="pack-card"]').length).toBe(4));
  const card = el.querySelector<HTMLElement>('[data-test="pack-card"][data-pack="base-assets"]')!;
  [...card.querySelectorAll('button')].find((b) => b.textContent!.includes('Details'))!.click();
  const dialog = () => document.body.querySelector<HTMLElement>('.p-dialog')!;
  await settle(() => expect(dialog().querySelectorAll('[data-test="pack-showcase-item"]').length).toBeGreaterThan(0));
  const row = (kind: string) => dialog().querySelector<HTMLElement>(`[data-test="pack-asset-row"][data-kind="${kind}"]`)!;
  const thumbs = () => dialog().querySelectorAll('[data-test="pack-asset-thumb"]');
  return { settle, dialog, row, thumbs };
}

describe('PacksToolPageComponent pack details showcase', () => {
  afterEach(() => {
    document.body.querySelectorAll('.p-dialog-mask, p-dialog, .p-tooltip').forEach((n) => n.remove());
  });

  it('shows at most 5 showcase images, the first assets in manifest order', async () => {
    const { dialog } = await openAssetsDetails();

    const imgs = [...dialog().querySelectorAll<HTMLImageElement>('[data-test="pack-showcase-item"] img')];
    expect(imgs.length).toBe(5);
    expect(imgs.map((i) => i.getAttribute('src')!.split('/').pop())).toEqual([
      'amulet_1.png',
      'amulet_2.png',
      'amulet_3.png',
      'apple.png',
      'armor_1.png',
    ]);
  });

  it('lists one row per asset kind with its count and renders no thumbnail', async () => {
    const { row, thumbs, dialog } = await openAssetsDetails();

    expect(dialog().querySelectorAll('[data-test="pack-asset-row"]').length).toBe(2);
    expect(row('masked').textContent).toContain('101');
    expect(row('world').textContent).toContain('9');
    expect(thumbs().length).toBe(0);
    expect(dialog().querySelectorAll('img').length).toBe(5);
  });

  it('expands the first page of a kind with Show all', async () => {
    const { row, thumbs, settle } = await openAssetsDetails();

    row('masked').querySelector<HTMLElement>('[data-test="pack-asset-show-all"]')!.click();

    await settle(() => expect(thumbs().length).toBe(24));
  });

  it('shows the whole kind on one page when it fits', async () => {
    const { row, thumbs, settle } = await openAssetsDetails();

    row('world').querySelector<HTMLElement>('[data-test="pack-asset-show-all"]')!.click();

    await settle(() => expect(thumbs().length).toBe(9));
  });

  it('moves to the next page', async () => {
    const { row, thumbs, dialog, settle } = await openAssetsDetails();
    row('masked').querySelector<HTMLElement>('[data-test="pack-asset-show-all"]')!.click();
    await settle(() => expect(thumbs().length).toBe(24));
    const firstOf = () => thumbs()[0].querySelector('img')!.getAttribute('src');
    const before = firstOf();

    dialog().querySelector<HTMLElement>('[data-test="pack-asset-next"]')!.click();

    await settle(() => expect(firstOf()).not.toBe(before));
    expect(thumbs().length).toBe(24);
  });
});
