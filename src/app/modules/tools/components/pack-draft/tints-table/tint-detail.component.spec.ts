import { TestBed } from '@angular/core/testing';
import { draftOf, GRADIENT } from '../../../../../../testing/pack-draft-editor';
import { TEST_PROVIDERS } from '../../../../../../testing/test-providers';
import { TintDetailComponent } from './tint-detail.component';

/**
 * Contract of the readable `app-tint-detail`: sections `section-identity`, `section-generation`, `section-texts`, each with a
 * `section-title`; fits as chips (`fit-item`); an empty value as a muted `detail-none` reading "None"; text lists show their
 * first 3 `text-line`s and a `show-all` button for the rest.
 */
function render(over: { fits?: string[]; descriptions?: string[] } = {}) {
  TestBed.configureTestingModule({ imports: [TintDetailComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(TintDetailComponent);
  const fits = over.fits ?? ['weapon', 'orb'];
  const draft = draftOf({
    tints: { rust: { gradient: GRADIENT, fits } },
    generators: {
      items: { version: 2, tints: { rust: over.descriptions ? { descriptions: over.descriptions } : {} } },
    },
  });
  fixture.componentRef.setInput('tint', { id: 'rust', stops: GRADIENT, fits, names: fits });
  fixture.componentRef.setInput('draft', draft);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const $ = (hook: string) => el.querySelector<HTMLElement>(`[data-test="${hook}"]`);
  const $$ = (root: HTMLElement | null, hook: string) => [...(root ?? el).querySelectorAll<HTMLElement>(`[data-test="${hook}"]`)];
  return { fixture, $, $$ };
}

describe('TintDetailComponent sections', () => {
  it('is cut into the titled sections Identity, Generation and Texts, in that order', () => {
    const view = render();

    const sections = ['identity', 'generation', 'texts'].map((name) => view.$(`section-${name}`)!);
    expect(sections.every(Boolean)).toBe(true);
    expect(sections.map((s) => s.querySelector('[data-test="section-title"]')!.textContent!.trim())).toEqual([
      'Identity',
      'Generation',
      'Texts',
    ]);
  });

  it('puts the id under Identity', () => {
    expect(render().$('section-identity')!.textContent).toContain('rust');
  });

  it('shows the fits under Generation as chips', () => {
    const view = render({ fits: ['weapon', 'orb'] });

    expect(view.$$(view.$('section-generation'), 'fit-item').map((c) => c.textContent!.trim())).toEqual(['weapon', 'orb']);
  });

  it('shows a tint without texts with a muted "None" under Texts, not an empty section', () => {
    const view = render();

    const none = view.$('section-texts')!.querySelector('[data-test="detail-none"]')!;
    expect(none.textContent!.trim()).toBe('None');
  });

  it('collapses a long text list to its first 3 lines with Show all, which reveals the rest', () => {
    const view = render({ descriptions: ['a one', 'b two', 'c three', 'd four'] });
    const texts = view.$('section-texts')!;

    expect(view.$$(texts, 'text-line').map((l) => l.textContent!.trim())).toEqual(['a one', 'b two', 'c three']);
    view.$('show-all')!.click();
    view.fixture.detectChanges();

    expect(view.$$(texts, 'text-line')).toHaveLength(4);
  });
});
