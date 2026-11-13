import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { DraftSprite } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

const sprite = (id: string, kind: DraftSprite['kind']): DraftSprite => ({
  id,
  en: id,
  fr: id,
  type: 'item',
  slot: 'none',
  kind,
  image: new Blob(['png'], { type: 'image/png' }),
  ...(kind === 'masked' ? { materials: '{}' } : {}),
});

/** Renders the editor on a draft with a grayscale, a masked and a colored sprite, on its Sprites tab. */
async function render() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const creator = TestBed.inject(PackCreatorBusiness);
  const draft = await creator.createDraft();
  await creator.saveDraft({ ...draft, sprites: [sprite('gray-one', 'grayscale'), sprite('masked-one', 'masked'), sprite('colored-one', 'colored')] });
  const fixture = TestBed.createComponent(PackDraftPageComponent);
  fixture.componentRef.setInput('draftId', draft.id);
  const el = fixture.nativeElement as HTMLElement;
  await vi.waitFor(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('[role="tab"]')).not.toBeNull();
  });
  [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === 'Sprites')!.click();
  await vi.waitFor(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelectorAll('[data-test="sprite-row"]')).toHaveLength(3);
  });
  const editButton = (index: number) =>
    [...el.querySelectorAll('[data-test="sprite-row"]')[index].querySelectorAll('button')].find((b) =>
      b.textContent!.trim().includes('Edit in the colorizer'),
    );
  const navigated = () => [...navigate.mock.calls, ...navigateByUrl.mock.calls];
  return { draft, editButton, navigate, navigateByUrl, navigated };
}

describe('PackDraftPageComponent: edit in the colorizer', () => {
  it('offers "Edit in the colorizer" on grayscale and masked rows, not on colored ones', async () => {
    const { editButton } = await render();

    expect(editButton(0)).toBeDefined();
    expect(editButton(1)).toBeDefined();
    expect(editButton(2)).toBeUndefined();
  });

  it('opens the colorizer on the draft and the sprite of the row', async () => {
    const { draft, editButton, navigate, navigateByUrl } = await render();

    editButton(1)!.click();

    const url =
      navigateByUrl.mock.calls.length > 0
        ? String(navigateByUrl.mock.calls[0][0])
        : TestBed.inject(Router).serializeUrl(TestBed.inject(Router).createUrlTree(...(navigate.mock.calls[0] as [never, never])));
    expect(decodeURIComponent(url)).toBe(`/tools/sprite-colorizer?draft=${draft.id}&sprite=masked-one`);
  });
});
