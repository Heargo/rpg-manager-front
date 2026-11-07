import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { HomePageComponent } from './home-page.component';

/**
 * Contract (data-test hooks): `pitch`, `screenshot` (img), `cta-play`, `cta-tools`,
 * `footer-credits`, `footer-contact`, `footer-privacy`.
 */
describe('HomePageComponent (landing)', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const hook = (el: HTMLElement, name: string) =>
    el.querySelector(`[data-test="${name}"]`) as HTMLElement | null;

  it('replaces the Angular starter', async () => {
    const el = await render();
    expect(el.textContent).not.toContain('Hello, World');
    expect(el.textContent).not.toContain('Congratulations');
  });

  it('shows a translated pitch', async () => {
    const el = await render();
    const pitch = hook(el, 'pitch');
    expect(pitch).not.toBeNull();
    expect(pitch!.textContent!.trim().length).toBeGreaterThan(10);
    expect(pitch!.textContent).not.toMatch(/^\s*home\./);
  });

  it('shows the app screenshot with alternative text', async () => {
    const el = await render();
    const img = hook(el, 'screenshot') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('images/landing-screenshot.webp');
    expect(img.getAttribute('alt')!.length).toBeGreaterThan(0);
  });

  it('has calls to action to /play and /tools/links', async () => {
    const el = await render();
    expect(hook(el, 'cta-play')!.getAttribute('href')).toBe('/play');
    expect(hook(el, 'cta-tools')!.getAttribute('href')).toBe('/tools/links');
  });

  it('has footer links to credits, contact and privacy policy', async () => {
    const el = await render();
    expect(hook(el, 'footer-credits')!.getAttribute('href')).toBe('/credits');
    expect(hook(el, 'footer-contact')!.getAttribute('href')).toBe('/contact');
    expect(hook(el, 'footer-privacy')!.getAttribute('href')).toBe('/privacy-policy');
  });
});
