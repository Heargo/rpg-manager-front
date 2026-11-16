import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { ParamsEditorComponent } from './params-editor.component';

describe('ParamsEditorComponent', () => {
  it('adds a param with two entries: emits the draft with its common texts', async () => {
    const view = await renderEditor(ParamsEditorComponent, draftOf());

    await view.click('add-param');
    await view.type('param-name', 'maker');
    await view.type('param-new-entry', 'a hermit');
    await view.click('add-entry');
    await view.type('param-new-entry', 'a queen');
    await view.click('add-entry');

    expect((view.last().common as any).params).toEqual({ maker: ['a hermit', 'a queen'] });
  });

  it('shows the params of the draft, one row each, with their entries', async () => {
    const view = await renderEditor(
      ParamsEditorComponent,
      draftOf({ common: { version: 1, params: { maker: ['a hermit'] } } }),
    );

    const row = view.$('param-row-maker')!;
    expect(row).not.toBeNull();
    expect(row.textContent).toContain('a hermit');
  });

  it('is empty for a neutral draft: params are language texts', async () => {
    const view = await renderEditor(ParamsEditorComponent, draftOf({}, undefined));

    expect(view.$('add-param')).toBeNull();
  });

  it('shows an issue next to the row of its param', async () => {
    const view = await renderEditor(
      ParamsEditorComponent,
      draftOf({ common: { version: 1, params: { maker: ['a hermit'] } } }),
      [{ level: 'warning', param: 'maker', message: 'param {maker} is not used' }],
    );

    const row = view.$('param-row-maker')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('param {maker} is not used');
  });

  it('removes a param', async () => {
    const view = await renderEditor(
      ParamsEditorComponent,
      draftOf({ common: { version: 1, params: { maker: ['a hermit'] } } }),
    );

    await view.click('remove-param');

    expect(view.last().common).toBeUndefined();
  });
});
