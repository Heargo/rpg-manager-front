import { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGS = ['fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const here = dirname(fileURLToPath(import.meta.url));
const SCREENS = join(here, '../src/assets/screens');
export const STATE_DIR = join(here, '../node_modules/.cache/screenshots-state');

const translations: Record<string, Record<string, unknown>> = {};

/** The project's language (`fr` or `en`). */
export const langOf = (info: TestInfo): Lang => info.project.metadata['lang'] as Lang;

/** The app's own label for a translation key, so selectors follow the app's wording in both languages. */
export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  translations[lang] ??= JSON.parse(readFileSync(join(here, `../../public/i18n/${lang}.json`), 'utf8'));
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], translations[lang]);
  if (typeof value !== 'string') throw new Error(`Missing translation ${lang}:${key}`);
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => String(params[name] ?? ''));
}

/** Profile and language set before the app starts, so no first-run screen gets in the way. */
export async function prepareContext(context: BrowserContext, lang: Lang, name = lang === 'fr' ? 'Camille' : 'Alex'): Promise<void> {
  // Seeded randomness: generated names, items and images are the same on every run.
  await context.addInitScript((seed) => {
    let [a, b, c, d] = [seed, seed ^ 0x9e3779b9, seed ^ 0x85ebca6b, seed ^ 0xc2b2ae35];
    const next = () => {
      const t = (((a + b) >>> 0) + d) >>> 0;
      d = (d + 1) >>> 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) >>> 0;
      c = ((c << 21) | (c >>> 11)) >>> 0;
      c = (c + t) >>> 0;
      return t;
    };
    crypto.getRandomValues = (<T extends ArrayBufferView | null>(array: T): T => {
      if (!array) return array;
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i += 4) {
        const n = next();
        for (let j = 0; j < 4 && i + j < bytes.length; j++) bytes[i + j] = (n >>> (8 * j)) & 0xff;
      }
      return array;
    }) as typeof crypto.getRandomValues;
    Math.random = () => next() / 2 ** 32;
    crypto.randomUUID = (() => {
      const h = Array.from({ length: 4 }, () => next().toString(16).padStart(8, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
    }) as typeof crypto.randomUUID;
  }, [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7));
  await context.addInitScript(
    ({ lang, name }) => {
      localStorage.setItem('lang', lang);
      if (!localStorage.getItem('profile'))
        localStorage.setItem('profile', JSON.stringify({ playerId: crypto.randomUUID(), name }));
    },
    { lang, name },
  );
}

/** Hides what changes between runs (carets, scrollbars, animations), so images only change when the app does. */
export async function steady(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
      * { scrollbar-width: none !important; } ::-webkit-scrollbar { display: none; }`,
  });
  await page.mouse.move(1, 1);
  await page.addStyleTag({ content: `.p-tooltip { display: none !important; }` });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))));
  await page.waitForLoadState('networkidle');
}

/** In-app navigation (no reload), so a hosted room stays open. */
export async function go(page: Page, path: string): Promise<void> {
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL((url) => url.pathname === path);
}

/** Hosts the sample world (the first one on /play) and waits for the room lobby. */
export async function hostWorld(page: Page, lang: Lang): Promise<void> {
  await page.goto('/play');
  // A saved state may restore the hosted room (host persistence): the card then offers Open room.
  const open = page.getByRole('button', { name: t(lang, 'play.worlds.openRoom') });
  const host = page.getByRole('button', { name: t(lang, 'play.worlds.host') });
  await open.or(host).first().click();
  await page.waitForURL(/\/room$/);
}

/** Saves a screenshot as src/assets/screens/<lang>/<name>.png (the full page unless `clip`/`fullPage: false`). */
export async function shot(
  page: Page,
  lang: Lang,
  name: string,
  options: { fullPage?: boolean; locator?: ReturnType<Page['locator']>; mask?: ReturnType<Page['locator']>[] } = {},
): Promise<void> {
  await steady(page);
  const path = join(SCREENS, lang, `${name}.png`);
  // Masked: what can never be the same twice (connection codes), painted in the app's paper colour.
  const common = { path, animations: 'disabled' as const, mask: options.mask, maskColor: '#e5ddc0' };
  if (options.locator) await options.locator.screenshot(common);
  else await page.screenshot({ ...common, fullPage: options.fullPage ?? false });
}

/** A phone-sized page in its own context (same storage as the desktop one). */
export async function phone(browser: Browser, storageState: string | undefined, lang: Lang): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    storageState: storageState ?? { cookies: [], origins: [] },
  });
  await prepareContext(context, lang);
  return context.newPage();
}
