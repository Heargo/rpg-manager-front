import { By } from '@angular/platform-browser';
import { GRADIENT, draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { TintsEditorComponent } from './tints-editor.component';

describe('TintsEditorComponent', () => {
  it('adds a tint with a 3 stop gradient (0, 0.5, 1) and an adjective', async () => {
    const view = await renderEditor(TintsEditorComponent, draftOf());

    await view.click('add-tint');
    await view.type('tint-id', 'ember');
    await view.type('tint-adjective-common', 'Smoldering');

    const draft = view.last();
    const stops = draft.tints['ember'].gradient;
    expect(stops.map((stop) => stop.position)).toEqual([0, 0.5, 1]);
    for (const stop of stops) expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect((draft.generators.items as any).tints.ember.adjectives).toEqual({ common: ['Smoldering'] });
  });

  it('shows the tints of the draft with the colour stops of their gradient', async () => {
    const view = await renderEditor(TintsEditorComponent, draftOf({ tints: { fire: { gradient: GRADIENT } } }));

    const row = view.$('tint-row-fire')!;
    expect(row).not.toBeNull();
    expect(row.querySelector('[data-test="tint-color-shadow"]')).not.toBeNull();
    expect(row.querySelector('[data-test="tint-color-light"]')).not.toBeNull();
  });

  it('hides the texts of a neutral draft and keeps the gradient', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({ tints: { fire: { gradient: GRADIENT } } }, undefined),
    );

    expect(view.$('tint-id')).not.toBeNull();
    expect(view.$('tint-color-shadow')).not.toBeNull();
    expect(view.$('tint-adjective-common')).toBeNull();
  });

  it('shows an issue next to the row of its tint', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({ tints: { fire: { gradient: GRADIENT } } }),
      [{ level: 'error', tint: 'fire', message: 'gradient needs at least 2 stops' }],
    );

    const row = view.$('tint-row-fire')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('gradient needs at least 2 stops');
  });

  it('removes a tint with its texts', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({
        tints: { fire: { gradient: GRADIENT } },
        generators: { items: { version: 2, tints: { fire: { adjectives: { common: ['Hot'] } } } } },
      }),
    );

    await view.click('remove-tint');

    expect(view.last().tints).toEqual({});
    expect(view.last().generators.items).not.toHaveProperty('tints');
  });

  const fitsHost = (view: Awaited<ReturnType<typeof renderEditor>>) =>
    view.fixture.debugElement.query(By.css('[data-test="tint-fits"]'));

  it('sets "Convient à" kinds: emits the tint with its fits', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({ kinds: { weapon: { type: 'item' } }, tints: { rust: { gradient: GRADIENT } } }),
    );

    fitsHost(view).triggerEventHandler('onChange', { value: ['weapon'] });

    expect(view.last().tints['rust']).toEqual({ gradient: GRADIENT, fits: ['weapon'] });
  });

  it('offers the known kinds as "id — first noun" and shows the fits', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({
        kinds: { weapon: { type: 'item' }, orb: { type: 'item' } },
        tints: { rust: { gradient: GRADIENT, fits: ['weapon'] } },
        generators: { items: { version: 2, kinds: { weapon: { nouns: [{ text: 'Blade' }] } } } },
      }),
    );

    const labels = (fitsHost(view).componentInstance.options as any[]).map((o) => o.label ?? o);
    expect(labels).toContain('weapon — Blade');
    expect(fitsHost(view).componentInstance.options.length).toBe(2);
    expect(view.$('tint-row-rust')!.textContent).toContain('Blade');
  });

  it('keeps "Convient à" on a neutral draft', async () => {
    const view = await renderEditor(
      TintsEditorComponent,
      draftOf({ tints: { rust: { gradient: GRADIENT } } }, undefined),
    );

    expect(view.$('tint-fits')).not.toBeNull();
  });
});
