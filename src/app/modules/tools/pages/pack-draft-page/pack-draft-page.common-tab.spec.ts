import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraftPageComponent } from './pack-draft-page.component';

describe('PackDraftPageComponent Common tab', () => {
  it('shows the params table with its Add param, and common.json only inside the Advanced panel', async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      imports: [PackDraftPageComponent],
      providers: [...TEST_PROVIDERS, ...neonProviders().providers],
    });
    const creator = TestBed.inject(PackCreatorBusiness);
    const created = await creator.createDraft();
    const draft = { ...created, common: { version: 2, params: { maker: ['a hermit'] } } } as typeof created;
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

    [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === 'Common')!.click();

    await settle(() => {
      const params = el.querySelector('app-params-editor')!;
      expect(params.querySelector('[data-test="add-param"]')).not.toBeNull();
      expect(params.querySelector('table [data-test="param-row-maker"]')).not.toBeNull();
      expect(params.querySelector('[data-test="param-new-entry"]')).toBeNull();
      expect(params.querySelector('textarea[data-test="common-json"]')).toBeNull();
      const json = el.querySelector('textarea[data-test="common-json"]')!;
      expect(json).not.toBeNull();
      expect(json.closest('p-panel')).not.toBeNull();
      expect(json.closest('p-panel')!.textContent).toContain('Advanced');
    });
  });
});
