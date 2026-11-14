import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { PackDraftPageComponent } from './pack-draft-page.component';

async function setup() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const a = await creator.createDraft();
  const b = await creator.createDraft();
  const fixture = TestBed.createComponent(PackDraftPageComponent);
  fixture.componentRef.setInput('draftId', a.id);
  const settle = (check: () => void) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      check();
    });
  await settle(() =>
    expect(
      fixture.nativeElement.querySelector('input[data-test="draft-name"]'),
    ).not.toBeNull(),
  );
  return { creator, fixture, a, b, settle };
}

describe('PackDraftPageComponent lifecycle', () => {
  it('does not save an unchanged draft when destroyed', async () => {
    const { creator, fixture, a } = await setup();
    const save = vi.spyOn(creator, 'saveDraft');

    fixture.destroy();

    expect(save).not.toHaveBeenCalled();
    expect((await creator.getDraft(a.id))?.updatedAt).toBe(a.updatedAt);
  });

  it('saves pending edits before another draft is loaded', async () => {
    const { creator, fixture, a, b, settle } = await setup();
    const input = fixture.nativeElement.querySelector(
      'input[data-test="draft-name"]',
    ) as HTMLInputElement;
    input.value = 'Edited';
    input.dispatchEvent(new Event('input'));

    fixture.componentRef.setInput('draftId', b.id);

    await settle(async () =>
      expect((await creator.getDraft(a.id))?.details.name).toBe('Edited'),
    );
    await vi.waitFor(async () =>
      expect((await creator.getDraft(a.id))?.details.name).toBe('Edited'),
    );
  });
});
