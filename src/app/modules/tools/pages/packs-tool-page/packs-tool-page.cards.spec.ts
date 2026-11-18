import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { EXTRA_REGISTRY, extraPackService, provideExtraPack } from '../../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { NeonWorld, neonProviders, neonWorld } from '../../../../../testing/unofficial-pack';
import { PacksToolPageComponent } from './packs-tool-page.component';

const LONG_NAME = 'Le Grand Recueil Illustre des Merveilles, Reliques et Curiosites du Royaume Oublie';
const LONG_DESCRIPTION = 'Une description tres longue. '.repeat(20);

function longRegistry() {
  return {
    ...EXTRA_REGISTRY,
    packs: EXTRA_REGISTRY.packs.map((p) =>
      p.id === 'extra' ? { ...p, name: LONG_NAME, description: LONG_DESCRIPTION } : p,
    ),
  };
}

function setup() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
}

async function renderOfficial() {
  setup();
  const service = extraPackService({ loadRegistry: vi.fn(async () => longRegistry()) });
  TestBed.configureTestingModule({
    imports: [PacksToolPageComponent],
    providers: [...TEST_PROVIDERS, provideExtraPack(service)],
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
  const card = (id: string) => el.querySelector<HTMLElement>(`[data-test="pack-card"][data-pack="${id}"]`)!;
  return { fixture, el, card, settle };
}

async function renderUnofficial() {
  setup();
  const world: NeonWorld = neonWorld();
  world.manifest['name'] = LONG_NAME;
  world.manifest['description'] = LONG_DESCRIPTION;
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
  await settle(() => expect(el.querySelectorAll('[data-test="pack-card"]').length).toBe(4));
  return { fixture, el, settle, world };
}

const hover = (el: Element) => el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

describe('PacksToolPageComponent catalogue cards', () => {
  afterEach(() => {
    document.body.querySelectorAll('.p-dialog-mask, p-dialog, .p-tooltip').forEach((n) => n.remove());
  });

  it('clamps a long official pack name to two lines', async () => {
    const { card } = await renderOfficial();

    const name = card('extra').querySelector<HTMLElement>('[data-test="pack-name"]')!;
    expect(name.textContent).toContain(LONG_NAME);
    expect(name.classList.contains('line-clamp-2')).toBe(true);
  });

  it('shows the full name of a pack in a tooltip on hover', async () => {
    const { card, settle } = await renderOfficial();

    hover(card('extra').querySelector('[data-test="pack-name"]')!);

    await settle(() => expect(document.body.querySelector('.p-tooltip')?.textContent).toContain(LONG_NAME));
  });

  it('puts the tags on their own line under the name, outside the name element', async () => {
    const { card } = await renderOfficial();

    const name = card('extra').querySelector('[data-test="pack-name"]')!;
    const tags = card('extra').querySelector('[data-test="pack-tags"]')!;
    expect(tags.contains(name)).toBe(false);
    expect(name.contains(tags)).toBe(false);
    expect(name.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tags.querySelector('[data-test="pack-language"]')?.textContent).toContain('Français');
    expect(card('base-fr').querySelector('[data-test="pack-tags"]')!.textContent).toContain('Always available');
  });

  it('clamps the description to three lines', async () => {
    const { card } = await renderOfficial();

    const desc = card('extra').querySelector<HTMLElement>('[data-test="pack-desc"]')!;
    expect(desc.textContent).toContain('Une description tres longue.');
    expect(desc.classList.contains('line-clamp-3')).toBe(true);
  });

  it('replaces the definition list by a meta line with author, license, size and sprites', async () => {
    const { card } = await renderOfficial();

    const extra = card('extra');
    expect(extra.querySelector('dl')).toBeNull();
    const meta = extra.querySelector('[data-test="pack-meta"]')!;
    const items = [...meta.querySelectorAll('[data-test="pack-meta-item"]')];
    expect(items.length).toBe(4);
    const text = items.map((i) => i.textContent!.trim());
    expect(text.some((t) => t.includes('Jane Doe'))).toBe(true);
    expect(text.some((t) => t.includes('CC0-1.0'))).toBe(true);
    expect(text.some((t) => /1\.2\s?kB/.test(t))).toBe(true);
    expect(text.some((t) => /\b1\b/.test(t) && !t.includes('Jane'))).toBe(true);
    expect(text.some((t) => t.includes('Français'))).toBe(false);
    expect(items.every((i) => i.querySelector('i.pi') !== null)).toBe(true);
    expect(meta.querySelector('a[href="https://creativecommons.org/publicdomain/zero/1.0/"]')).not.toBeNull();
  });

  it('shows the language once per card', async () => {
    const { card } = await renderOfficial();

    const extra = card('extra');
    expect(extra.textContent!.match(/Français/g)!.length).toBe(1);
    expect(extra.querySelector('[data-test="pack-tags"] [data-test="pack-language"]')).not.toBeNull();
    expect(extra.querySelector('[data-test="pack-meta"]')!.textContent).not.toContain('Français');
  });

  it('leaves the language and the size out of the meta line of a neutral built-in pack', async () => {
    const { card } = await renderOfficial();

    const items = card('base-assets').querySelectorAll('[data-test="pack-meta-item"]');
    expect(items.length).toBe(3);
    expect(card('base-assets').querySelector('[data-test="pack-tags"]')!.textContent).toContain('Always available');
  });

  it('clamps name and description and shows a meta line on an unofficial card too', async () => {
    const { el, settle } = await renderUnofficial();
    const business = (await import('../../../../core/business/pack.business')).PackBusiness;
    const { NEON_LINK } = await import('../../../../../testing/unofficial-pack');
    const instance = TestBed.inject(business);
    await instance.install(await instance.prepare(NEON_LINK));

    await settle(() => expect(el.querySelector('[data-test="unofficial-pack-card"]')).not.toBeNull());
    const card = el.querySelector<HTMLElement>('[data-test="unofficial-pack-card"]')!;
    const name = card.querySelector<HTMLElement>('[data-test="pack-name"]')!;
    expect(name.textContent).toContain(LONG_NAME);
    expect(name.classList.contains('line-clamp-2')).toBe(true);
    expect(card.querySelector('[data-test="pack-tags"]')!.textContent).toContain('Français');
    expect(card.querySelector('[data-test="pack-desc"]')!.classList.contains('line-clamp-3')).toBe(true);
    expect(card.querySelector('dl')).toBeNull();
    const meta = card.querySelector('[data-test="pack-meta"]')!;
    expect(meta.textContent).toContain('Ann Author');
    expect(meta.textContent).toContain('CC-BY-4.0');
    expect(meta.textContent).toContain('1.0.0');
    expect(card.textContent!.match(/Français/g)!.length).toBe(1);
  });

  it('clamps the details dialog title the same way', async () => {
    const { card, settle } = await renderOfficial();
    const download = [...card('extra').querySelectorAll('button')].find((b) => b.textContent!.includes('Download'))!;
    download.click();
    await settle(() => expect(card('extra').textContent).toContain('Downloaded'));
    [...card('extra').querySelectorAll('button')].find((b) => b.textContent!.includes('Details'))!.click();

    await settle(() => expect(document.body.querySelector('[data-test="pack-details-title"]')).not.toBeNull());
    const title = document.body.querySelector<HTMLElement>('[data-test="pack-details-title"]')!;
    expect(title.textContent).toContain(LONG_NAME);
    expect(title.classList.contains('line-clamp-2')).toBe(true);
  });
});
