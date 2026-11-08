import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslocoService } from '@jsverse/transloco';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { routes } from '../../../app.routes';
import en from '../../../../../public/i18n/en.json';
import fr from '../../../../../public/i18n/fr.json';

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : leafKeys(v, `${prefix}${k}.`),
  );
}

async function visit(url: string, lang = 'en') {
  TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS, provideRouter(routes)] });
  TestBed.inject(TranslocoService).setActiveLang(lang);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  await harness.fixture.whenStable();
  return harness.routeNativeElement as HTMLElement;
}

describe('static pages', () => {
  it('renders credits with a title, and credits the external tools', async () => {
    const el = await visit('/credits');
    expect(el.querySelector('h1')!.textContent!.trim().length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Watabou');
  });

  it('credits Yuumei with a link to her site, in both languages', async () => {
    for (const lang of ['en', 'fr']) {
      TestBed.resetTestingModule();
      const el = await visit('/credits', lang);
      expect(el.textContent).toContain('Yuumei');
      const link = el.querySelector('a[href="https://www.yuumeiart.com/"]');
      expect(link).not.toBeNull();
    }
  });

  it('renders the contact page with a title', async () => {
    const el = await visit('/contact');
    expect(el.querySelector('h1')!.textContent!.trim().length).toBeGreaterThan(0);
  });

  it('renders the privacy policy saying what leaves the device (en)', async () => {
    const el = await visit('/privacy-policy');
    const text = el.textContent!;
    expect(el.querySelector('h1')).not.toBeNull();
    expect(text).toContain('STUN');
    expect(text).toContain('30 minutes');
    expect(text).toContain('Web3Forms');
    expect(text).toContain('IndexedDB');
  });

  it('renders the privacy policy in French', async () => {
    const el = await visit('/privacy-policy', 'fr');
    const text = el.textContent!;
    expect(text).toContain('STUN');
    expect(text).toContain('30 minutes');
    expect(text).toContain('Web3Forms');
  });

  for (const url of ['/', '/credits', '/contact', '/privacy-policy']) {
    it(`renders the shared footer with its 3 links on ${url}`, async () => {
      const el = await visit(url);
      const footer = el.querySelector('app-site-footer');
      expect(footer).not.toBeNull();
      expect(footer!.querySelectorAll('a').length).toBe(3);
    });
  }

  for (const section of ['home', 'credits', 'contact', 'privacy']) {
    it(`has the same non-empty "${section}" keys in en.json and fr.json`, () => {
      const enTree = (en as unknown as Tree)[section] as Tree | undefined;
      const frTree = (fr as unknown as Tree)[section] as Tree | undefined;
      expect(enTree).toBeDefined();
      expect(frTree).toBeDefined();
      const enKeys = leafKeys(enTree!).sort();
      expect(enKeys.length).toBeGreaterThan(0);
      expect(leafKeys(frTree!).sort()).toEqual(enKeys);
    });
  }
});
