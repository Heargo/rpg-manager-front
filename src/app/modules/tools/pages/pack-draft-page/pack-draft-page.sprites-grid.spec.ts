import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { neonProviders } from '../../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { DraftSprite } from '../../../../core/packs/pack-draft';
import { PackDraftPageComponent } from './pack-draft-page.component';

const sprite = (id: string): DraftSprite => ({
  id,
  label: `Label ${id}`,
  kinds: ['item'],
  kind: 'grayscale',
  image: new Blob(['png'], { type: 'image/png' }),
});

async function render() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    imports: [PackDraftPageComponent],
    providers: [...TEST_PROVIDERS, ...neonProviders().providers],
  });
  const creator = TestBed.inject(PackCreatorBusiness);
  const draft = await creator.createDraft();
  await creator.saveDraft({ ...draft, sprites: [sprite('s01'), sprite('s02')] });
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
  [...el.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === 'Sprites')!.click();
  await settle(() => expect(el.querySelector('app-sprites-grid')).not.toBeNull());
  return { fixture, el, creator, draft, settle };
}

describe('PackDraftPageComponent Sprites tab grid', () => {
  it('renders the sprites grid and no inline sprite rows', async () => {
    const { el } = await render();

    expect(el.querySelector('app-sprites-grid')).not.toBeNull();
    expect(el.querySelectorAll('[data-test^="sprite-card-"]')).toHaveLength(2);
    expect(el.querySelector('[data-test="sprite-row"]')).toBeNull();
  });

  it('has a single Add menu button instead of the upload, select and add controls', async () => {
    const { el } = await render();

    const add = el.querySelector<HTMLElement>('[data-test="add-sprite"]')!;
    expect(add).not.toBeNull();
    expect(el.querySelector('p-fileupload')).toBeNull();
    expect(el.querySelector('p-select')).toBeNull();
  });

  it('the Add button opens a menu with the upload PNG and from my sprites entries', async () => {
    const { el, fixture, settle } = await render();

    (el.querySelector<HTMLElement>('[data-test="add-sprite"]')!.querySelector('button') ??
      el.querySelector<HTMLElement>('[data-test="add-sprite"]')!).click();

    await settle(() => {
      const text = document.body.textContent!;
      expect(text).toContain('Add a PNG image');
      expect(text).toContain('From my sprites');
    });
    expect(fixture.debugElement.query(By.css('p-menu'))).not.toBeNull();
  });

  it('a save from the grid lands in the draft', async () => {
    const { el, settle, creator, draft } = await render();
    el.querySelector<HTMLElement>('[data-test="sprite-card-s02"]')!.click();
    await settle(() => expect(document.querySelector('[data-test="detail-edit"]')).not.toBeNull());
    const edit = document.querySelector<HTMLElement>('[data-test="detail-edit"]')!;
    (edit.querySelector('button') ?? edit).click();
    await settle(() => expect(document.querySelector('[data-test="sprite-label"]')).not.toBeNull());

    const host = document.querySelector<HTMLElement>('[data-test="sprite-label"]')!;
    const input = host instanceof HTMLInputElement ? host : host.querySelector('input')!;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const save = document.querySelector<HTMLElement>('[data-test="form-save"]')!;
    (save.querySelector('button') ?? save).click();

    await vi.waitFor(
      async () => {
        const sprites = (await creator.getDraft(draft.id))!.sprites;
        expect(sprites.find((s) => s.id === 's02')!.label).toBe('Renamed');
        expect(sprites.find((s) => s.id === 's01')!.label).toBe('Label s01');
      },
      { timeout: 3000 },
    );
  });

  it('a delete from the grid lands in the draft', async () => {
    const { el, settle, creator, draft } = await render();
    const ask = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    el.querySelector<HTMLElement>('[data-test="sprite-card-s01"]')!.click();
    await settle(() => expect(document.querySelector('[data-test="detail-delete"]')).not.toBeNull());
    const del = document.querySelector<HTMLElement>('[data-test="detail-delete"]')!;
    (del.querySelector('button') ?? del).click();
    await settle(() => expect(ask).toHaveBeenCalled());

    (ask.mock.calls[0][0] as { accept: () => void }).accept();

    await vi.waitFor(
      async () => {
        expect((await creator.getDraft(draft.id))!.sprites.map((s) => s.id)).toEqual(['s02']);
      },
      { timeout: 3000 },
    );
  });
});
