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
    expect(el.querySelectorAll('[data-test="pack-card"]').length).toBe(2);
  });
  const card = (id: string) => el.querySelector<HTMLElement>(`[data-test="pack-card"][data-pack="${id}"]`)!;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      await fixture.whenStable();
      check();
    });
  return { fixture, el, card, settle, service };
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
    expect(extra).toContain('More things');
    expect(extra).toContain('Jane Doe');
    expect(extra).toContain('CC0-1.0');
    expect(extra).toMatch(/1\.2\s?(kB|KB|Ko)|1234/);
    expect(card('base').textContent).toContain('Base');
  });

  it('shows Base as always on, with no toggle and no remove button', async () => {
    const { card } = await render();

    expect(card('base').textContent).toContain('Always on');
    expect(card('base').querySelector('p-toggleswitch')).toBeNull();
    expect(card('base').textContent).not.toContain('Remove from device');
  });

  it('shows the other pack off, not downloaded, with a toggle and no remove button', async () => {
    const { card } = await render();

    expect(card('extra').querySelector('p-toggleswitch')).not.toBeNull();
    expect(card('extra').textContent).not.toContain('Downloaded');
    expect(card('extra').textContent).not.toContain('Remove from device');
  });

  it('toggling a pack on downloads it and shows the Downloaded tag and Remove button', async () => {
    const { card, settle, service } = await render();

    card('extra').querySelector<HTMLInputElement>('p-toggleswitch input')!.click();

    await settle(() => expect(card('extra').textContent).toContain('Downloaded'));
    expect(service.loadBlob).toHaveBeenCalledWith('packs/extra/sprites/gem.png');
    expect(card('extra').textContent).toContain('Remove from device');
  });

  it('Remove from device, once confirmed, clears the downloaded state', async () => {
    const { card, settle } = await render();
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((c) => {
      c.accept?.();
      return TestBed.inject(ConfirmationService);
    });
    card('extra').querySelector<HTMLInputElement>('p-toggleswitch input')!.click();
    await settle(() => expect(card('extra').textContent).toContain('Downloaded'));

    const remove = [...card('extra').querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Remove from device'),
    )!;
    remove.click();

    await settle(() => expect(card('extra').textContent).not.toContain('Downloaded'));
  });

  it('shows a toast when the download fails and stays not downloaded', async () => {
    const failing = extraPackService({
      loadBlob: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    const { card, settle } = await render(failing);
    const add = vi.spyOn(TestBed.inject(MessageService), 'add');

    card('extra').querySelector<HTMLInputElement>('p-toggleswitch input')!.click();

    await settle(() => expect(add).toHaveBeenCalled());
    expect(add.mock.calls[0][0].severity).toBe('error');
    expect(card('extra').textContent).not.toContain('Downloaded');
  });
});
