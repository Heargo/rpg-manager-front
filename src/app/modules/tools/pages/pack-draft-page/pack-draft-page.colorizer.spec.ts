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
  label: id,
  kinds: ['item'],
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
    expect(el.querySelectorAll('[data-test^="sprite-card-"]')).toHaveLength(3);
  });
  /** Opens the drawer of a sprite and returns its "Edit in the colorizer" button (`detail-colorizer`), if any. */
  const editButton = async (id: string) => {
    el.querySelector<HTMLElement>(`[data-test="sprite-card-${id}"]`)!.click();
    await vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.querySelector('[data-test="sprite-detail"]')).not.toBeNull();
    });
    const host = document.querySelector<HTMLElement>('[data-test="detail-colorizer"]');
    return host ? (host.querySelector('button') ?? host) : undefined;
  };
  const navigated = () => [...navigate.mock.calls, ...navigateByUrl.mock.calls];
  return { draft, editButton, navigate, navigateByUrl, navigated };
}

describe('PackDraftPageComponent: edit in the colorizer', () => {
  it('offers "Edit in the colorizer" on grayscale and masked sprites in the drawer, not on colored ones', async () => {
    const { editButton } = await render();

    expect(await editButton('gray-one')).toBeDefined();
    expect(await editButton('masked-one')).toBeDefined();
    expect(await editButton('colored-one')).toBeUndefined();
  });

  it('opens the colorizer on the draft and the sprite of the sprite', async () => {
    const { draft, editButton, navigate, navigateByUrl } = await render();

    (await editButton('masked-one'))!.click();

    const url =
      navigateByUrl.mock.calls.length > 0
        ? String(navigateByUrl.mock.calls[0][0])
        : TestBed.inject(Router).serializeUrl(TestBed.inject(Router).createUrlTree(...(navigate.mock.calls[0] as [never, never])));
    expect(decodeURIComponent(url)).toBe(`/tools/sprite-colorizer?draft=${draft.id}&sprite=masked-one`);
  });
});
