import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PackBusiness } from '../../../../core/business/pack.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { NEON_LINK, neonProviders } from '../../../../../testing/unofficial-pack';
import { PacksToolPageComponent } from './packs-tool-page.component';

@Component({ template: '' })
class Blank {}

async function render() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PacksToolPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      ...neonProviders().providers,
      provideRouter([
        { path: 'tools/pack-creator', component: Blank },
        { path: 'tools/pack-creator/:draftId', component: Blank },
      ]),
    ],
  });
  const packs = TestBed.inject(PackBusiness);
  const creator = TestBed.inject(PackCreatorBusiness);
  await packs.install(await packs.prepare(NEON_LINK));
  const fixture = TestBed.createComponent(PacksToolPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  await settle(() => expect(el.querySelector('[data-test="unofficial-pack-card"]')).not.toBeNull());
  const button = (text: string, within: ParentNode = el) =>
    [...within.querySelectorAll('button')].find((b) => b.textContent!.trim().includes(text));
  const card = (id: string) => el.querySelector<HTMLElement>(`[data-test="unofficial-pack-card"][data-pack="${id}"]`)!;
  return { el, settle, button, card, packs, creator, router: TestBed.inject(Router) };
}

describe('PacksToolPageComponent pack creator', () => {
  it('Create a pack opens the drafts list', async () => {
    const { settle, button, router } = await render();

    button('Create a pack')!.click();

    await settle(() => expect(router.url).toBe('/tools/pack-creator'));
  });

  it('a link pack card has Duplicate, which copies it into a new draft and opens it, and no Edit as a draft', async () => {
    const { settle, button, card, creator, router } = await render();
    expect(button('Edit as a draft', card('neon'))).toBeUndefined();

    button('Duplicate', card('neon'))!.click();

    await settle(async () => expect((await creator.listDrafts()).length).toBe(1));
    const [draft] = await creator.listDrafts();
    expect(draft.details.id).toBe('neon-copy');
    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
  });

  it('the Base card has Duplicate, which opens a draft of Base', async () => {
    const { el, settle, button, creator, router } = await render();
    const base = el.querySelector<HTMLElement>('[data-test="pack-card"][data-pack="base"]')!;

    button('Duplicate', base)!.click();

    await settle(async () => expect((await creator.listDrafts()).length).toBe(1));
    const [draft] = await creator.listDrafts();
    expect(draft.details.id).toBe('base-copy');
    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
  });

  it('an official card has Duplicate once downloaded, not before', async () => {
    const { el, settle, button, packs } = await render();
    const extra = () => el.querySelector<HTMLElement>('[data-test="pack-card"][data-pack="extra"]')!;
    expect(button('Duplicate', extra())).toBeUndefined();

    await packs.enable('extra');

    await settle(() => expect(button('Duplicate', extra())).toBeDefined());
  });

  it('a pack created on this device is in the unofficial section as created on this device, and can be edited as a draft', async () => {
    const { settle, button, card, creator, packs } = await render();
    const draft = await creator.createDraft();
    await creator.saveDraft({
      ...draft,
      details: {
        id: 'mine',
        name: { en: 'Mine', fr: 'Mien' },
        description: { en: 'My pack', fr: 'Mon pack' },
        version: '1.0.0',
        author: 'Ann Author',
        license: 'CC-BY-4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
    });
    await creator.install(draft.id);
    await packs.load();

    await settle(() => expect(card('mine')).not.toBeNull());

    expect(card('mine').textContent).toContain('Created on this device');
    expect(button('Edit as a draft', card('mine'))).toBeDefined();
    expect(button('Duplicate', card('mine'))).toBeDefined();
  });

  it('official packs have no Edit as a draft button', async () => {
    const { el, button } = await render();

    const official = el.querySelector<HTMLElement>('[data-test="pack-card"][data-pack="base"]')!;

    expect(button('Edit as a draft', official)).toBeUndefined();
  });
});
