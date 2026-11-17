import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { GRADIENT, draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { TintsTableComponent } from './tints-table.component';

/**
 * Contract of `app-tints-table`: inputs `draft`, `issues`, output `changed`. Hooks (data-test): `tint-row-<id>` (tr) with
 * `cell-name`, `cell-gradient` (inline linear-gradient background) and `cell-fits` (at most 3 `fit-item` p-chip / p-tag showing the kind's noun, else its id, then a `fit-more` "+N" item for
 * the rest; never "id — noun"); toolbar
 * `add-tint`; the drawer content `tint-detail` (with `detail-edit`, `detail-delete`) or `tint-form` (with `tint-id` (a p-autocomplete suggesting known tint ids),
 * `tint-color-shadow` / `-mid` / `-light`, `tint-fits`, `tint-adjective-<rarity>`, `tint-suffix-<rarity>`,
 * `tint-descriptions`, `form-save`, `form-cancel`); `issue`. Delete and discard go through `ConfirmationService.confirm`.
 */
const RED = [
  { position: 0, color: '#5a0a0a' },
  { position: 0.5, color: '#c2410c' },
  { position: 1, color: '#fde047' },
];

const seed = (...rest: [language?: string]) =>
  draftOf(
    {
      kinds: {
        weapon: { type: 'item' },
        orb: { type: 'item' },
        shield: { type: 'item' },
        bow: { type: 'item' },
        helm: { type: 'item' },
      },
      tints: { rust: { gradient: RED, fits: ['weapon', 'orb', 'shield', 'bow', 'helm'] }, fire: { gradient: GRADIENT } },
      generators: {
        items: {
          version: 2,
          kinds: { weapon: { nouns: [{ text: 'Blade' }] } },
          tints: { rust: { adjectives: { common: ['Rusty'] }, descriptions: ['Eaten by time.'] } },
        },
      },
    },
    ...rest,
  );

describe('TintsTableComponent', () => {
  const open = (issues: unknown[] = [], ...rest: [language?: string]) =>
    renderEditor(TintsTableComponent, seed(...rest), issues);
  type View = Awaited<ReturnType<typeof open>>;
  const confirm = () => vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const doc = (hook: string) => document.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const settle = async (view: View) => {
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    view.fixture.detectChanges();
  };
  const select = async (view: View, id: string) => {
    view.$(`tint-row-${id}`)!.click();
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
  const setFits = async (view: View, value: string[]) => {
    view.fixture.debugElement.query(By.css('[data-test="tint-fits"]')).triggerEventHandler('onChange', { value });
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

  it('shows a row per tint with its name, a gradient preview and its fits as 3 chips and a +2', async () => {
    const view = await open();

    expect([...view.el.querySelectorAll('[data-test^="tint-row-"]')].map((r) => r.getAttribute('data-test'))).toEqual([
      'tint-row-rust',
      'tint-row-fire',
    ]);
    const row = view.$('tint-row-rust')!;
    expect(row.querySelector('[data-test="cell-name"]')!.textContent).toContain('rust');
    const preview = row.querySelector<HTMLElement>('[data-test="cell-gradient"]')!;
    expect(preview.outerHTML).toMatch(/linear-gradient/);
    expect(preview.outerHTML.toLowerCase()).toContain('#c2410c');
    const fits = row.querySelector('[data-test="cell-fits"]')!;
    expect([...fits.querySelectorAll('[data-test="fit-item"]')].map((e) => e.textContent!.trim())).toEqual(['Blade', 'orb', 'shield']);
    expect(fits.querySelector('[data-test="fit-more"]')!.textContent!.trim()).toBe('+2');
    expect(fits.textContent).not.toContain('—');
    expect(view.$('tint-row-fire')!.querySelector('[data-test="fit-more"]')).toBeNull();
  });

  it('has no Edit / Delete actions in the rows or an actions column', async () => {
    const view = await open();

    for (const id of ['rust', 'fire']) {
      expect(view.$(`tint-row-${id}`)!.querySelector('button, [data-test^="edit-"], [data-test^="delete-"]')).toBeNull();
    }
    const headers = [...view.el.querySelectorAll('th')].map((th) => th.textContent!.trim().toLowerCase());
    expect(headers.some((h) => h.includes('action'))).toBe(false);
  });

  it('the drawer blocks the page scroll', async () => {
    const view = await open();

    const drawer = view.fixture.debugElement.query(By.css('p-drawer')).componentInstance;
    const blocked = typeof drawer.blockScroll === 'function' ? drawer.blockScroll() : drawer.blockScroll;
    expect(blocked).toBe(true);
  });

  it('opens nothing until a row is clicked, then the read-only detail of that tint, without emitting', async () => {
    const view = await open();
    expect(doc('tint-detail')).toBeNull();

    await select(view, 'rust');

    const detail = doc('tint-detail')!;
    expect(detail.textContent).toContain('rust');
    expect(detail.textContent).toContain('weapon — Blade');
    expect(detail.textContent).toContain('Eaten by time.');
    expect(doc('tint-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('the detail offers Edit and Delete', async () => {
    const view = await open();

    await select(view, 'rust');

    expect(doc('detail-edit')).not.toBeNull();
    expect(doc('detail-delete')).not.toBeNull();
  });

  it('Edit switches the drawer to the form with the stops, fits, adjectives and descriptions of the tint', async () => {
    const view = await open();

    await edit(view, 'rust');

    expect(doc('tint-detail')).toBeNull();
    const form = doc('tint-form')!;
    expect(form.querySelector<HTMLInputElement>('[data-test="tint-id"] input')!.value).toBe('rust');
    for (const hook of ['tint-color-shadow', 'tint-color-mid', 'tint-color-light', 'tint-fits'])
      expect(form.querySelector(`[data-test="${hook}"]`)).not.toBeNull();
    expect((form.querySelector('[data-test="tint-adjective-common"]') as HTMLTextAreaElement).value).toBe('Rusty');
    expect((form.querySelector('[data-test="tint-descriptions"]') as HTMLTextAreaElement).value).toBe('Eaten by time.');
  });

  it('Save emits the draft with the edited fits and nothing before', async () => {
    const view = await open();
    await edit(view, 'rust');

    await setFits(view, ['weapon', 'orb']);
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    expect(view.last().tints['rust']).toEqual({ gradient: RED, fits: ['weapon', 'orb'] });
    expect(view.last().tints['fire']).toEqual({ gradient: GRADIENT });
    expect(doc('tint-form')).toBeNull();
  });

  it('Save emits the edited gradient stop', async () => {
    const view = await open();
    await edit(view, 'rust');

    view.fixture.debugElement.query(By.css('[data-test="tint-color-light"]')).triggerEventHandler('ngModelChange', '#112233');
    await settle(view);
    await press(view, 'form-save');

    expect(view.last().tints['rust'].gradient).toEqual([RED[0], RED[1], { position: 1, color: '#112233' }]);
  });

  it('Save emits the edited adjectives and descriptions', async () => {
    const view = await open();
    await edit(view, 'rust');

    await type(view, 'tint-adjective-common', 'Rusty\nCorroded');
    await type(view, 'tint-descriptions', 'Old.\nBrittle.');
    expect(view.emitted).toEqual([]);
    await press(view, 'form-save');

    const texts = (view.last().generators.items as any).tints.rust;
    expect(texts.adjectives).toEqual({ common: ['Rusty', 'Corroded'] });
    expect(texts.descriptions).toEqual(['Old.', 'Brittle.']);
  });

  it('Cancel without changes closes the drawer without asking', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'rust');

    await press(view, 'form-cancel');

    expect(ask).not.toHaveBeenCalled();
    expect(doc('tint-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('Cancel with changes asks to discard, keeps the form until accepted, and never emits', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'rust');
    await setFits(view, ['orb']);

    await press(view, 'form-cancel');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(doc('tint-form')).not.toBeNull();
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    await settle(view);
    expect(doc('tint-form')).toBeNull();
    expect(view.emitted).toEqual([]);
  });

  it('closing the drawer with changes asks to discard too', async () => {
    const view = await open();
    const ask = confirm();
    await edit(view, 'rust');
    await setFits(view, ['orb']);

    view.fixture.debugElement.query(By.css('p-drawer')).triggerEventHandler('visibleChange', false);
    await settle(view);

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
  });

  it('Add tint opens an empty form and Save adds a tint with a 3 stop default gradient', async () => {
    const view = await open();

    await view.click('add-tint');
    expect(doc('tint-form')!.querySelector<HTMLInputElement>('[data-test="tint-id"] input')!.value).toBe('');
    await type(view, 'tint-id', 'ember');
    await press(view, 'form-save');

    const stops = view.last().tints['ember'].gradient;
    expect(stops.map((s) => s.position)).toEqual([0, 0.5, 1]);
    for (const stop of stops) expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(Object.keys(view.last().tints)).toEqual(['rust', 'fire', 'ember']);
  });

  it('suggests the known tint ids matching what is typed in the id field of the form', async () => {
    const view = await open();
    await view.click('add-tint');

    const id = view.fixture.debugElement.query(By.css('[data-test="tint-id"]'));
    const suggested = () => {
      const held = id.componentInstance.suggestions;
      return (typeof held === 'function' ? held() : held) as string[];
    };
    await vi.waitFor(() => {
      id.triggerEventHandler('completeMethod', { query: 'si' });
      view.fixture.detectChanges();
      expect(suggested()).toContain('silver');
    });
    expect(suggested()).not.toContain('gold');
    expect(suggested()).not.toContain('ice');
  });

  it('Delete asks first and removes the tint with its texts once accepted', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'rust');
    await press(view, 'detail-delete');

    expect(ask).toHaveBeenCalledTimes(1);
    expect(view.emitted).toEqual([]);
    (ask.mock.calls[0][0] as { accept: () => void }).accept();
    expect(Object.keys(view.last().tints)).toEqual(['fire']);
    expect(view.last().generators.items).not.toHaveProperty('tints');
  });

  it('Delete not accepted leaves the draft alone', async () => {
    const view = await open();
    const ask = confirm();

    await select(view, 'fire');
    await press(view, 'detail-delete');
    (ask.mock.calls[0][0] as { reject?: () => void }).reject?.();

    expect(view.emitted).toEqual([]);
  });

  it('shows an issue on the row of its tint and not on the others', async () => {
    const view = await open([{ level: 'error', tint: 'fire', message: 'gradient needs at least 2 stops' }]);

    const row = view.$('tint-row-fire')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('gradient needs at least 2 stops');
    expect(view.$('tint-row-rust')!.textContent).not.toContain('gradient needs at least 2 stops');
  });

  it('hides the texts of a neutral draft in the form and keeps the gradient and the fits', async () => {
    const view = await open([], undefined);
    await edit(view, 'rust');

    expect(doc('tint-form')).not.toBeNull();
    expect(doc('tint-color-shadow')).not.toBeNull();
    expect(doc('tint-fits')).not.toBeNull();
    expect(doc('tint-adjective-common')).toBeNull();
    expect(doc('tint-descriptions')).toBeNull();
  });
});
