import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraftPageComponent } from './pack-draft-page.component';

describe('PackDraftPageComponent Items tab tints', () => {
  it('shows the tints table in place of the tints card editor', async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      imports: [PackDraftPageComponent],
      providers: [...TEST_PROVIDERS, ...neonProviders().providers],
    });
    const draft = await TestBed.inject(PackCreatorBusiness).createDraft();
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

    [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === 'Items')!.click();

    await settle(() => {
      expect(el.querySelector('app-tints-table')).not.toBeNull();
      expect(el.querySelector('app-tints-editor')).toBeNull();
    });
  });
});
