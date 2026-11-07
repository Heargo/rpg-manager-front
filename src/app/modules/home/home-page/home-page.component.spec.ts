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

  describe('full-height hero', () => {
    it('shows the logo mark and "RPG Manager" in the hero', async () => {
      const el = await render();
      const hero = hook(el, 'hero');
      expect(hero).not.toBeNull();
      expect(hero!.querySelector('svg')).not.toBeNull();
      expect(hook(el, 'hero-title')!.textContent!.trim()).toBe('RPG Manager');
      expect(hero!.contains(hook(el, 'hero-title'))).toBe(true);
    });

    it('keeps the pitch, screenshot and calls to action in a content section outside the hero', async () => {
      const el = await render();
      const hero = hook(el, 'hero')!;
      const content = hook(el, 'content');
      expect(content).not.toBeNull();
      expect(hero.contains(content)).toBe(false);
      for (const name of ['pitch', 'screenshot', 'cta-play', 'cta-tools']) {
        expect(content!.contains(hook(el, name))).toBe(true);
        expect(hero.contains(hook(el, name))).toBe(false);
      }
    });

    it('has a labelled scroll arrow button in the hero', async () => {
      const el = await render();
      const arrow = hook(el, 'scroll-arrow')!;
      expect(arrow.tagName).toBe('BUTTON');
      expect(hook(el, 'hero')!.contains(arrow)).toBe(true);
      expect(arrow.getAttribute('aria-label')!.length).toBeGreaterThan(0);
      expect(arrow.getAttribute('aria-label')).not.toMatch(/^home\./);
    });

    it('scrolls the content section into view when the arrow is clicked', async () => {
      const el = await render();
      const content = hook(el, 'content')!;
      const scroll = vi.fn();
      content.scrollIntoView = scroll;
      hook(el, 'scroll-arrow')!.click();
      expect(scroll).toHaveBeenCalledTimes(1);
    });
  });

  it('shows three translated highlights', async () => {
    const el = await render();
    const items = hook(el, 'highlights')!.querySelectorAll('li');
    expect(items.length).toBe(3);
    items.forEach((li) => {
      const title = li.querySelector('h3')!.textContent!.trim();
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toMatch(/^home\./);
    });
  });
});
