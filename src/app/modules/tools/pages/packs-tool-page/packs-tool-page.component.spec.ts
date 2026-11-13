import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { extraPackService, provideExtraPack } from '../../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { routesTools } from '../../tools.routes';
import { PacksToolPageComponent } from './packs-tool-page.component';

async function render(service = extraPackService()) {
  TestBed.configureTestingModule({
    imports: [PacksToolPageComponent],
    providers: [...TEST_PROVIDERS, provideExtraPack(service)],
  });
  const fixture = TestBed.createComponent(PacksToolPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(el.querySelectorAll('[data-test="pack-card"]').length).toBe(3);
  });
  const card = (id: string) => el.querySelector<HTMLElement>(`[data-test="pack-card"][data-pack="${id}"]`)!;
  const download = (id: string) =>
    [...card(id).querySelectorAll('button')].find((b) => b.textContent!.trim().includes('Download'));
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      await fixture.whenStable();
      check();
    });
  return { fixture, el, card, settle, service, download };
}

describe('PacksToolPageComponent', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  it('is routed at tools/packs', () => {
    expect(routesTools.some((r) => r.path === 'tools/packs')).toBe(true);
  });

  it('renders one card per registry pack with name, author, license, size and sprite count', async () => {
    const { card } = await render();

    const extra = card('extra').textContent!;
    expect(extra).toContain('Extra');
    expect(extra).toContain('Plus de choses');
    expect(extra).toContain('Jane Doe');
    expect(extra).toContain('CC0-1.0');
    expect(extra).toMatch(/1\.2\s?(kB|KB|Ko)|1234/);
    expect(card('base-fr').textContent).toContain('Base');
  });

  it('shows each Base as always available, with no toggle and no remove button', async () => {
    const { card } = await render();

    for (const id of ['base-fr', 'base-en']) {
      expect(card(id).textContent, id).toContain('Always available');
      expect(card(id).querySelector('p-toggleswitch'), id).toBeNull();
      expect(card(id).textContent, id).not.toContain('Remove from device');
    }
  });

  it('shows the language of each pack as a tag on its card', async () => {
    const { card } = await render();

    const tag = (id: string) => card(id).querySelector('[data-test="pack-language"]')?.textContent;
    expect(tag('base-fr')).toContain('Français');
    expect(tag('base-en')).toContain('English');
    expect(tag('extra')).toContain('Français');
  });

  it('shows no on/off toggle on any card', async () => {
    const { el } = await render();

    expect(el.querySelector('p-toggleswitch')).toBeNull();
  });

  it('shows the official pack not downloaded, with a Download button and no remove button', async () => {
    const { card, download } = await render();

    expect(download('extra')).toBeDefined();
    expect(card('extra').textContent).not.toContain('Downloaded');
    expect(card('extra').textContent).not.toContain('Remove from device');
  });

  it('Download fetches the pack and shows the Downloaded tag and Remove button instead of Download', async () => {
    const { card, settle, service, download } = await render();

    download('extra')!.click();

    await settle(() => expect(card('extra').textContent).toContain('Downloaded'));
    expect(service.loadBlob).toHaveBeenCalledWith('packs/extra/sprites/gem.png');
    expect(card('extra').textContent).toContain('Remove from device');
    expect(download('extra')).toBeUndefined();
    expect(card('extra').querySelector('p-toggleswitch')).toBeNull();
  });

  it('Remove from device, once confirmed, clears the downloaded state', async () => {
    const { card, settle, download } = await render();
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((c) => {
      c.accept?.();
      return TestBed.inject(ConfirmationService);
    });
    download('extra')!.click();
    await settle(() => expect(card('extra').textContent).toContain('Downloaded'));

    const remove = [...card('extra').querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Remove from device'),
    )!;
    remove.click();

    await settle(() => expect(card('extra').textContent).not.toContain('Downloaded'));
    expect(download('extra')).toBeDefined();
  });

  it('shows a toast when the download fails and stays not downloaded', async () => {
    const failing = extraPackService({
      loadBlob: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    const { card, settle, download } = await render(failing);
    const add = vi.spyOn(TestBed.inject(MessageService), 'add');

    download('extra')!.click();

    await settle(() => expect(add).toHaveBeenCalled());
    expect(add.mock.calls[0][0].severity).toBe('error');
    expect(card('extra').textContent).not.toContain('Downloaded');
  });
});
