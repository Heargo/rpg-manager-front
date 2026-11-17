import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

async function render(language: string | undefined, over: Record<string, unknown> = {}) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const created = await creator.createDraft();
  const draft = { ...created, details: { ...created.details, language }, ...over } as PackDraft;
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
  await settle(() => expect(el.querySelector('[role="tab"]')).not.toBeNull());
  const tab = async (label: string) => {
    [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === label)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { el, settle, tab };
}

const SHARED = { sharedKinds: { gem: {}, ruby: { parent: 'gem' } } };

describe('PackDraftPageComponent Common tab shared kinds', () => {
  it('shows the shared kinds tree above the params for a language draft', async () => {
    const { el, tab, settle } = await render('en', SHARED);
    await tab('Common');

    await settle(() => {
      const tree = el.querySelector('app-kinds-tree-table')!;
      const params = el.querySelector('app-params-editor')!;
      expect(tree).not.toBeNull();
      expect(tree.querySelector('[data-test="kind-row-ruby"]')).not.toBeNull();
      expect(params).not.toBeNull();
      expect(tree.compareDocumentPosition(params) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('shows the Common tab for a neutral draft with the tree only: no params, no common.json', async () => {
    const { el, tab, settle } = await render(undefined, SHARED);
    const labels = [...el.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim());
    expect(labels).toContain('Common');
    await tab('Common');

    await settle(() => {
      expect(el.querySelector('app-kinds-tree-table [data-test="kind-row-ruby"]')).not.toBeNull();
      expect(el.querySelector('app-params-editor')).toBeNull();
      expect(el.querySelector('textarea[data-test="common-json"]')).toBeNull();
    });
  });

  it('warns about texts for a shared kind the draft does not declare, and not for a declared one', async () => {
    const { el, tab, settle } = await render('en', {
      ...SHARED,
      common: { version: 2, kinds: { ruby: { words: [{ text: 'Ruby' }] }, ghost: { words: [{ text: 'Boo' }] } } },
    });
    await tab('Common');

    await settle(() => {
      expect(el.textContent).toContain('shared kind "ghost" has texts but no active pack declares it');
      expect(el.textContent).not.toContain('shared kind "ruby" has texts');
    });
  });
});
