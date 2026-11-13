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
      provideRouter([{ path: 'tools/pack-creator/:draftId', component: Blank }]),
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

  it('lists the drafts with their name and an Open and Delete button', async () => {
    const { creator, settle, rows, button } = await render();
    const draft = await creator.createDraft();
    await creator.saveDraft({ ...draft, details: { ...draft.details, name: { en: 'Neon lights', fr: 'Néons' } } });

    await settle(() => expect(rows().length).toBe(1));

    expect(rows()[0].textContent).toContain('Neon lights');
    expect(button('Open', rows()[0])).toBeDefined();
    expect(button('Delete', rows()[0])).toBeDefined();
  });

  it('New draft creates a draft and opens it', async () => {
    const { creator, settle, button, router } = await render();
    await settle(() => expect(button('New draft')).toBeDefined());

    button('New draft')!.click();

    await settle(async () => expect((await creator.listDrafts()).length).toBe(1));
    const [draft] = await creator.listDrafts();
    await settle(() => expect(router.url).toBe(`/tools/pack-creator/${draft.id}`));
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
