import { By } from '@angular/platform-browser';
import { DOMAIN_CASES } from '../../../../../../testing/pack-draft-domains';
import { draftOf, renderEditor } from '../../../../../../testing/pack-draft-editor';
import { DomainKindsEditorComponent } from './domain-kinds-editor.component';

const render = (domain: string, draft: ReturnType<typeof draftOf>, issues: unknown[] = []) =>
  renderEditor(DomainKindsEditorComponent, draft, issues, { domain });

describe.each(DOMAIN_CASES)('DomainKindsEditorComponent on $domain', (c) => {
  const withFolk = (...rest: [language?: string]) =>
    draftOf(
      {
        [c.field]: { folk: c.root },
        generators: { [c.domain]: { version: 2, kinds: { folk: { nouns: [{ text: 'Folk' }] } } } },
      },
      ...rest,
    );

  it('adds a kind with a parent and a noun: emits the draft with the kind and its noun', async () => {
    const view = await render(c.domain, draftOf());

    await view.click('add-kind');
    await view.type('kind-id', 'elder');
    await view.type('kind-parent', 'folk');
    await view.type('kind-new-noun', 'Elder');
    await view.click('add-noun');

    const draft = view.last() as any;
    expect(draft[c.field]).toEqual({ elder: { parent: 'folk' } });
    expect(draft.generators[c.domain].kinds.elder.nouns).toEqual([expect.objectContaining({ text: 'Elder' })]);
    expect(draft.kinds).toEqual({});
  });

  it('shows the kinds of the domain only, one row each with its nouns', async () => {
    const view = await render(c.domain, draftOf({ ...(withFolk() as any), kinds: { orb: { type: 'item' } } }));

    expect(view.$('kind-row-folk')!.textContent).toContain('Folk');
    expect(view.$('kind-row-orb')).toBeNull();
  });

  it(`sets the domain's own field (${c.control.hook}): emits the kind with the new value`, async () => {
    const view = await render(c.domain, withFolk());

    view.fixture.debugElement
      .query(By.css(`[data-test="${c.control.hook}"]`))
      .triggerEventHandler('onChange', { value: c.control.value });

    expect((view.last() as any)[c.field]['folk']).toEqual({ ...c.root, ...c.control.result });
  });

  it('hides the texts of a neutral draft and keeps the id, parent and own field', async () => {
    const view = await render(c.domain, withFolk(undefined));

    expect(view.$('kind-id')).not.toBeNull();
    expect(view.$('kind-parent')).not.toBeNull();
    expect(view.$(c.control.hook)).not.toBeNull();
    expect(view.$('kind-new-noun')).toBeNull();
    expect(view.$('add-noun')).toBeNull();
  });

  it('shows an issue next to the row of its kind in this domain and nowhere else', async () => {
    const other = DOMAIN_CASES.find((d) => d.domain !== c.domain)!.domain;
    const view = await render(c.domain, withFolk(), [
      { level: 'error', domain: c.domain, kind: 'folk', message: 'a root kind needs something' },
      { level: 'error', domain: other, kind: 'folk', message: 'belongs to another domain' },
    ]);

    const row = view.$('kind-row-folk')!;
    expect(row.querySelectorAll('[data-test="issue"]')).toHaveLength(1);
    expect(row.textContent).toContain('a root kind needs something');
    expect(row.textContent).not.toContain('belongs to another domain');
  });

  it('removes a kind with its texts', async () => {
    const view = await render(c.domain, withFolk());

    await view.click('remove-kind');

    const draft = view.last() as any;
    expect(draft[c.field]).toEqual({});
    expect(draft.generators[c.domain] ?? {}).not.toHaveProperty('kinds');
  });

  it('previews a few draws of a kind, named with its noun', async () => {
    const view = await render(
      c.domain,
      draftOf({
        [c.field]: { zorb: c.root },
        generators: { [c.domain]: { version: 2, kinds: { zorb: c.texts } } },
      }),
    );

    await view.click('preview-kind');
    await vi.waitFor(() => {
      view.fixture.detectChanges();
      expect(view.$$('preview-entry')).toHaveLength(3);
    });

    for (const entry of view.$$('preview-entry')) expect(entry.textContent).toContain('Zorbling');
  });
});
