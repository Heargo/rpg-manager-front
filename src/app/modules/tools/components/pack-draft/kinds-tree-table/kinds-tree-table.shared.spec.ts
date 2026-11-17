import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { KindsTreeTableComponent } from './kinds-tree-table.component';

/**
 * `app-kinds-tree-table` with `domain="shared"`: the shared kinds tree of the manifest (`draft.sharedKinds`) with their
 * texts in `common.json` (`draft.common.kinds`). Same hooks as the other domains, plus `cell-words` (words count) and, in the
 * form, the texts hooks (`kind-new-noun`, `add-noun`, `kind-new-adjective-all-m`, `add-kind-adjective-all`,
 * `kind-descriptions`). The domain kind forms get a `kind-shared` multiselect.
 */
const SEED = {
  sharedKinds: {
    gem: {},
    ruby: { parent: 'gem' },
    garnet: { parent: 'ruby' },
    bone: {},
  },
  common: {
    version: 2,
    params: { place: ['the keep'] },
    kinds: {
      ruby: { words: [{ text: 'Ruby' }, { text: 'Cabochon' }], descriptions: ['deep red'] },
      bone: { words: [{ text: 'Bone' }] },
    },
  },
};

const open = (seed: Record<string, unknown> = SEED, ...rest: [language?: string]) =>
  renderEditor(KindsTreeTableComponent, draftOf(seed, ...rest), [], { domain: 'shared' });
type View = Awaited<ReturnType<typeof open>>;

const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
const settle = async (view: View) => {
  view.fixture.detectChanges();
  await view.fixture.whenStable();
  view.fixture.detectChanges();
};
const select = async (view: View, id: string) => {
  view.$(`kind-row-${id}`)!.click();
  await settle(view);
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
const level = (view: View, id: string) => view.$(`kind-row-${id}`)!.getAttribute('aria-level');
const edit = async (view: View, id: string) => {
  await select(view, id);
  await press(view, 'detail-edit');
};
const shared = (draft: unknown) => (draft as any).sharedKinds as Record<string, Record<string, unknown>>;
const texts = (draft: unknown, id: string) => (draft as any).common?.kinds?.[id];

describe('KindsTreeTableComponent on the shared kinds', () => {
  it('builds the tree from parent, roots at level 1', async () => {
    const view = await open();

    const rows = [...view.el.querySelectorAll('[data-test^="kind-row-"]')].map((r) => r.getAttribute('data-test'));
    expect(rows).toEqual(['kind-row-gem', 'kind-row-ruby', 'kind-row-garnet', 'kind-row-bone']);
    expect(['gem', 'ruby', 'garnet', 'bone'].map((id) => level(view, id))).toEqual(['1', '2', '3', '1']);
  });

  it('shows label, id and the words count, marks parents and has no row actions', async () => {
    const view = await open();
    const ruby = view.$('kind-row-ruby')!;

    expect(ruby.querySelector('[data-test="cell-label"]')!.textContent).toContain('Ruby');
    expect(ruby.querySelector('[data-test="cell-id"]')!.textContent).toContain('ruby');
    expect(ruby.querySelector('[data-test="cell-words"]')!.textContent!.trim()).toBe('2');
    expect(view.$('kind-row-garnet')!.querySelector('[data-test="cell-words"]')!.textContent!.trim()).toBe('0');
    expect(['gem', 'ruby', 'garnet', 'bone'].map((id) => view.$(`kind-row-${id}`)!.getAttribute('data-kind-parent') === 'true')).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(view.el.querySelector('[data-test^="edit-"], [data-test^="add-child-"], [data-test^="delete-"]')).toBeNull();
  });

  it('the detail offers Edit, Add child and Delete', async () => {
    const view = await open();

    await select(view, 'ruby');

    for (const action of ['detail-edit', 'detail-add-child', 'detail-delete']) expect(doc(action)).not.toBeNull();
  });

  it('a neutral draft shows the tree with no words column and no texts in the form', async () => {
    const view = await open({ sharedKinds: SEED.sharedKinds }, undefined);

    expect(view.$('kind-row-ruby')).not.toBeNull();
    expect(view.$('kind-row-ruby')!.querySelector('[data-test="cell-words"]')).toBeNull();
    await edit(view, 'ruby');
    expect(doc('kind-form')).not.toBeNull();
    expect(doc('kind-texts')).toBeNull();
  });

  it('Add shared kind then Save adds a root kind to the tree, and a language draft gets its words in common.json', async () => {
    const view = await open();

    await view.click('add-kind');
    await type(view, 'kind-id', 'amber');
    await type(view, 'kind-new-noun', 'Amber');
    await press(view, 'add-noun');
    await press(view, 'form-save');

    expect(shared(view.last())['amber']).toEqual({});
    expect(Object.keys(shared(view.last()))).toEqual(['gem', 'ruby', 'garnet', 'bone', 'amber']);
    expect(texts(view.last(), 'amber').words).toEqual([{ text: 'Amber' }]);
  });

  it('Add child opens a form with the parent pre-filled and Save adds the kind under it', async () => {
    const view = await open();

    await select(view, 'bone');
    await press(view, 'detail-add-child');
    expect(doc('kind-form')!.querySelector<HTMLInputElement>('[data-test="kind-parent"] input')!.value).toBe('bone');
    await type(view, 'kind-id', 'tusk');
    await press(view, 'form-save');

    expect(shared(view.last())['tusk']).toEqual({ parent: 'bone' });
  });

  it('Save of an edited kind emits the new words, adjectives and descriptions and nothing before', async () => {
    const view = await open();
    await edit(view, 'ruby');

    await type(view, 'kind-new-noun', 'Gemstone');
    await press(view, 'add-noun');
    await type(view, 'kind-new-adjective-all-m', 'ruby-red');
    await press(view, 'add-kind-adjective-all');
    await type(view, 'kind-descriptions', 'deep red\nset in a ring');
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    expect(texts(view.last(), 'ruby')).toEqual({
      words: [{ text: 'Ruby' }, { text: 'Cabochon' }, { text: 'Gemstone' }],
      adjectives: ['ruby-red'],
      descriptions: ['deep red', 'set in a ring'],
    });
    expect((view.last() as any).common.params).toEqual({ place: ['the keep'] });
  });

  it('a neutral draft saves the tree without creating common.json', async () => {
    const view = await open({ sharedKinds: SEED.sharedKinds }, undefined);

    await view.click('add-kind');
    await type(view, 'kind-id', 'amber');
    await press(view, 'form-save');

    expect(shared(view.last())['amber']).toEqual({});
    expect((view.last() as any).common).toBeUndefined();
  });

  it('renaming a kind in the form follows its children, its texts and the shared fits of the domain kinds', async () => {
    const view = await open({ ...SEED, kinds: { ring: { type: 'equipment', shared: ['ruby'] } } });
    await edit(view, 'ruby');

    await type(view, 'kind-id', 'garnet-stone');
    await press(view, 'form-save');

    const draft = view.last() as any;
    expect(Object.keys(shared(draft))).toContain('garnet-stone');
    expect(shared(draft)['garnet']).toEqual({ parent: 'garnet-stone' });
    expect(texts(draft, 'garnet-stone').words).toHaveLength(2);
    expect(texts(draft, 'ruby')).toBeUndefined();
    expect(draft.kinds.ring.shared).toEqual(['garnet-stone']);
  });

  it('Delete asks first, says the children go too, and removes the kind with its descendants, texts and fits once accepted', async () => {
    const view = await open({ ...SEED, kinds: { ring: { type: 'equipment', shared: ['ruby', 'bone'] } } });
    const ask = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    await select(view, 'gem');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect((ask.mock.calls[0][0] as { message: string }).message).toMatch(/child/i);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    const draft = view.last() as any;
    expect(Object.keys(shared(draft))).toEqual(['bone']);
    expect(Object.keys(draft.common.kinds)).toEqual(['bone']);
    expect(draft.kinds.ring.shared).toEqual(['bone']);
  });

  it('Cancel with changes asks to discard and never emits', async () => {
    const view = await open();
    const ask = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    await edit(view, 'ruby');
    await type(view, 'kind-new-noun', 'Gemstone');
    await press(view, 'add-noun');

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
  });

  it('suggests no kind, itself or descendant as the parent of a shared kind', async () => {
    const view = await open();
    await edit(view, 'gem');

    const parent = view.fixture.debugElement.query(By.css('[data-test="kind-parent"]'));
    const suggested = () => {
      const held = parent.componentInstance.suggestions;
      return (typeof held === 'function' ? held() : held) as string[];
    };
    await vi.waitFor(() => {
      parent.triggerEventHandler('completeMethod', { query: '' });
      view.fixture.detectChanges();
      expect(suggested()).toContain('bone');
    });
    for (const gone of ['gem', 'ruby', 'garnet']) expect(suggested()).not.toContain(gone);
  });
});

describe.each([
  ['items', 'kinds', { type: 'equipment' }],
  ['npcs', 'npcKinds', { roles: ['story'] }],
  ['skills', 'skillKinds', { type: 'active', effect: 'damage' }],
  ['classes', 'classKinds', {}],
])('the Shared kinds multiselect of a %s kind form', (domain, field, root) => {
  const openDomain = () =>
    renderEditor(KindsTreeTableComponent, draftOf({ ...SEED, [field]: { folk: root } }), [], { domain });
  const control = (view: Awaited<ReturnType<typeof openDomain>>) =>
    view.fixture.debugElement.query(By.css('[data-test="kind-shared"]'));
  const optionValues = (view: Awaited<ReturnType<typeof openDomain>>) => {
    const held = control(view).componentInstance.options;
    return ((typeof held === 'function' ? held() : held) as { value: string }[]).map((o) => o.value);
  };

  it('offers the shared kinds of this draft and of the active Base pack', async () => {
    const view = await openDomain();
    await select(view as unknown as View, 'folk');
    await press(view as unknown as View, 'detail-edit');

    await vi.waitFor(() => {
      view.fixture.detectChanges();
      const values = optionValues(view);
      expect(values).toEqual(expect.arrayContaining(['gem', 'ruby', 'garnet', 'bone']));
      expect(values).toEqual(expect.arrayContaining(['material', 'iron']));
    });
  });

  it('Save emits the chosen shared fits on the kind', async () => {
    const view = await openDomain();
    await select(view as unknown as View, 'folk');
    await press(view as unknown as View, 'detail-edit');

    control(view).triggerEventHandler('onChange', { value: ['ruby', 'material'] });
    await settle(view as unknown as View);
    await press(view as unknown as View, 'form-save');

    expect(((view.last() as any)[field] as any).folk.shared).toEqual(['ruby', 'material']);
  });
});
