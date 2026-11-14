import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { KindsEditorComponent } from './kinds-editor.component';

const items = (draft: any) => draft.generators.items;

describe('KindsEditorComponent', () => {
  it('adds a kind with a parent and a noun: emits the draft with the kind and its noun', async () => {
    const view = await renderEditor(KindsEditorComponent, draftOf());

    await view.click('add-kind');
    await view.type('kind-id', 'staff');
    await view.type('kind-parent', 'weapon');
    await view.type('kind-new-noun', 'Quarterstaff');
    await view.click('add-noun');

    const draft = view.last();
    expect(draft.kinds).toEqual({ staff: { parent: 'weapon' } });
    expect(items(draft).kinds.staff.nouns).toEqual([expect.objectContaining({ text: 'Quarterstaff' })]);
  });

  it('shows the kinds of the draft, one row each', async () => {
    const view = await renderEditor(
      KindsEditorComponent,
      draftOf({ kinds: { orb: { type: 'item' }, staff: { parent: 'weapon' } } }),
    );

    expect(view.$('kind-row-orb')).not.toBeNull();
    expect(view.$('kind-row-staff')).not.toBeNull();
  });

  it('shows the nouns of a kind of a draft with a language', async () => {
    const view = await renderEditor(
      KindsEditorComponent,
      draftOf({
        kinds: { orb: { type: 'item' } },
        generators: { items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }] } } } },
      }),
    );

    expect(view.$('kind-row-orb')!.textContent).toContain('Orb');
    expect(view.$('kind-new-noun')).not.toBeNull();
  });

  it('hides the texts of a neutral draft and keeps the id, parent, type and slot', async () => {
    const view = await renderEditor(
      KindsEditorComponent,
      draftOf({ kinds: { orb: { type: 'item' } } }, undefined),
    );

    expect(view.$('kind-id')).not.toBeNull();
    expect(view.$('kind-new-noun')).toBeNull();
    expect(view.$('add-noun')).toBeNull();
  });

  it('shows an issue next to the row of its kind and nowhere else', async () => {
    const view = await renderEditor(
      KindsEditorComponent,
      draftOf({ kinds: { bad: {}, orb: { type: 'item' } } }),
      [{ level: 'error', kind: 'bad', message: 'a root kind needs a type' }],
    );

    const bad = view.$('kind-row-bad')!;
    expect(bad.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(bad.textContent).toContain('a root kind needs a type');
    expect(view.$('kind-row-orb')!.querySelector('[data-test="issue"]')).toBeNull();
  });

  it('removes a kind with its texts', async () => {
    const view = await renderEditor(
      KindsEditorComponent,
      draftOf({
        kinds: { orb: { type: 'item' } },
        generators: { items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }] } } } },
      }),
    );

    await view.click('remove-kind');

    expect(view.last().kinds).toEqual({});
    expect(items(view.last())).not.toHaveProperty('kinds');
  });
});
