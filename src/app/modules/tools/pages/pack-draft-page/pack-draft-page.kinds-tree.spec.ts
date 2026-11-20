import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraftPageComponent } from './pack-draft-page.component';

async function render() {
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
  const tab = async (label: string) => {
    [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === label)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { el, settle, tab };
}

describe('PackDraftPageComponent kinds tree tables', () => {
  it.each(['Items', 'NPCs', 'Skills', 'Classes'])('%s shows its kinds in the tree table, not the card list editors', async (label) => {
    const { el, settle, tab } = await render();
    await tab(label);

    await settle(() => {
      expect(el.querySelectorAll('app-kinds-tree-table')).toHaveLength(1);
      expect(el.querySelector('app-kinds-editor')).toBeNull();
      expect(el.querySelector('app-domain-kinds-editor')).toBeNull();
    });
  });
});
