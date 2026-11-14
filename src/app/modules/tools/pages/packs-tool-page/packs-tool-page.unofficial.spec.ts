import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { PackBusiness } from '../../../../core/business/pack.business';
import { PackStorageService } from '../../../../core/services/pack-storage.service';
import { NEON_LINK, NEON_ROOT, NeonWorld, neonProviders, neonWorld } from '../../../../../testing/unofficial-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PacksToolPageComponent } from './packs-tool-page.component';

async function render(world: NeonWorld = neonWorld()) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PacksToolPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders(world).providers],
  });
  const fixture = TestBed.createComponent(PacksToolPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  await settle(() => expect(el.querySelectorAll('[data-test="pack-card"]').length).toBe(3));
  /** Dialogs may be rendered inside the page or in the document body. */
  const root = () => document.body;
  const button = (text: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent!.trim().includes(text));
  const unofficial = (id: string) =>
    el.querySelector<HTMLElement>(`[data-test="unofficial-pack-card"][data-pack="${id}"]`);
  const type = (link: string) => {
    const input = root().querySelector<HTMLInputElement>('input[data-test="pack-link"]')!;
    input.value = link;
    input.dispatchEvent(new Event('input'));
  };
  const check = async (link = NEON_LINK) => {
    button('Add a pack')!.click();
    await settle(() => expect(root().querySelector('input[data-test="pack-link"]')).not.toBeNull());
    type(link);
    fixture.detectChanges();
    button('Check')!.click();
  };
  return { fixture, el, settle, root, button, unofficial, check, storage: TestBed.inject(PackStorageService), business: TestBed.inject(PackBusiness) };
}

describe('PacksToolPageComponent unofficial packs', () => {
  afterEach(() => {
    document.body.querySelectorAll('.p-dialog-mask, p-dialog').forEach((n) => n.remove());
  });

  it('shows no unofficial pack and an Add a pack button at first', async () => {
    const { button, unofficial } = await render();

    expect(button('Add a pack')).toBeDefined();
    expect(unofficial('neon')).toBeNull();
  });

  it('Check shows the preview with the third-party warning, and installs nothing yet', async () => {
    const { check, settle, root, storage } = await render();

    await check();

    await settle(() => expect(root().querySelector('[data-test="pack-preview"]')).not.toBeNull());
    const preview = root().querySelector('[data-test="pack-preview"]')!.textContent!;
    expect(preview).toContain('Neon');
    expect(preview).toContain('Ann Author');
    expect(preview).toContain('CC-BY-4.0');
    expect(preview).toContain('1.0.0');
    expect(preview).toContain("Content not checked by the app's authors");
    expect(root().querySelector('[data-test="pack-preview"] a[href="https://creativecommons.org/licenses/by/4.0/"]')).not.toBeNull();
    expect(await storage.list()).toEqual([]);
  });

  it('Install stores the pack and an unofficial card appears with its source, version, Update and Remove, and no toggle', async () => {
    const { check, settle, root, button, unofficial, storage } = await render();
    await check();
    await settle(() => expect(button('Install')).toBeDefined());

    button('Install')!.click();

    await settle(() => expect(unofficial('neon')).not.toBeNull());
    const card = unofficial('neon')!;
    expect(card.textContent).toContain('Neon');
    expect(card.textContent).toContain('1.0.0');
    expect(card.querySelector(`a[href="${NEON_LINK}"]`)).not.toBeNull();
    expect(card.querySelector('p-toggleswitch')).toBeNull();
    expect(card.textContent).toContain('Update');
    expect(card.textContent).toContain('Remove from device');
    expect((await storage.list()).map((p) => p.id)).toEqual(['neon']);
    expect(root().querySelector('[data-test="pack-preview"]')).toBeNull();
  });

  it('lists the errors per file and offers no Install when the pack is invalid', async () => {
    const world = neonWorld();
    world.json.set(`${NEON_ROOT}generators/items.json`, { version: 1 });
    const { check, settle, root, button, unofficial, storage } = await render(world);

    await check();

    await settle(() => expect(root().querySelector('[data-test="pack-errors"]')).not.toBeNull());
    const errors = [...root().querySelectorAll('[data-test="pack-errors"] li')].map((li) => li.textContent);
    expect(errors.some((e) => e!.includes('generators/items.json'))).toBe(true);
    expect(root().querySelector('[data-test="pack-preview"]')).toBeNull();
    expect(button('Install')).toBeUndefined();
    expect(unofficial('neon')).toBeNull();
    expect(await storage.list()).toEqual([]);
  });

  it('lists an error for a link that is not usable', async () => {
    const { check, settle, root, storage } = await render();

    await check('http://example.com/pack.json');

    await settle(() => expect(root().querySelectorAll('[data-test="pack-errors"] li').length).toBeGreaterThan(0));
    expect(await storage.list()).toEqual([]);
  });

  it('Update shows the old and the new version and replaces the pack on confirm', async () => {
    const world = neonWorld();
    const { settle, root, button, unofficial, storage, business } = await render(world);
    await business.install(await business.prepare(NEON_LINK));
    await settle(() => expect(unofficial('neon')).not.toBeNull());
    world.manifest['version'] = '2.0.0';

    [...unofficial('neon')!.querySelectorAll('button')].find((b) => b.textContent!.includes('Update'))!.click();

    await settle(() => expect(root().querySelector('[data-test="pack-update"]')).not.toBeNull());
    const dialog = root().querySelector('[data-test="pack-update"]')!.textContent!;
    expect(dialog).toContain('1.0.0');
    expect(dialog).toContain('2.0.0');
    expect((await storage.list())[0].manifest.version).toBe('1.0.0');

    button('Confirm')!.click();

    await settle(() => expect(unofficial('neon')!.textContent).toContain('2.0.0'));
    expect((await storage.list())[0].manifest.version).toBe('2.0.0');
  });
});
