import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { CommonWordsEditorComponent } from './common-words-editor.component';

describe('CommonWordsEditorComponent', () => {
  it('adds a top-level adjective with its gendered forms for a rarity', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf());

    await view.click('toggle-common-words');
    await view.type('common-new-adjective-common-m', 'Vieux');
    await view.type('common-new-adjective-common-f', 'Vieille');
    await view.type('common-new-adjective-common-mp', 'Vieux');
    await view.type('common-new-adjective-common-fp', 'Vieilles');
    await view.click('add-common-adjective-common');

    expect((view.last().generators.items as any).adjectives).toEqual({
      common: [{ m: 'Vieux', f: 'Vieille', mp: 'Vieux', fp: 'Vieilles' }],
    });
  });

  it('adds a top-level suffix for a rarity', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf());

    await view.click('toggle-common-words');
    await view.type('common-new-suffix-mythic', 'of the Ancients');
    await view.click('add-common-suffix-mythic');

    expect((view.last().generators.items as any).suffixes).toEqual({ mythic: ['of the Ancients'] });
  });

  it('is collapsed until toggled', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf());

    expect(view.$('common-new-suffix-mythic')).toBeNull();
    await view.click('toggle-common-words');
    expect(view.$('common-new-suffix-mythic')).not.toBeNull();
  });

  it('hides the words of a neutral draft', async () => {
    const view = await renderEditor(CommonWordsEditorComponent, draftOf({}, undefined));

    expect(view.$('toggle-common-words')).toBeNull();
  });
});
