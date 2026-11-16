import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { DOMAIN_CASES } from '../../../../../testing/pack-draft-domains';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

/** Renders the editor on a saved draft with the given NPC, skill and class kinds, on the Word lists tab. */
async function render(domainDraft: (draft: PackDraft) => Record<string, unknown>) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const created = await creator.createDraft();
  const draft = { ...created, details: { ...created.details, language: 'en' }, ...domainDraft(created) } as PackDraft;
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
  [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === 'Word lists')!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, el, settle };
}

describe.each(DOMAIN_CASES)('PackDraftPageComponent structured $domain section', (c) => {
  const folkDraft = () => ({
    [c.field]: { folk: c.root },
    generators: { [c.domain]: { version: 2, kinds: { folk: { nouns: [{ text: 'Folk' }] } } } },
  });

  it('renders the kinds of the draft in its own section, with their nouns', async () => {
    const { el, settle } = await render(folkDraft);

    await settle(() => {
      const section = el.querySelector(`[data-test="domain-${c.domain}"]`);
      expect(section).not.toBeNull();
      expect(section!.querySelector('[data-test="kind-row-folk"]')!.textContent).toContain('Folk');
    });
  });

  it('exports the kinds texts in the raw JSON, and importing raw JSON updates the structured section', async () => {
    const { el, fixture, settle } = await render(folkDraft);
    const raw = () => el.querySelector<HTMLTextAreaElement>(`textarea[data-test="wordlist-${c.domain}"]`)!;

    await settle(() => expect(JSON.parse(raw().value).kinds.folk.nouns).toEqual([{ text: 'Folk' }]));

    raw().value = JSON.stringify({ version: 2, kinds: { folk: { nouns: [{ text: 'Villager' }] } } });
    raw().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await settle(() =>
      expect(el.querySelector(`[data-test="domain-${c.domain}"] [data-test="kind-row-folk"]`)!.textContent).toContain(
        'Villager',
      ),
    );
  });
});
