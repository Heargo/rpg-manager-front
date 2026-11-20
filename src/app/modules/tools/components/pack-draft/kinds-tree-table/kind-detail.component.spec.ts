import { TestBed } from '@angular/core/testing';
import { draftOf } from '../../../../../../testing/pack-draft-editor';
import { TEST_PROVIDERS } from '../../../../../../testing/test-providers';
import { KindDetailComponent } from './kind-detail.component';

/**
 * Contract of the readable `app-kind-detail`: sections `section-identity`, `section-generation`, `section-texts`,
 * `section-try`, each with a `section-title`; list values as chips (`fit-item`); an empty value as a muted `detail-none`
 * reading "None"; text lists show their first 3 `text-line`s and a `show-all` button for the rest.
 */
const DESCRIPTIONS = ['d1 lore', 'd2 lore', 'd3 lore', 'd4 lore', 'd5 lore'];

function render(over: { domain?: string; fields?: Record<string, unknown>; descriptions?: string[]; language?: string | undefined } = {}) {
  TestBed.configureTestingModule({ imports: [KindDetailComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(KindDetailComponent);
  const domain = over.domain ?? 'items';
  const draft = draftOf(
    {
      generators: {
        [domain]: {
          version: 2,
          kinds: { folk: { nouns: [{ text: 'Folk' }, { text: 'Elder' }], descriptions: over.descriptions ?? DESCRIPTIONS } },
        },
      },
    },
    ...('language' in over ? [over.language] : []),
  );
  fixture.componentRef.setInput('kind', { id: 'folk', label: 'Folk', fields: over.fields ?? {} });
  fixture.componentRef.setInput('draft', draft);
  fixture.componentRef.setInput('domain', domain);
  fixture.componentRef.setInput('parent', 'Ancestor');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const $ = (hook: string) => el.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const $$ = (root: HTMLElement | null, hook: string) => [...(root ?? el).querySelectorAll<HTMLElement>(`[data-test="${hook}"]`)];
  return { fixture, el, $, $$ };
}

describe('KindDetailComponent sections', () => {
  it('is cut into the titled sections Identity, Generation, Texts and Try it, in that order', () => {
    const view = render();

    const sections = ['identity', 'generation', 'texts', 'try'].map((name) => view.$(`section-${name}`)!);
    expect(sections.every(Boolean)).toBe(true);
    expect(sections.map((s) => s.querySelector('[data-test="section-title"]')!.textContent!.trim())).toEqual([
      'Identity',
      'Generation',
      'Texts',
      'Try it',
    ]);
    for (let i = 1; i < sections.length; i++)
      expect(sections[i - 1].compareDocumentPosition(sections[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts label, id and parent under Identity', () => {
    const identity = render().$('section-identity')!;

    expect(identity.textContent).toContain('Folk');
    expect(identity.textContent).toContain('folk');
    expect(identity.textContent).toContain('Ancestor');
  });

  it('puts the preview under Try it', () => {
    const view = render();

    expect(view.$('section-try')!.querySelector('[data-test="preview-kind"]')).not.toBeNull();
  });

  it('shows a list field of Generation as chips', () => {
    const view = render({ domain: 'npcs', fields: { roles: ['merchant', 'guard'] } });

    expect(view.$$(view.$('section-generation'), 'fit-item')).toHaveLength(2);
  });

  it('shows the nouns under Texts as chips', () => {
    const view = render();

    const chips = view.$$(view.$('section-texts'), 'fit-item');
    expect(chips.map((c) => c.textContent!.trim())).toEqual(['Folk', 'Elder']);
  });

  it('shows an empty field as a muted "None", not a blank line', () => {
    const view = render({ fields: {} });

    const nones = view.$$(view.$('section-generation'), 'detail-none');
    expect(nones).toHaveLength(2);
    for (const none of nones) expect(none.textContent!.trim()).toBe('None');
  });

  it('collapses a long text list to its first 3 lines with Show all, which reveals the rest', () => {
    const view = render();
    const texts = view.$('section-texts')!;

    expect(view.$$(texts, 'text-line').map((l) => l.textContent!.trim())).toEqual(['d1 lore', 'd2 lore', 'd3 lore']);
    const showAll = view.$('show-all')!;
    expect(showAll.textContent).toContain('Show all');
    showAll.click();
    view.fixture.detectChanges();

    expect(view.$$(texts, 'text-line')).toHaveLength(5);
  });

  it('shows a short text list in full, without Show all', () => {
    const view = render({ descriptions: ['only one'] });

    expect(view.$$(view.$('section-texts'), 'text-line').map((l) => l.textContent!.trim())).toEqual(['only one']);
    expect(view.$('show-all')).toBeNull();
  });
});
