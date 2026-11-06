import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
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

    TestBed.inject(TranslocoService).setActiveLang('fr');
    await fixture.whenStable();

    expect(title()).toBe('Page introuvable');
  });
});
