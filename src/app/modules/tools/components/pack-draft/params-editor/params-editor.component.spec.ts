import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { ParamsEditorComponent } from './params-editor.component';

/**
 * Contract of `app-params-editor` (table + right drawer, like `app-tints-table`): inputs `draft`, `issues`, output `changed`.
 * Hooks (data-test): `param-row-<name>` (tr) with `cell-name`, `cell-count` (the entries count) and `cell-entries`
 * (at most 3 `fit-item` chips then a `fit-more` "+N"); toolbar `add-param` above the table; drawer content `param-detail`
 * (with `detail-edit`, `detail-delete`) or `param-form` (with `param-name`, `param-entries` a textarea one entry per line,
 * `form-save`, `form-cancel`); `issue`. Delete and discard go through `ConfirmationService.confirm`.
 */
const seed = (...rest: [language?: string]) =>
  draftOf({ common: { version: 2, params: { maker: ['a hermit', 'a queen', 'a fool', 'a thief', 'a monk'], place: ['a cave'] } } }, ...rest);

describe('ParamsEditorComponent', () => {
  const open = (issues: unknown[] = [], ...rest: [language?: string]) => renderEditor(ParamsEditorComponent, seed(...rest), issues);
  type View = Awaited<ReturnType<typeof open>>;
  const confirm = () => vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const settle = async (view: View) => {
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
  };
  const press = async (view: View, hook: string) => {
    const host = doc(hook);
    if (!host) throw new Error(`no [data-test="${hook}"]`);
    (host instanceof HTMLButtonElement ? host : (host.querySelector('button') ?? host)).click();
    await settle(view);
  };
  const type = async (view: View, hook: string, value: string) => {
    const host = doc(hook)!;
    const input = host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : host.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    await settle(view);
  };
  const select = async (view: View, name: string) => {
    view.$(`param-row-${name}`)!.click();
    await settle(view);
  };
  const edit = async (view: View, name: string) => {
    await select(view, name);
    await press(view, 'detail-edit');
  };

  it('shows a row per param with its name, entries count and 3 entry chips and a +2', async () => {
    const view = await open();

    expect([...view.el.querySelectorAll('[data-test^="param-row-"]')].map((r) => r.getAttribute('data-test'))).toEqual([
      'param-row-maker',
      'param-row-place',
    ]);
    const row = view.$('param-row-maker')!;
    expect(row.querySelector('[data-test="cell-name"]')!.textContent).toContain('maker');
    expect(row.querySelector('[data-test="cell-count"]')!.textContent!.trim()).toBe('5');
    const entries = row.querySelector('[data-test="cell-entries"]')!;
    expect([...entries.querySelectorAll('[data-test="fit-item"]')].map((e) => e.textContent!.trim())).toEqual([
      'a hermit',
      'a queen',
      'a fool',
    ]);
    expect(entries.querySelector('[data-test="fit-more"]')!.textContent!.trim()).toBe('+2');
    expect(view.$('param-row-place')!.querySelector('[data-test="fit-more"]')).toBeNull();
  });

  it('has no inline inputs or buttons in the rows', async () => {
    const view = await open();

    for (const name of ['maker', 'place']) {
      expect(view.$(`param-row-${name}`)!.querySelector('input, textarea, button')).toBeNull();
    }
    expect(view.$('param-new-entry')).toBeNull();
    expect(view.$('remove-param')).toBeNull();
  });

  it('puts Add param above the table', async () => {
    const view = await open();

    const add = view.$('add-param')!;
    const table = view.el.querySelector('table')!;
    expect(add.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the drawer blocks the page scroll', async () => {
    const view = await open();

    const drawer = view.fixture.debugElement.query(By.css('p-drawer')).componentInstance;
    const blocked = typeof drawer.blockScroll === 'function' ? drawer.blockScroll() : drawer.blockScroll;
    expect(blocked).toBe(true);
  });

  it('opens nothing until a row is clicked, then the read-only detail of that param, without emitting', async () => {
    const view = await open();
    expect(doc('param-detail')).toBeNull();

    await select(view, 'maker');

    const detail = doc('param-detail')!;
    expect(detail.textContent).toContain('maker');
    expect(detail.textContent).toContain('a hermit');
    expect(doc('param-form')).toBeNull();
    expect(doc('detail-edit')).not.toBeNull();
    expect(doc('detail-delete')).not.toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Edit switches the drawer to the form with the name and the entries one per line', async () => {
    const view = await open();

    await edit(view, 'place');

    expect(doc('param-detail')).toBeNull();
    const form = doc('param-form')!;
    expect(form.querySelector<HTMLInputElement>('[data-test="param-name"]')!.value).toBe('place');
    expect((form.querySelector('[data-test="param-entries"]') as HTMLTextAreaElement).value).toBe('a cave');
  });

  it('Save emits the draft with the edited entries and nothing before', async () => {
    const view = await open();
    await edit(view, 'place');

    await type(view, 'param-entries', 'a cave\na tower');
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    expect((view.last().common as any).params.place).toEqual(['a cave', 'a tower']);
    expect((view.last().common as any).params.maker).toHaveLength(5);
    expect(doc('param-form')).toBeNull();
  });

  it('Save renames the param', async () => {
    const view = await open();
    await edit(view, 'place');

    await type(view, 'param-name', 'spot');
    await press(view, 'form-save');

    expect(Object.keys((view.last().common as any).params)).toEqual(['maker', 'spot']);
    expect((view.last().common as any).params.spot).toEqual(['a cave']);
  });

  it('Add param opens an empty form and Save adds a param with its entries', async () => {
    const view = await open();

    await view.click('add-param');
    expect(doc('param-form')!.querySelector<HTMLInputElement>('[data-test="param-name"]')!.value).toBe('');
    await type(view, 'param-name', 'weather');
    await type(view, 'param-entries', 'rain\nsnow');
    await press(view, 'form-save');

    expect((view.last().common as any).params.weather).toEqual(['rain', 'snow']);
    expect(Object.keys((view.last().common as any).params)).toEqual(['maker', 'place', 'weather']);
  });

  it('Cancel without changes closes the drawer without asking', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'place');

    await press(view, 'form-cancel');

    expect(ask).not.toHaveBeenCalled();
    expect(doc('param-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Cancel with changes asks to discard, keeps the form until accepted, and never emits', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'place');
    await type(view, 'param-entries', 'a cave\na tower');

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc('param-form')).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc('param-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('closing the drawer with changes asks to discard too', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'place');
    await type(view, 'param-entries', 'a tower');

    view.fixture.debugElement.query(By.css('p-drawer')).triggerEventHandler('visibleChange', false);
    await settle(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
  });

  it('Delete asks first and removes the param once accepted', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'maker');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    expect(Object.keys((view.last().common as any).params)).toEqual(['place']);
  });

  it('removing the last param leaves no common texts', async () => {
    const view = await renderEditor(
      ParamsEditorComponent,
      draftOf({ common: { version: 2, params: { maker: ['a hermit'] } } }),
    );
    const ask = confirm();

    view.$('param-row-maker')!.click();
    await settle(view);
    await press(view, 'detail-delete');
    (ask.mock.calls[0][0] as { accept: () => void }).accept();

    expect(view.last().common).toBeUndefined();
  });

  it('shows an issue on the row of its param and not on the others', async () => {
    const view = await open([{ level: 'warning', param: 'maker', message: 'param {maker} is not used' }]);

    const row = view.$('param-row-maker')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('param {maker} is not used');
    expect(view.$('param-row-place')!.textContent).not.toContain('is not used');
  });

  it('is empty for a neutral draft: params are language texts', async () => {
    const view = await renderEditor(ParamsEditorComponent, draftOf({}, undefined));

    expect(view.$('add-param')).toBeNull();
  });
});
