import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../../testing/test-providers';
import { KindFormComponent } from './kind-form.component';
import { emptyTexts } from './kind-texts';

/** Contract: the form shows `section-identity`, `section-generation`, `section-texts` and `section-try`, each with a `section-title`. */
describe('KindFormComponent sections', () => {
  it('shows the same section titles as the detail', () => {
    TestBed.configureTestingModule({ imports: [KindFormComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(KindFormComponent);
    fixture.componentRef.setInput('form', { original: 'folk', id: 'folk', parent: '', fields: {}, texts: emptyTexts() });
    fixture.componentRef.setInput('domain', 'items');
    fixture.detectChanges();

    const titles = ['identity', 'generation', 'texts', 'try'].map(
      (name) =>
        fixture.nativeElement.querySelector(`[data-test="section-${name}"] [data-test="section-title"]`)?.textContent?.trim(),
    );
    expect(titles).toEqual(['Identity', 'Generation', 'Texts', 'Try it']);
  });
});
