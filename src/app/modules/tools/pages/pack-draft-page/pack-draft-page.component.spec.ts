import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { EXTRA_ITEMS } from '../../../../../testing/extra-pack';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { PackStorageService } from '../../../../core/services/pack-storage.service';
import { PackDraftPageComponent } from './pack-draft-page.component';

const validDetails = (): PackDraft['details'] => ({
  id: 'mine',
  language: 'fr',
  name: 'Mien',
  description: 'Mon pack',
  version: '1.0.0',
  author: 'Ann Author',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
});

/** Renders the editor on a saved draft (`draftId` input); `prepare` may change the draft first. */
async function render(prepare: (draft: PackDraft) => PackDraft = (d) => d) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const draft = prepare(await creator.createDraft());
  await creator.saveDraft(draft);
  const fixture = TestBed.createComponent(PackDraftPageComponent);
  fixture.componentRef.setInput('draftId', draft.id);
  const el = fixture.nativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  const $ = <T extends HTMLElement>(selector: string) => el.querySelector<T>(selector);
  const tab = async (label: string) => {
    const header = [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === label)!;
    header.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const type = (selector: string, value: string) => {
    const input = $<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent!.trim().includes(text));
  await settle(() => expect(el.querySelector('[role="tab"]')).not.toBeNull());
  return { fixture, el, creator, draft, settle, $, tab, type, button, storage: TestBed.inject(PackStorageService) };
}

describe('PackDraftPageComponent', () => {
  it('has the four tabs: Details, Word lists, Sprites, Publish', async () => {
    const { el } = await render();

    const labels = [...el.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim());

    expect(labels).toEqual(['Details', 'Word lists', 'Sprites', 'Publish']);
  });

  it('has one name and one description field, and no per-language ones', async () => {
    const { $ } = await render();

    expect($('input[data-test="draft-name"]')).not.toBeNull();
    expect($('[data-test="draft-description"]')).not.toBeNull();
    expect($('[data-test="draft-name-en"]')).toBeNull();
    expect($('[data-test="draft-name-fr"]')).toBeNull();
    expect($('[data-test="draft-description-en"]')).toBeNull();
    expect($('[data-test="draft-description-fr"]')).toBeNull();
  });

  it('has a language select showing the language of the draft', async () => {
    const { $ } = await render((d) => ({ ...d, details: { ...d.details, language: 'fr' } }));

    const select = $('p-select[data-test="draft-language"]');

    expect(select).not.toBeNull();
    expect(select!.textContent).toContain('Français');
  });

  it('shows four word list slots, one per generator', async () => {
    const { el, tab } = await render();
    await tab('Word lists');

    const slots = [...el.querySelectorAll('textarea[data-test^="wordlist-"]')].map((t) => t.getAttribute('data-test'));

    expect(slots).toEqual(['wordlist-items', 'wordlist-npcs', 'wordlist-skills', 'wordlist-classes']);
  });

  it('derives the id from the name as it is typed', async () => {
    const { settle, $, type } = await render();

    type('input[data-test="draft-name"]', 'Épée de Feu');

    await settle(() => expect($<HTMLInputElement>('input[data-test="draft-id"]')!.value).toBe('epee-de-feu'));
  });

  it('autosaves the details so the draft comes back as it was left', async () => {
    const { creator, draft, type } = await render();

    type('input[data-test="draft-name"]', 'Neon lights');

    await vi.waitFor(async () => expect((await creator.getDraft(draft.id))?.details.name).toBe('Neon lights'), { timeout: 3000 });
  });

  it('shows the validators error live under an invalid word list, and none once it is valid', async () => {
    const { settle, $, tab, type } = await render();
    await tab('Word lists');

    type('textarea[data-test="wordlist-items"]', '{');
    await settle(() => expect($('[data-test="wordlist-error-items"]')!.textContent).toContain('JSON'));

    type('textarea[data-test="wordlist-items"]', '{"version":1}');
    await settle(() => expect($('[data-test="wordlist-error-items"]')!.textContent!.trim()).not.toBe(''));

    type('textarea[data-test="wordlist-items"]', JSON.stringify(EXTRA_ITEMS));
    await settle(() => expect($('[data-test="wordlist-error-items"]')).toBeNull());
  });

  it('Install on this device lists the errors of an invalid draft and stores nothing', async () => {
    const { settle, $, tab, button, storage } = await render();
    await tab('Publish');

    button('Install on this device')!.click();

    await settle(() => expect($('[data-test="publish-errors"]')!.textContent).toContain('author'));
    expect(await storage.list()).toEqual([]);
  });

  it('Install on this device stores a valid draft as a local pack', async () => {
    const { settle, tab, button, storage } = await render((d) => ({
      ...d,
      details: validDetails(),
      generators: { items: EXTRA_ITEMS },
    }));
    await tab('Publish');

    button('Install on this device')!.click();

    await settle(async () => expect((await storage.list()).map((p) => p.id)).toEqual(['mine']));
    expect((await storage.list())[0].source).toEqual({ kind: 'local' });
  });

  it('Export calls the business, and lists the errors of an invalid draft', async () => {
    const { settle, $, tab, button, creator, draft } = await render();
    const exportZip = vi.spyOn(creator, 'exportZip');
    await tab('Publish');

    button('Export')!.click();

    await settle(() => expect($('[data-test="publish-errors"]')!.textContent).toContain('author'));
    expect(exportZip).toHaveBeenCalledWith(draft.id);
  });

  it('Export of a valid draft downloads the zip', async () => {
    const { settle, tab, button, creator } = await render((d) => ({ ...d, details: validDetails() }));
    const exportZip = vi.spyOn(creator, 'exportZip');
    await tab('Publish');

    button('Export')!.click();

    await settle(() => expect(exportZip).toHaveBeenCalled());
    await settle(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });
});
