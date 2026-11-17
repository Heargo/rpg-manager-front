import {
  draftOf,
  renderEditor,
} from '../../../../../../testing/pack-draft-editor';
import { DomainKindsEditorComponent } from './domain-kinds-editor.component';

describe.each([
  { domain: 'skills', field: 'skillKinds', root: { type: 'active' } },
  { domain: 'classes', field: 'classKinds', root: { skills: ['strike'] } },
])(
  'DomainKindsEditorComponent suffixes on $domain',
  ({ domain, field, root }) => {
    const withFolk = (suffixes?: string[]) =>
      draftOf({
        [field]: { folk: root },
        generators: {
          [domain]: {
            version: 2,
            kinds: {
              folk: {
                nouns: [{ text: 'Folk' }],
                ...(suffixes ? { suffixes } : {}),
              },
            },
          },
        },
      });

    it('adds a suffix to the kind', async () => {
      const view = await renderEditor(
        DomainKindsEditorComponent,
        withFolk(),
        [],
        { domain },
      );

      await view.type('kind-new-suffix', 'of Fire');
      await view.click('add-kind-suffix');

      expect(
        (view.last().generators as any)[domain].kinds.folk.suffixes,
      ).toEqual(['of Fire']);
    });

    it('shows the suffixes and removes one', async () => {
      const view = await renderEditor(
        DomainKindsEditorComponent,
        withFolk(['of Fire']),
        [],
        { domain },
      );

      expect(view.$('kind-row-folk')!.textContent).toContain('of Fire');
      await view.click('remove-suffix');

      expect(
        (view.last().generators as any)[domain].kinds.folk,
      ).not.toHaveProperty('suffixes');
    });
  },
);

describe('DomainKindsEditorComponent suffixes on npcs', () => {
  it('has no per-kind suffix control', async () => {
    const view = await renderEditor(
      DomainKindsEditorComponent,
      draftOf({ npcKinds: { folk: { roles: ['story'] } } }),
      [],
      { domain: 'npcs' },
    );

    expect(view.$('kind-new-suffix')).toBeNull();
  });
});
