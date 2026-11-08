import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { routes } from '../../../app.routes';
import { CONTACT_KEY } from '../../../core/constants/contact-key';

const WEB3FORMS = 'https://api.web3forms.com/submit';

/**
 * Contract: `CONTACT_KEY` is an InjectionToken<string> (build-time key, '' when absent).
 * data-test hooks on /contact: `contact-name`, `contact-email`, `contact-message` (inputs),
 * `contact-submit`, `contact-success`, `contact-error`, `contact-unavailable`.
 */
describe('contact form (/contact)', () => {
  async function render(key: string) {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, provideRouter(routes), { provide: CONTACT_KEY, useValue: key }],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/contact');
    harness.detectChanges();
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement as HTMLElement;
    const hook = (name: string) => el.querySelector(`[data-test="${name}"]`) as HTMLElement | null;
    const fill = (name: string, value: string) => {
      const input = hook(name) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const settle = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return { hook, fill, settle, http: TestBed.inject(HttpTestingController) };
  }

  async function fillAndSubmit(page: Awaited<ReturnType<typeof render>>) {
    page.fill('contact-name', 'Ada');
    page.fill('contact-email', 'ada@example.com');
    page.fill('contact-message', 'Hello there');
    await page.settle();
    page.hook('contact-submit')!.click();
    await page.settle();
  }

  it('POSTs name, email, message and the key to Web3Forms', async () => {
    const page = await render('test-key');
    await fillAndSubmit(page);
    const req = page.http.expectOne(WEB3FORMS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there',
      access_key: 'test-key',
    });
    req.flush({ success: true });
  });

  it('shows a success message once sent', async () => {
    const page = await render('test-key');
    await fillAndSubmit(page);
    page.http.expectOne(WEB3FORMS).flush({ success: true });
    await page.settle();
    expect(page.hook('contact-success')).not.toBeNull();
    expect(page.hook('contact-error')).toBeNull();
  });

  it('shows an error message when the request fails', async () => {
    const page = await render('test-key');
    await fillAndSubmit(page);
    page.http.expectOne(WEB3FORMS).flush({ success: false }, { status: 500, statusText: 'Server Error' });
    await page.settle();
    expect(page.hook('contact-error')).not.toBeNull();
    expect(page.hook('contact-success')).toBeNull();
  });

  it('does not send an empty form', async () => {
    const page = await render('test-key');
    page.hook('contact-submit')!.click();
    await page.settle();
    page.http.expectNone(WEB3FORMS);
  });

  it('does not send an invalid email', async () => {
    const page = await render('test-key');
    page.fill('contact-name', 'Ada');
    page.fill('contact-email', 'not-an-email');
    page.fill('contact-message', 'Hello there');
    await page.settle();
    page.hook('contact-submit')!.click();
    await page.settle();
    page.http.expectNone(WEB3FORMS);
  });

  it('replaces the form with an unavailable note when there is no key', async () => {
    const page = await render('');
    expect(page.hook('contact-unavailable')).not.toBeNull();
    expect(page.hook('contact-submit')).toBeNull();
    expect(page.hook('contact-name')).toBeNull();
  });
});
