import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorPageComponent } from './pack-creator-page.component';
import { routesTools } from '../../tools.routes';

@Component({ template: '' })
class Blank {}

async function render() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackCreatorPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      ...neonProviders().providers,
      provideRouter([
        { path: 'tools/packs', component: Blank },
        { path: 'tools/pack-creator/:draftId', component: Blank },
      ]),
    ],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const fixture = TestBed.createComponent(PackCreatorPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  const rows = () => el.querySelectorAll<HTMLElement>('[data-test="draft-row"]');
  const button = (text: string, within: ParentNode = document.body) =>
    [...within.querySelectorAll('button')].find((b) => b.textContent!.trim().includes(text));
  return { fixture, el, creator, settle, rows, button, router: TestBed.inject(Router) };
}

describe('PackCreatorPageComponent', () => {
  afterEach(() => {
    document.body.querySelectorAll('.p-dialog-mask, p-confirmdialog, p-dialog').forEach((n) => n.remove());
  });

  it('is routed at tools/pack-creator and tools/pack-creator/:draftId', () => {
    const paths = routesTools.map((r) => r.path);

    expect(paths).toContain('tools/pack-creator');
    expect(paths).toContain('tools/pack-creator/:draftId');
  });

  it('is titled My packs, with a back link to the packs page', async () => {
    const { el, settle, router } = await render();

    await settle(() => expect(el.querySelector('h1')).not.toBeNull());

    expect(el.querySelector('h1')!.textContent).toContain('My packs');
    const back = [...el.querySelectorAll('a')].find((a) => a.textContent!.includes('Back to the packs'))!;
    expect(back).toBeDefined();
    back.click();
    await settle(() => expect(router.url).toBe('/tools/packs'));
  });

  it('lists the drafts as cards with name, language tag, date and an Open and Delete button', async () => {
    const { creator, settle, rows, button } = await render();
    const draft = await creator.createDraft();
    await creator.saveDraft({ ...draft, details: { ...draft.details, name: 'Neon lights', language: 'fr' } });

    await settle(() => expect(rows().length).toBe(1));

    const row = rows()[0];
    expect(row.querySelector('[data-test="draft-name"]')!.textContent).toContain('Neon lights');
    expect(row.querySelector('[data-test="draft-name"]')!.classList).toContain('line-clamp-2');
    expect(row.querySelector('[data-test="draft-language"]')!.textContent).toContain('Français');
    expect(row.querySelector('[data-test="draft-date"]')!.textContent).toContain('Updated');
    expect(button('Open', row)).toBeDefined();
    expect(button('Delete', row)).toBeDefined();
  });

  it('a draft with no name is Untitled pack, and one with no language is tagged Neutral', async () => {
    const { creator, settle, rows } = await render();
    const draft = await creator.createDraft();
    const { language: _language, ...details } = draft.details;
    await creator.saveDraft({ ...draft, details: details as typeof draft.details });

    await settle(() => expect(rows().length).toBe(1));

    expect(rows()[0].querySelector('[data-test="draft-name"]')!.textContent).toContain('Untitled pack');
    expect(rows()[0].querySelector('[data-test="draft-language"]')!.textContent).toContain('Neutral');
  });

  it('lists the newest change first', async () => {
    const { creator, settle, rows } = await render();
    const now = vi.spyOn(Date, 'now');
    for (const [name, at] of [['Old', 1_000_000], ['Newest', 3_000_000], ['Middle', 2_000_000]] as const) {
      const draft = await creator.createDraft();
      now.mockReturnValue(at);
      await creator.saveDraft({ ...draft, details: { ...draft.details, name } });
    }
    now.mockRestore();

    await settle(() => expect(rows().length).toBe(3));

    const names = [...rows()].map((r) => r.querySelector('[data-test="draft-name"]')!.textContent!.trim());
    expect(names).toEqual(['Newest', 'Middle', 'Old']);
  });

  it('clicking the card opens the draft', async () => {
    const { creator, settle, rows, router } = await render();
    const draft = await creator.createDraft();
    await settle(() => expect(rows().length).toBe(1));

    rows()[0].querySelector<HTMLElement>('[data-test="draft-name"]')!.click();

    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
  });

  it('the Delete button asks to confirm without opening the draft', async () => {
    const { creator, settle, rows, button, router } = await render();
    await creator.createDraft();
    await settle(() => expect(rows().length).toBe(1));

    button('Delete', rows()[0])!.click();

    await settle(() => expect(document.body.querySelector('p-confirmdialog, .p-confirmdialog')).not.toBeNull());
    expect(router.url).not.toContain('/tools/pack-creator/');
  });

  it('Create a pack creates a draft and opens it', async () => {
    const { creator, settle, button, router } = await render();
    await settle(() => expect(button('Create a pack')).toBeDefined());

    button('Create a pack')!.click();

    await settle(async () => expect((await creator.listDrafts()).length).toBe(1));
    const [draft] = await creator.listDrafts();
    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
  });

  it('with no drafts, shows a message and the Create a pack button', async () => {
    const { el, settle, rows, button } = await render();

    await settle(() => expect(el.querySelector('[data-test="drafts-empty"]')).not.toBeNull());

    expect(rows().length).toBe(0);
    expect(el.querySelector('[data-test="drafts-empty"]')!.textContent).toContain('No draft yet.');
    expect(button('Create a pack', el.querySelector('[data-test="drafts-empty"]')!)).toBeDefined();
  });

  it('Open goes to the draft', async () => {
    const { creator, settle, rows, button, router } = await render();
    const draft = await creator.createDraft();
    await settle(() => expect(rows().length).toBe(1));

    button('Open', rows()[0])!.click();

    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
  });

  it('Delete asks to confirm, then removes the draft', async () => {
    const { creator, settle, rows, button } = await render();
    await creator.createDraft();
    await settle(() => expect(rows().length).toBe(1));

    button('Delete', rows()[0])!.click();
    await settle(() => expect(document.body.querySelector('p-confirmdialog, .p-confirmdialog')).not.toBeNull());
    expect(await creator.listDrafts()).toHaveLength(1);
    const accept = document.body.querySelector<HTMLButtonElement>('.p-confirmdialog-accept-button, [data-test="confirm-accept"]')!;
    accept.click();

    await settle(() => expect(rows().length).toBe(0));
    expect(await creator.listDrafts()).toEqual([]);
  });
});
