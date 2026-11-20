import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { CommonWordsEditorComponent } from './common-words-editor.component';

/**
 * Contract of `app-common-words-editor` (a table of words + right drawer, like `app-tints-table`): inputs `draft`, `issues`,
 * output `changed`. One row per common adjective or suffix: `word-row-<adjective|suffix>-<rarity>-<index>` (tr) with
 * `cell-type` ("Adjective" / "Suffix"), `cell-rarity` (the translated rarity, "Common", "Mythic"...) and `cell-text` (the
 * word line, forms joined by "|"); toolbar `add-word`; always visible, no collapse toggle. Drawer content `word-detail`
 * (with `detail-edit`, `detail-delete`) or `word-form` (with `word-type` and `word-rarity` p-select, `word-m`, `word-f`,
 * `word-mp`, `word-fp` for an adjective, `word-suffix` for a suffix, `form-save`, `form-cancel`). Delete and discard go
 * through `ConfirmationService.confirm`.
 */
const OLD = { m: 'Vieux', f: 'Vieille', mp: 'Vieux', fp: 'Vieilles' };
const seed = (...rest: [language?: string]) =>
  draftOf(
    { generators: { items: { version: 2, adjectives: { common: [OLD, 'Dusty'] }, suffixes: { mythic: ['of the Ancients'] } } } },
    ...rest,
  );

describe('CommonWordsEditorComponent', () => {
  const open = (...rest: [language?: string]) => renderEditor(CommonWordsEditorComponent, seed(...rest));
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
  const select = async (view: View, hook: string) => {
    view.$(hook)!.click();
    await settle(view);
  };
  const choose = async (view: View, hook: string, value: string) => {
    view.fixture.debugElement.query(By.css(`[data-test="${hook}"]`)).triggerEventHandler('onChange', { value });
    await settle(view);
  };
  const items = (view: View) => view.last().generators.items as any;

  it('shows one row per common adjective and suffix, with its type, rarity and text', async () => {
    const view = await open();

    expect([...view.el.querySelectorAll('[data-test^="word-row-"]')].map((r) => r.getAttribute('data-test'))).toEqual([
      'word-row-adjective-common-0',
      'word-row-adjective-common-1',
      'word-row-suffix-mythic-0',
    ]);
    const first = view.$('word-row-adjective-common-0')!;
    expect(first.querySelector('[data-test="cell-type"]')!.textContent).toContain('Adjective');
    expect(first.querySelector('[data-test="cell-rarity"]')!.textContent).toContain('Common');
    expect(first.querySelector('[data-test="cell-text"]')!.textContent).toContain('Vieux|Vieille|Vieux|Vieilles');
    const suffix = view.$('word-row-suffix-mythic-0')!;
    expect(suffix.querySelector('[data-test="cell-type"]')!.textContent).toContain('Suffix');
    expect(suffix.querySelector('[data-test="cell-rarity"]')!.textContent).toContain('Mythic');
    expect(suffix.querySelector('[data-test="cell-text"]')!.textContent).toContain('of the Ancients');
  });

  it('is always shown, with no inline inputs or buttons in the rows and no collapse toggle', async () => {
    const view = await open();

    expect(view.$('toggle-common-words')).toBeNull();
    expect(view.$('add-word')).not.toBeNull();
    expect(view.$('common-new-suffix-mythic')).toBeNull();
    expect(view.$('word-row-adjective-common-0')!.querySelector('input, textarea, button')).toBeNull();
  });

  it('opens nothing until a row is clicked, then the read-only detail of that word, without emitting', async () => {
    const view = await open();
    expect(doc('word-detail')).toBeNull();

    await select(view, 'word-row-suffix-mythic-0');

    expect(doc('word-detail')!.textContent).toContain('of the Ancients');
    expect(doc('word-form')).toBeNull();
    expect(doc('detail-edit')).not.toBeNull();
    expect(doc('detail-delete')).not.toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Edit opens the form with the forms of the adjective', async () => {
    const view = await open();

    await select(view, 'word-row-adjective-common-0');
    await press(view, 'detail-edit');

    const form = doc('word-form')!;
    const value = (hook: string) => form.querySelector<HTMLInputElement>(`[data-test="${hook}"]`)!.value;
    expect([value('word-m'), value('word-f'), value('word-mp'), value('word-fp')]).toEqual([
      'Vieux',
      'Vieille',
      'Vieux',
      'Vieilles',
    ]);
  });

  it('Save emits the edited suffix and nothing before', async () => {
    const view = await open();
    await select(view, 'word-row-suffix-mythic-0');
    await press(view, 'detail-edit');

    await type(view, 'word-suffix', 'of Legends');
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    expect(items(view).suffixes).toEqual({ mythic: ['of Legends'] });
    expect(doc('word-form')).toBeNull();
  });

  it('Add word opens an empty form and Save adds an adjective with its gendered forms for a rarity', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf());

    await view.click('add-word');
    await type(view, 'word-m', 'Vieux');
    await type(view, 'word-f', 'Vieille');
    await type(view, 'word-mp', 'Vieux');
    await type(view, 'word-fp', 'Vieilles');
    await press(view, 'form-save');

    expect(items(view).adjectives).toEqual({ common: [OLD] });
  });

  it('Add word as a suffix of another rarity emits it under that rarity', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf());

    await view.click('add-word');
    await choose(view, 'word-type', 'suffix');
    await choose(view, 'word-rarity', 'mythic');
    await type(view, 'word-suffix', 'of the Ancients');
    await press(view, 'form-save');

    expect(items(view).suffixes).toEqual({ mythic: ['of the Ancients'] });
  });

  it('Cancel with changes asks to discard, keeps the form until accepted, and never emits', async () => {
    const view = await open();
    const ask = confirm();
    await select(view, 'word-row-suffix-mythic-0');
    await press(view, 'detail-edit');
    await type(view, 'word-suffix', 'of Legends');

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc('word-form')).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc('word-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Cancel without changes closes the drawer without asking', async () => {
    const view = await open();
    const ask = confirm();
    await select(view, 'word-row-suffix-mythic-0');
    await press(view, 'detail-edit');

    await press(view, 'form-cancel');

    expect(ask).not.toHaveBeenCalled();
    expect(doc('word-form')).toBeNull();
  });

  it('Delete asks first and removes only that adjective once accepted', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'word-row-adjective-common-0');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    expect(items(view).adjectives).toEqual({ common: ['Dusty'] });
    expect(items(view).suffixes).toEqual({ mythic: ['of the Ancients'] });
  });

  it('hides the words of a neutral draft', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf({}, undefined));

    expect(view.$('add-word')).toBeNull();
  });
});
