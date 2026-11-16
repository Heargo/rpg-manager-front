import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: TEST_PROVIDERS,
    });
  });

  it('shows the title in the active language', async () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    await fixture.whenStable();
    const title = () => (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent?.trim();

    expect(title()).toBe('Page not found');

    TestBed.inject(TranslateService).use('fr');
    await fixture.whenStable();

    expect(title()).toBe('Page introuvable');
  });
});
