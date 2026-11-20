import { TestBed } from '@angular/core/testing';
import { GRADIENT } from '../../../../../../testing/pack-draft-editor';
import { TEST_PROVIDERS } from '../../../../../../testing/test-providers';
import { TintFormComponent } from './tint-form.component';

/** Contract: the form shows `section-identity`, `section-generation` and `section-texts`, each with a `section-title`. */
describe('TintFormComponent sections', () => {
  it('shows the same section titles as the detail', () => {
    TestBed.configureTestingModule({ imports: [TintFormComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(TintFormComponent);
    fixture.componentRef.setInput('form', {
      original: 'rust',
      id: 'rust',
      stops: GRADIENT,
      fits: [],
      texts: { adjectives: {}, suffixes: {}, descriptions: '' },
    });
    fixture.detectChanges();

    const titles = ['identity', 'generation', 'texts'].map(
      (name) =>
        fixture.nativeElement.querySelector(`[data-test="section-${name}"] [data-test="section-title"]`)?.textContent?.trim(),
    );
    expect(titles).toEqual(['Identity', 'Generation', 'Texts']);
  });
});
