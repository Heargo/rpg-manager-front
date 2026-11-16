import { DOMAIN_CASES } from '../../../../../../testing/pack-draft-domains';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { DomainTextsEditorComponent } from './domain-texts-editor.component';

const render = (domain: string, draft: ReturnType<typeof draftOf>) =>
  renderEditor(DomainTextsEditorComponent, draft, [], { domain });

/** The top-level lists of each domain's language file: the list, what is typed and what the file then holds. */
const LISTS: Record<string, { list: string; value: string; expected: unknown }[]> = {
  npcs: [
    { list: 'given', value: 'Zorg', expected: [{ text: 'Zorg', gender: 'm' }] },
    { list: 'epithets', value: 'the Odd', expected: ['the Odd'] },
    { list: 'templates', value: '{given} {epithet}', expected: ['{given} {epithet}'] },
  ],
  skills: [
    { list: 'templates', value: '{noun} of {suffix}', expected: ['{noun} of {suffix}'] },
    { list: 'adjectives', value: 'Odd', expected: ['Odd'] },
    { list: 'suffixes', value: 'Fire', expected: ['Fire'] },
  ],
  classes: [
    { list: 'templates', value: '{noun} of {suffix}', expected: ['{noun} of {suffix}'] },
    { list: 'adjectives', value: 'Odd', expected: ['Odd'] },
    { list: 'suffixes', value: 'the Deep', expected: ['the Deep'] },
  ],
};

describe.each(DOMAIN_CASES)('DomainTextsEditorComponent on $domain', (c) => {
  it.each(LISTS[c.domain])(
    'adds an entry to the top-level $list: emits it in the language file',
    async ({ list, value, expected }) => {
      const view = await render(c.domain, draftOf());

      await view.type(`top-new-${list}`, value);
      await view.click(`add-top-${list}`);

      expect((view.last().generators as any)[c.domain][list]).toEqual(expected);
    },
  );

  it('shows the lists of a draft and removes an entry', async () => {
    const list = LISTS[c.domain][1].list;
    const view = await render(
      c.domain,
      draftOf({ generators: { [c.domain]: { version: 2, [list]: ['Odd'] } } }),
    );

    expect(view.$(`top-${list}`)!.textContent).toContain('Odd');
    await view.click(`remove-top-${list}-0`);

    expect((view.last().generators as any)[c.domain] ?? {}).not.toHaveProperty(list);
  });

  it('is hidden for a neutral draft: the lists are language texts', async () => {
    const view = await render(c.domain, draftOf({}, undefined));

    expect(view.$(`top-new-${LISTS[c.domain][0].list}`)).toBeNull();
  });
});
