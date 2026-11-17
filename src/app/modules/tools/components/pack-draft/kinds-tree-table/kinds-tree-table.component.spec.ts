import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { DOMAIN_CASES } from '../../../../../../testing/pack-draft-domains';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { KindsTreeTableComponent } from './kinds-tree-table.component';

/**
 * Contract of `app-kinds-tree-table`: inputs `draft`, `issues`, `domain` ('items' | 'npcs' | 'skills' | 'classes'), output
 * `changed`. Hooks (data-test): `kind-row-<id>` (tr, tree rows start expanded), `cell-label`, `cell-id` and `cell-<field>` per
 * domain field in each row, `edit-<id>`, `add-child-<id>`, `delete-<id>`, toolbar `add-kind`; the drawer content
 * `kind-detail` (with `detail-edit`) or `kind-form` (with `kind-id`, `kind-parent`, the domain controls, `form-save`,
 * `form-cancel`); `issue`. Delete and discard go through `ConfirmationService.confirm`.
 */
interface Case {
  domain: string;
  seed: Record<string, unknown>;
  cells: string[];
  control: { hook: string; value: unknown; result: Record<string, unknown> };
  root: Record<string, unknown>;
  noCells: string[];
}

const ITEMS: Case = {
  domain: 'items',
  seed: { kinds: { folk: { type: 'equipment' }, elder: { parent: 'folk' }, sage: { parent: 'elder' }, other: { type: 'item' } } },
  cells: ['type', 'slot'],
  control: { hook: 'kind-slot', value: 'hand', result: { slot: 'hand' } },
  root: { type: 'equipment' },
  noCells: ['roles', 'effect', 'skills'],
};

const CASES: Case[] = [
  ITEMS,
  ...DOMAIN_CASES.map((c) => ({
    domain: c.domain,
    seed: { [c.field]: { folk: c.root, elder: { parent: 'folk' }, sage: { parent: 'elder' }, other: c.root } },
    cells: { npcs: ['roles'], skills: ['type', 'effect'], classes: ['skills'] }[c.domain],
    control: c.control,
    root: c.root,
    noCells: ['slot'],
  })),
];

const fieldOf = (domain: string) =>
  domain === 'items' ? 'kinds' : DOMAIN_CASES.find((c) => c.domain === domain)!.field;

describe.each(CASES)('KindsTreeTableComponent on $domain', (c) => {
  const open = (issues: unknown[] = []) =>
    renderEditor(KindsTreeTableComponent, draftOf(c.seed), issues, { domain: c.domain });
  const confirm = () => vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const kindsOf = (draft: unknown) => (draft as any)[fieldOf(c.domain)] as Record<string, Record<string, unknown>>;
  const level = (view: Awaited<ReturnType<typeof open>>, id: string) => view.$(`kind-row-${id}`)!.getAttribute('aria-level');
  const type = async (view: Awaited<ReturnType<typeof open>>, hook: string, value: string) => {
    const host = doc(hook)!;
    const input = host instanceof HTMLInputElement ? host : host.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    view.fixture.detectChanges();
    await view.fixture.whenStable();
  };
  const setControl = async (view: Awaited<ReturnType<typeof open>>) => {
    view.fixture.debugElement
      .query(By.css(`[data-test="${c.control.hook}"]`))
      .triggerEventHandler('onChange', { value: c.control.value });
    view.fixture.detectChanges();
    await view.fixture.whenStable();
  };
  const select = async (view: Awaited<ReturnType<typeof open>>, id: string) => {
    view.$(`kind-row-${id}`)!.click();
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
  };
  const press = async (view: Awaited<ReturnType<typeof open>>, hook: string) => {
    const host = doc(hook);
    if (!host) throw new Error(`no [data-test="${hook}"]`);
    (host instanceof HTMLButtonElement ? host : (host.querySelector('button') ?? host)).click();
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
  };

  it('builds the tree from parent: roots at level 1, children under their parent at deeper levels', async () => {
    const view = await open();

    const rows = [...view.el.querySelectorAll('[data-test^="kind-row-"]')];
    expect(rows.map((r) => r.getAttribute('data-test'))).toEqual([
      'kind-row-folk',
      'kind-row-elder',
      'kind-row-sage',
      'kind-row-other',
    ]);
    expect([level(view, 'folk'), level(view, 'elder'), level(view, 'sage'), level(view, 'other')]).toEqual(['1', '2', '3', '1']);
  });

  it('shows label, id and this domain’s fields as columns, and no other domain’s', async () => {
    const view = await open();
    const row = view.$('kind-row-folk')!;

    expect(row.querySelector('[data-test="cell-label"]')!.textContent).toContain('Folk');
    expect(row.querySelector('[data-test="cell-id"]')!.textContent).toContain('folk');
    for (const cell of c.cells) expect(row.querySelector(`[data-test="cell-${cell}"]`)).not.toBeNull();
    for (const cell of c.noCells) expect(row.querySelector(`[data-test="cell-${cell}"]`)).toBeNull();
  });

  it('has no Edit / Add child / Delete actions in the table rows or an actions column', async () => {
    const view = await open();

    for (const id of ['folk', 'elder', 'sage', 'other']) {
      const row = view.$(`kind-row-${id}`)!;
      expect(row.querySelector('[data-test^="edit-"], [data-test^="add-child-"], [data-test^="delete-"]')).toBeNull();
      for (const action of ['edit', 'add-child', 'delete']) expect(view.$(`${action}-${id}`)).toBeNull();
    }
    expect(view.el.querySelector('th[data-test="actions-header"], th[data-test="cell-actions"]')).toBeNull();
    const headers = [...view.el.querySelectorAll('th')].map((th) => th.textContent!.trim().toLowerCase());
    expect(headers.some((h) => h.includes('action'))).toBe(false);
  });

  it('marks parent rows (kinds with children) with data-kind-parent="true" and not the leaf rows', async () => {
    const view = await open();

    const marked = (id: string) => view.$(`kind-row-${id}`)!.getAttribute('data-kind-parent') === 'true';
    expect([marked('folk'), marked('elder'), marked('sage'), marked('other')]).toEqual([true, true, false, false]);
  });

  it('the detail offers Edit, Add child and Delete', async () => {
    const view = await open();

    await select(view, 'elder');

    for (const action of ['detail-edit', 'detail-add-child', 'detail-delete']) expect(doc(action)).not.toBeNull();
  });

  it('the drawer blocks the page scroll', async () => {
    const view = await open();

    const drawer = view.fixture.debugElement.query(By.css('p-drawer')).componentInstance;
    const blocked = typeof drawer.blockScroll === 'function' ? drawer.blockScroll() : drawer.blockScroll;
    expect(blocked).toBe(true);
  });

  it('opens nothing until a row is clicked, then opens the detail of that kind in a drawer', async () => {
    const view = await open();
    expect(doc('kind-detail')).toBeNull();

    view.$('kind-row-elder')!.click();
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();

    expect(doc('kind-detail')!.textContent).toContain('elder');
    expect(doc('kind-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Edit on the detail switches the drawer to the form of that kind', async () => {
    const view = await open();
    view.$('kind-row-elder')!.click();
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();

    await press(view, 'detail-edit');

    expect(doc('kind-detail')).toBeNull();
    expect(doc('kind-form')!.querySelector<HTMLInputElement>('[data-test="kind-id"] input')!.value).toBe('elder');
  });

  it('Save emits the draft with the edited fields of the kind and nothing before', async () => {
    const view = await open();
    await select(view, 'folk');
    await press(view, 'detail-edit');

    await setControl(view);
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    expect(kindsOf(view.last())['folk']).toEqual({ ...c.root, ...c.control.result });
    expect(Object.keys(kindsOf(view.last()))).toEqual(['folk', 'elder', 'sage', 'other']);
    expect(doc('kind-form')).toBeNull();
  });

  it('Cancel without changes closes the drawer without asking', async () => {
    const view = await open();
    const ask = confirm();
    await select(view, 'folk');
    await press(view, 'detail-edit');

    await press(view, 'form-cancel');

    expect(ask).not.toHaveBeenCalled();
    expect(doc('kind-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Cancel with changes asks to discard, keeps the form until accepted, and never emits', async () => {
    const view = await open();
    const ask = confirm();
    await select(view, 'folk');
    await press(view, 'detail-edit');
    await setControl(view);

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc('kind-form')).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
    expect(doc('kind-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('closing the drawer with changes asks to discard too', async () => {
    const view = await open();
    const ask = confirm();
    await select(view, 'folk');
    await press(view, 'detail-edit');
    await setControl(view);

    view.fixture.debugElement.query(By.css('p-drawer')).triggerEventHandler('visibleChange', false);
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
  });

  it('Add kind opens an empty form and Save adds a root kind', async () => {
    const view = await open();

    await view.click('add-kind');
    expect(doc('kind-form')!.querySelector<HTMLInputElement>('[data-test="kind-id"] input')!.value).toBe('');
    await type(view, 'kind-id', 'newbie');
    await setControl(view);
    await press(view, 'form-save');

    const added = kindsOf(view.last())['newbie'];
    expect(added['parent']).toBeUndefined();
    expect(added).toEqual(expect.objectContaining(c.control.result));
    expect(Object.keys(kindsOf(view.last()))).toContain('folk');
  });

  it('Add child opens a form with the parent pre-filled and Save adds the kind under it', async () => {
    const view = await open();

    await select(view, 'elder');
    await press(view, 'detail-add-child');
    expect(doc('kind-form')!.querySelector<HTMLInputElement>('[data-test="kind-parent"] input')!.value).toBe('elder');
    await type(view, 'kind-id', 'novice');
    await press(view, 'form-save');

    expect(kindsOf(view.last())['novice']).toEqual({ parent: 'elder' });
  });

  it('Delete asks first, says the children go too, and removes the kind with its descendants once accepted', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'folk');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect((ask.mock.calls[0][0] as { message: string }).message).toMatch(/child/i);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    expect(Object.keys(kindsOf(view.last()))).toEqual(['other']);
  });

  it('Delete not accepted leaves the draft alone', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'other');
    await press(view, 'detail-delete');
    (ask.mock.calls[0][0] as { reject?: () => void }).reject?.();

    expect(view.emitted).toEqual([]);
  });

  it('shows an issue on the row of its kind in this domain and nowhere else', async () => {
    const other = DOMAIN_CASES.find((d) => d.domain !== c.domain)!.domain;
    const view = await open([
      { level: 'error', ...(c.domain === 'items' ? {} : { domain: c.domain }), kind: 'folk', message: 'a root kind needs something' },
      { level: 'error', domain: other, kind: 'folk', message: 'belongs to another domain' },
    ]);

    const row = view.$('kind-row-folk')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('a root kind needs something');
    expect(row.textContent).not.toContain('belongs to another domain');
  });

  it('suggests no kind, itself or descendant as the parent of a kind', async () => {
    const view = await open();
    await select(view, 'folk');
    await press(view, 'detail-edit');

    const parent = view.fixture.debugElement.query(By.css('[data-test="kind-parent"]'));
    const suggested = () => {
      const held = parent.componentInstance.suggestions;
      return (typeof held === 'function' ? held() : held) as string[];
    };
    await vi.waitFor(() => {
      parent.triggerEventHandler('completeMethod', { query: '' });
      view.fixture.detectChanges();
      expect(suggested()).toContain('other');
    });
    const suggestions = suggested();
    expect(suggestions).toContain('other');
    for (const gone of ['folk', 'elder', 'sage']) expect(suggestions).not.toContain(gone);
  });

  it('refuses to save a kind whose parent is one of its descendants', async () => {
    const view = await open();
    await select(view, 'folk');
    await press(view, 'detail-edit');

    await type(view, 'kind-parent', 'sage');
    await press(view, 'form-save');

    expect(view.emitted).toEqual([]);
    expect(doc('kind-form')).not.toBeNull();
  });

  it('closes the drawer when the selected kind goes with a removed ancestor', async () => {
    const view = await open();
    await select(view, 'sage');
    expect(doc('kind-detail')).not.toBeNull();

    const field = fieldOf(c.domain);
    const { folk: _f, elder: _e, sage: _s, ...rest } = (c.seed as any)[field];
    view.fixture.componentRef.setInput('draft', draftOf({ [field]: rest }));
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();

    expect(doc('kind-detail')).toBeNull();
    expect(doc('kind-form')).toBeNull();
  });

  describe('texts in the drawer form', () => {
    const suffixHook = c.domain === 'items' ? 'kind-new-suffix-common' : 'kind-new-suffix-all';
    const addSuffix = c.domain !== 'npcs';
    const seeded = (...rest: [language?: string]) =>
      draftOf(
        { ...c.seed, generators: { [c.domain]: { version: 2, kinds: { folk: { nouns: [{ text: 'Folk' }] } } } } },
        ...rest,
      );
    const openSeeded = (...rest: [language?: string]) =>
      renderEditor(KindsTreeTableComponent, seeded(...rest), [], { domain: c.domain });
    const texts = (draft: unknown) => (draft as any).generators[c.domain].kinds.folk;
    const editFolk = async (view: Awaited<ReturnType<typeof open>>) => {
      await select(view, 'folk');
      await press(view, 'detail-edit');
    };

    it('Save emits the edited noun' + (addSuffix ? ' and suffix' : ''), async () => {
      const view = await openSeeded();
      await editFolk(view);

      await type(view, 'kind-new-noun', 'Elder');
      await press(view, 'add-noun');
      if (addSuffix) {
        await type(view, suffixHook, 'of Fire');
        await press(view, c.domain === 'items' ? 'add-kind-suffix-common' : 'add-kind-suffix-all');
      }
      expect(view.emitted).toEqual([]);
      await press(view, 'form-save');

      const held = texts(view.last());
      expect(held.nouns.map((n: { text: string }) => n.text)).toEqual(['Folk', 'Elder']);
      if (addSuffix) expect(held.suffixes).toEqual(c.domain === 'items' ? { common: ['of Fire'] } : ['of Fire']);
    });

    it('leaves the texts untouched when only a field is edited', async () => {
      const view = await openSeeded();
      await editFolk(view);

      await setControl(view);
      await press(view, 'form-save');

      expect((view.last() as any).generators).toEqual((seeded() as any).generators);
    });

    it('Preview in the form draws entries with the pending texts, without saving', async () => {
      const view = await openSeeded();
      await editFolk(view);

      await press(view, 'remove-noun');
      await type(view, 'kind-new-noun', 'Zorbling');
      await press(view, 'add-noun');
      const lore = doc('kind-descriptions')!;
      (lore as HTMLTextAreaElement).value = 'Zorbling lore.';
      lore.dispatchEvent(new Event('input', { bubbles: true }));
      await press(view, 'preview-kind');
      await vi.waitFor(() => {
        view.fixture.detectChanges();
        expect(document.querySelectorAll('[data-test="preview-entry"]').length).toBeGreaterThan(0);
      });

      for (const entry of document.querySelectorAll('[data-test="preview-entry"]'))
        expect(entry.textContent).toContain(c.domain === 'npcs' ? 'Zorbling lore' : 'Zorbling');
      expect(view.emitted).toEqual([]);
    });

    it('shows no texts section for a neutral draft', async () => {
      const view = await openSeeded(undefined);
      await editFolk(view);

      expect(doc('kind-form')).not.toBeNull();
      expect(doc('kind-texts')).toBeNull();
      expect(doc('kind-new-noun')).toBeNull();
    });
  });
});
