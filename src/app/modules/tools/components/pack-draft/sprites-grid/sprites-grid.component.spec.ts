import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { DraftSprite } from '../../../../../core/packs/pack-draft';
import { SpritesGridComponent } from './sprites-grid.component';

/**
 * Contract of `app-sprites-grid`: inputs `draft`, `issues`, output `changed`. Hooks (data-test): `sprite-filter` (p-select, onChange
 * `{ value }` with a sprite kind or null for all), `sprite-card-<id>` with `sprite-image` (img), `sprite-name` and `sprite-kind-tag`
 * (the translated kind, e.g. "Grayscale"); a `p-paginator` when there are more than 12 sprites; the drawer content `sprite-detail`
 * (with `detail-edit`, `detail-delete`) or `sprite-form` (with `sprite-label` (input), `sprite-kind` (p-select, ngModelChange),
 * `form-save`, `form-cancel`). The grid itself holds no input / select / button besides the paginator and the filter.
 * Delete and discard go through `ConfirmationService.confirm`.
 */
const sprite = (id: string, kind: DraftSprite['kind'] = 'grayscale'): DraftSprite => ({
  id,
  label: `Label ${id}`,
  kinds: ['weapon'],
  kind,
  image: new Blob(['png'], { type: 'image/png' }),
});

const seed = (count = 3) =>
  draftOf({
    sprites: Array.from({ length: count }, (_, i) =>
      sprite(`s${String(i + 1).padStart(2, '0')}`, i === 1 ? 'colored' : 'grayscale'),
    ),
  });

describe('SpritesGridComponent', () => {
  const open = (count = 3) => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    return renderEditor(SpritesGridComponent, seed(count));
  };
  type View = Awaited<ReturnType<typeof open>>;
  const confirm = () => vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const settle = async (view: View) => {
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
  };
  const cards = (view: View) =>
    [...view.el.querySelectorAll('[data-test^="sprite-card-"]')].map((c) => c.getAttribute('data-test'));
  const select = async (view: View, id: string) => {
    view.$(`sprite-card-${id}`)!.click();
    await settle(view);
  };
  const press = async (view: View, hook: string) => {
    const host = doc(hook);
    if (!host) throw new Error(`no [data-test="${hook}"]`);
    (host instanceof HTMLButtonElement ? host : (host.querySelector('button') ?? host)).click();
    await settle(view);
  };
  const edit = async (view: View, id: string) => {
    await select(view, id);
    await press(view, 'detail-edit');
  };
  const rename = async (view: View, value: string) => {
    const host = doc('sprite-label')!;
    const input = host instanceof HTMLInputElement ? host : host.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    await settle(view);
  };

  it('shows a thumbnail card per sprite with its image, name and kind tag', async () => {
    const view = await open();

    expect(cards(view)).toEqual(['sprite-card-s01', 'sprite-card-s02', 'sprite-card-s03']);
    const card = view.$('sprite-card-s02')!;
    expect(card.querySelector('[data-test="sprite-image"]')!.getAttribute('src')).toBe('blob:fake');
    expect(card.querySelector('[data-test="sprite-name"]')!.textContent).toContain('Label s02');
    expect(card.querySelector('[data-test="sprite-kind-tag"]')!.textContent!.trim()).toBe('Colored');
    expect(view.$('sprite-card-s01')!.querySelector('[data-test="sprite-kind-tag"]')!.textContent!.trim()).toBe(
      'Grayscale',
    );
  });

  it('has no inline inputs or buttons in the cards', async () => {
    const view = await open();

    for (const id of ['s01', 's02', 's03'])
      expect(view.$(`sprite-card-${id}`)!.querySelector('input, select, button, textarea')).toBeNull();
  });

  it('filters the cards by kind and shows them all again on null', async () => {
    const view = await open();
    const filter = view.fixture.debugElement.query(By.css('[data-test="sprite-filter"]'));

    filter.triggerEventHandler('onChange', { value: 'colored' });
    await settle(view);
    expect(cards(view)).toEqual(['sprite-card-s02']);

    filter.triggerEventHandler('onChange', { value: null });
    await settle(view);
    expect(cards(view)).toHaveLength(3);
  });

  it('paginates 12 cards per page and has no paginator for 12 or fewer', async () => {
    const small = await open(12);
    expect(small.el.querySelector('p-paginator')).toBeNull();
    expect(cards(small)).toHaveLength(12);
    TestBed.resetTestingModule();

    const view = await open(30);
    expect(view.el.querySelector('p-paginator')).not.toBeNull();
    expect(cards(view)).toHaveLength(12);
    expect(cards(view)[0]).toBe('sprite-card-s01');
    [...view.el.querySelectorAll<HTMLElement>('p-paginator button')].find((b) => b.textContent!.trim() === '3')!.click();
    await settle(view);
    expect(cards(view)).toEqual(['s25', 's26', 's27', 's28', 's29', 's30'].map((id) => `sprite-card-${id}`));
  });

  it('opens nothing until a card is clicked, then the read-only detail, without emitting', async () => {
    const view = await open();
    expect(doc('sprite-detail')).toBeNull();

    await select(view, 's01');

    const detail = doc('sprite-detail')!;
    expect(detail.textContent).toContain('Label s01');
    expect(detail.textContent).toContain('weapon');
    expect(detail.textContent).toContain('Grayscale');
    expect(doc('sprite-form')).toBeNull();
    expect(doc('detail-edit')).not.toBeNull();
    expect(doc('detail-delete')).not.toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('the drawer is on the right and blocks the page scroll', async () => {
    const view = await open();

    const drawer = view.fixture.debugElement.query(By.css('p-drawer')).componentInstance;
    const read = (v: unknown) => (typeof v === 'function' ? v() : v);
    expect(read(drawer.position)).toBe('right');
    expect(read(drawer.blockScroll)).toBe(true);
  });

  it('Edit shows the form with the label of the sprite', async () => {
    const view = await open();

    await edit(view, 's01');

    expect(doc('sprite-detail')).toBeNull();
    const host = doc('sprite-label')!;
    const input = host instanceof HTMLInputElement ? host : host.querySelector('input')!;
    expect(input.value).toBe('Label s01');
    expect(doc('sprite-kind')).not.toBeNull();
  });

  it('Save emits the edited sprite only, and nothing before', async () => {
    const view = await open();
    await edit(view, 's01');

    await rename(view, 'Renamed');
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    const sprites = view.last().sprites;
    expect(sprites.map((s) => s.id)).toEqual(['s01', 's02', 's03']);
    expect(sprites[0].label).toBe('Renamed');
    expect(sprites[1].label).toBe('Label s02');
    expect(doc('sprite-form')).toBeNull();
  });

  it('Save emits the edited colouring kind', async () => {
    const view = await open();
    await edit(view, 's01');

    view.fixture.debugElement.query(By.css('[data-test="sprite-kind"]')).triggerEventHandler('ngModelChange', 'colored');
    await settle(view);
    await press(view, 'form-save');

    expect(view.last().sprites[0].kind).toBe('colored');
  });

  it('Cancel without changes closes the drawer without asking', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 's01');

    await press(view, 'form-cancel');

    expect(ask).not.toHaveBeenCalled();
    expect(doc('sprite-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Cancel with changes asks to discard, keeps the form until accepted, and never emits', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 's01');
    await rename(view, 'Renamed');

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc('sprite-form')).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc('sprite-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('closing the drawer with changes asks to discard too', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 's01');
    await rename(view, 'Renamed');

    view.fixture.debugElement.query(By.css('p-drawer')).triggerEventHandler('visibleChange', false);
    await settle(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
  });

  it('Delete asks first and removes the sprite once accepted', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 's02');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    expect(view.last().sprites.map((s) => s.id)).toEqual(['s01', 's03']);
  });

  it('Delete not accepted leaves the draft alone', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 's02');
    await press(view, 'detail-delete');
    (ask.mock.calls[0][0] as { reject?: () => void }).reject?.();

    expect(view.emitted).toEqual([]);
  });

  it('offers Edit in the colorizer on grayscale sprites, emitting the id on colorize, but not on colored ones', async () => {
    const view = await open();
    const ids: string[] = [];
    view.fixture.componentInstance.colorize.subscribe((id: string) => ids.push(id));

    await select(view, 's01');
    await press(view, 'detail-colorizer');
    expect(ids).toEqual(['s01']);
    expect(view.emitted).toEqual([]);

    view.fixture.debugElement.query(By.css('p-drawer')).triggerEventHandler('visibleChange', false);
    await settle(view);
    await select(view, 's02');
    expect(doc('sprite-detail')).not.toBeNull();
    expect(doc('detail-colorizer')).toBeNull();
  });

  it('flags a card whose id is shared with another sprite', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    const view = await renderEditor(
      SpritesGridComponent,
      draftOf({ sprites: [sprite('a'), { ...sprite('b'), id: 'a' }, sprite('c')] }),
    );

    expect(view.el.querySelectorAll('[data-test="sprite-duplicate-id"]')).toHaveLength(2);
  });
});
