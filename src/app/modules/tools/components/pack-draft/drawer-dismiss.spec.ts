import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { GRADIENT, draftOf, renderEditor } from '../../../../../testing/pack-draft-editor';
import { DraftSprite } from '../../../../core/packs/pack-draft';
import { CommonWordsEditorComponent } from './common-words-editor/common-words-editor.component';
import { KindsTreeTableComponent } from './kinds-tree-table/kinds-tree-table.component';
import { ParamsEditorComponent } from './params-editor/params-editor.component';
import { SpritesGridComponent } from './sprites-grid/sprites-grid.component';
import { TintsTableComponent } from './tints-table/tints-table.component';

/**
 * Every side panel of the pack editor closes on a click on the mask outside it and on Escape, through the same path as the x
 * button: a clean panel closes at once, a dirty form asks to discard first ("keep editing" leaves it open as it was).
 * Escape while a confirmation is open closes only that confirmation.
 */
interface Panel {
  name: string;
  component: unknown;
  draft: ReturnType<typeof draftOf>;
  inputs?: Record<string, unknown>;
  row: string;
  detail: string;
  form: string;
  /** Makes the open form dirty. */
  dirty: (view: View) => Promise<void>;
  /** The edited control keeps its dirty value after "keep editing". */
  still: () => unknown;
  dirtyValue: unknown;
  deleteHook?: string;
}
type View = Awaited<ReturnType<typeof renderEditor>>;

const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
const settle = async (view: View) => {
  view.fixture.detectChanges();
  await view.fixture.whenStable();
  view.fixture.detectChanges();
};
const typeInto = async (view: View, hook: string, value: string) => {
  const host = doc(hook)!;
  const input = host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : host.querySelector('input')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur'));
  await settle(view);
};
const field = (hook: string) => {
  const host = doc(hook)!;
  return (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : host.querySelector('input')!).value;
};

const sprite = (id: string): DraftSprite => ({
  id,
  label: `Label ${id}`,
  kinds: ['weapon'],
  kind: 'grayscale',
  image: new Blob(['png'], { type: 'image/png' }),
});

const PANELS: Panel[] = [
  {
    name: 'params',
    component: ParamsEditorComponent,
    draft: draftOf({ common: { version: 2, params: { maker: ['a hermit'], place: ['a cave'] } } }),
    row: 'param-row-place',
    detail: 'param-detail',
    form: 'param-form',
    dirty: (view) => typeInto(view, 'param-entries', 'a cave\na tower'),
    still: () => field('param-entries'),
    dirtyValue: 'a cave\na tower',
    deleteHook: 'detail-delete',
  },
  {
    name: 'common words',
    component: CommonWordsEditorComponent,
    draft: draftOf({ generators: { items: { version: 2, suffixes: { mythic: ['of the Ancients'] } } } }),
    row: 'word-row-suffix-mythic-0',
    detail: 'word-detail',
    form: 'word-form',
    dirty: (view) => typeInto(view, 'word-suffix', 'of Legends'),
    still: () => field('word-suffix'),
    dirtyValue: 'of Legends',
    deleteHook: 'detail-delete',
  },
  {
    name: 'kinds',
    component: KindsTreeTableComponent,
    inputs: { domain: 'items' },
    draft: draftOf({ kinds: { folk: { type: 'equipment' } } }),
    row: 'kind-row-folk',
    detail: 'kind-detail',
    form: 'kind-form',
    dirty: async (view) => {
      view.fixture.debugElement.query(By.css('[data-test="kind-slot"]')).triggerEventHandler('onChange', { value: 'hand' });
      await settle(view);
    },
    still: () => document.querySelector('[data-test="kind-slot"]')?.textContent?.toLowerCase().includes('hand'),
    dirtyValue: true,
  },
  {
    name: 'tints',
    component: TintsTableComponent,
    draft: draftOf({ tints: { fire: { gradient: GRADIENT } } }),
    row: 'tint-row-fire',
    detail: 'tint-detail',
    form: 'tint-form',
    dirty: (view) => typeInto(view, 'tint-descriptions', 'Burnt.'),
    still: () => field('tint-descriptions'),
    dirtyValue: 'Burnt.',
    deleteHook: 'detail-delete',
  },
  {
    name: 'sprites',
    component: SpritesGridComponent,
    draft: draftOf({ sprites: [sprite('s01')] }),
    row: 'sprite-card-s01',
    detail: 'sprite-detail',
    form: 'sprite-form',
    dirty: (view) => typeInto(view, 'sprite-label', 'Renamed'),
    still: () => field('sprite-label'),
    dirtyValue: 'Renamed',
    deleteHook: 'detail-delete',
  },
];

describe.each(PANELS)('Side panel dismissal: $name', (p) => {
  const open = () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    return renderEditor(p.component as never, p.draft, [], p.inputs ?? {});
  };
  const confirm = () => vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const press = async (view: View, hook: string) => {
    const host = doc(hook)!;
    (host instanceof HTMLButtonElement ? host : (host.querySelector('button') ?? host)).click();
    await settle(view);
  };
  const showDetail = async (view: View) => {
    view.$(p.row)!.click();
    await settle(view);
  };
  const showForm = async (view: View) => {
    await showDetail(view);
    await press(view, 'detail-edit');
  };
  const escape = async (view: View) => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true });
    if (event.which !== 27) Object.defineProperty(event, 'which', { value: 27 });
    document.dispatchEvent(event);
    await settle(view);
  };
  const clickMask = async (view: View) => {
    document.querySelector<HTMLElement>('.p-drawer-mask')!.click();
    await settle(view);
  };

  it('Escape closes a clean detail at once', async () => {
    const view = await open();
    const ask = confirm();
    await showDetail(view);
    expect(doc(p.detail)).not.toBeNull();

    await escape(view);

    expect(doc(p.detail)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it('a click on the mask closes a clean detail at once', async () => {
    const view = await open();
    const ask = confirm();
    await showDetail(view);

    await clickMask(view);

    expect(doc(p.detail)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it('Escape closes a clean form without asking', async () => {
    const view = await open();
    const ask = confirm();
    await showForm(view);
    expect(doc(p.form)).not.toBeNull();

    await escape(view);

    expect(doc(p.form)).toBeNull();
    expect(ask).not.toHaveBeenCalled();
    expect(view.emitted).toEqual([]);
  });

  it('Escape on a dirty form asks to discard, and accepting closes it without emitting', async () => {
    const view = await open();
    const ask = confirm();
    await showForm(view);
    await p.dirty(view);

    await escape(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc(p.form)).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc(p.form)).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('a click on the mask on a dirty form asks to discard and keeps it open until accepted', async () => {
    const view = await open();
    const ask = confirm();
    await showForm(view);
    await p.dirty(view);

    await clickMask(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc(p.form)).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc(p.form)).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('answering keep editing leaves the form open as it was', async () => {
    const view = await open();
    const ask = confirm();
    await showForm(view);
    await p.dirty(view);

    await escape(view);
    (ask.mock.calls[0][0] as { reject?: () => void }).reject?.();
    await settle(view);

    expect(doc(p.form)).not.toBeNull();
    expect(p.still()).toBe(p.dirtyValue);
    expect(view.emitted).toEqual([]);
  });

  it('Escape while the discard confirmation is open does not close the panel nor ask again', async () => {
    const view = await open();
    const ask = confirm();
    await showForm(view);
    await p.dirty(view);
    await escape(view);
    expect(ask).toHaveBeenCalledTimes(1);

    await escape(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc(p.form)).not.toBeNull();
    expect(p.still()).toBe(p.dirtyValue);
  });

  if (p.deleteHook) {
    it('Escape while the delete confirmation is open does not close the panel, but the next one does', async () => {
      const view = await open();
      const ask = confirm();
      await showDetail(view);
      await press(view, p.deleteHook!);
      expect(ask).toHaveBeenCalledTimes(1);

      await escape(view);

      expect(ask).toHaveBeenCalledTimes(1);
      expect(doc(p.detail)).not.toBeNull();
      expect(view.emitted).toEqual([]);
      (ask.mock.calls[0][0] as { reject?: () => void }).reject?.();
      await settle(view);
      await escape(view);
      expect(doc(p.detail)).toBeNull();
    });
  }
});
