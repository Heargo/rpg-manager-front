import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

/** Renders the editor on a saved draft, with a language or neutral (no language). */
async function render(language: string | undefined) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const created = await creator.createDraft();
  const draft = { ...created, details: { ...created.details, language } } as PackDraft;
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
  const labels = () => [...el.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim());
  const tab = async (label: string) => {
    [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === label)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const has = (selector: string) => el.querySelector(selector) !== null;
  await settle(() => expect(el.querySelector('[role="tab"]')).not.toBeNull());
  return { el, settle, labels, tab, has };
}

describe('PackDraftPageComponent word list tabs', () => {
  it('has the tabs Details, Common, Items, NPCs, Skills, Classes, Sprites, Publish and no Word lists', async () => {
    const { labels } = await render('en');

    expect(labels()).toEqual(['Details', 'Common', 'Items', 'NPCs', 'Skills', 'Classes', 'Sprites', 'Publish']);
  });

  it('Common holds the params editor and the common.json panel, and nothing of the other domains', async () => {
    const { tab, settle, has } = await render('en');
    await tab('Common');

    await settle(() => {
      expect(has('app-params-editor')).toBe(true);
      expect(has('textarea[data-test="common-json"]')).toBe(true);
      expect(has('[data-test="domain-npcs"]')).toBe(false);
      expect(has('textarea[data-test="wordlist-items"]')).toBe(false);
      expect(has('textarea[data-test="wordlist-npcs"]')).toBe(false);
    });
  });

  it('Items holds kinds, tints, common item words, templates and the items JSON only', async () => {
    const { tab, settle, has } = await render('en');
    await tab('Items');

    await settle(() => {
      expect(has('app-kinds-tree-table')).toBe(true);
      expect(has('app-tints-table')).toBe(true);
      expect(has('app-common-words-editor')).toBe(true);
      expect(has('app-templates-editor')).toBe(true);
      expect(has('textarea[data-test="wordlist-items"]')).toBe(true);
      expect(has('app-params-editor')).toBe(false);
      expect(has('textarea[data-test="common-json"]')).toBe(false);
      expect(has('[data-test="domain-npcs"]')).toBe(false);
    });
  });

  it.each([
    ['NPCs', 'npcs'],
    ['Skills', 'skills'],
    ['Classes', 'classes'],
  ])('%s holds its kinds and texts editors and its own JSON only', async (label, domain) => {
    const { tab, settle, has, el } = await render('en');
    await tab(label);

    await settle(() => {
      expect(has(`[data-test="domain-${domain}"] app-kinds-tree-table`)).toBe(true);
      expect(has(`[data-test="domain-${domain}"] app-domain-texts-editor`)).toBe(true);
      expect(has(`textarea[data-test="wordlist-${domain}"]`)).toBe(true);
      expect(el.querySelectorAll('app-kinds-tree-table')).toHaveLength(1);
      expect(has('app-params-editor')).toBe(false);
      for (const other of ['npcs', 'skills', 'classes'].filter((d) => d !== domain))
        expect(has(`[data-test="domain-${other}"]`)).toBe(false);
    });
  });

  it('a neutral draft shows the Common tab with the tree only, and hides the texts editors', async () => {
    const { labels, tab, settle, has } = await render(undefined);

    expect(labels()).toContain('Common');
    await tab('Common');
    await settle(() => {
      expect(has('app-kinds-tree-table')).toBe(true);
      expect(has('app-params-editor')).toBe(false);
    });
    expect(labels()).toContain('NPCs');
    await tab('NPCs');
    await settle(() => {
      expect(has('[data-test="domain-npcs"] app-kinds-tree-table')).toBe(true);
      expect(has('app-domain-texts-editor')).toBe(false);
    });
  });

  it('shows the clicked tab as the selected one', async () => {
    const { tab, settle, has, el } = await render('en');
    await tab('Skills');
    await settle(() => expect(has('[data-test="domain-skills"]')).toBe(true));

    const selected = el.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!;
    expect(selected.textContent!.trim()).toBe('Skills');
  });
});
