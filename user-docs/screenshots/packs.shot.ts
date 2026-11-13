import { expect, Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { langOf, prepareContext, shot, t } from './helpers';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = join(here, '../../public/packs/base');

/** A small demo pack served at a GitHub raw address, so "Add a pack" can be shown without the network. */
const DEMO_ROOT = 'https://raw.githubusercontent.com/demo/northern-blades/HEAD/';
const DEMO_MANIFEST = {
  format: 1,
  id: 'northern-blades',
  name: { en: 'Northern blades', fr: 'Lames du Nord' },
  description: { en: 'Swords and axes from the cold lands.', fr: 'Épées et haches des terres froides.' },
  version: '1.0.0',
  author: 'Demo author',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  generators: { en: { items: 'generators/en/items.json' }, fr: { items: 'generators/fr/items.json' } },
  sprites: [
    { id: 'axe', en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'sword', en: 'Sword', fr: 'Épée', type: 'equipment', slot: 'weapon1', kind: 'grayscale', image: 'sprites/sword.png' },
  ],
};

/** Serves the demo pack's files from the Base pack's own files. */
async function serveDemoPack(page: Page): Promise<void> {
  const files: Record<string, string> = {
    'generators/en/items.json': 'generators/en/items.json',
    'generators/fr/items.json': 'generators/fr/items.json',
    'sprites/axe.png': 'sprites/axe.png',
    'sprites/axe.json': 'sprites/axe.json',
    'sprites/sword.png': 'sprites/sword.png',
  };
  await page.route(`${DEMO_ROOT}**`, async (route) => {
    const path = route.request().url().slice(DEMO_ROOT.length);
    if (path === 'pack.json') return route.fulfill({ json: DEMO_MANIFEST, headers: { 'access-control-allow-origin': '*' } });
    const file = files[path];
    if (!file) return route.fulfill({ status: 404 });
    const type = file.endsWith('.png') ? 'image/png' : 'application/json';
    return route.fulfill({ body: readFileSync(join(BASE, file)), contentType: type, headers: { 'access-control-allow-origin': '*' } });
  });
}

test('packs: list, details, add a pack, pack choice, creator', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await serveDemoPack(page);

  await page.goto('/tools/packs');
  await expect(page.locator('[data-test="pack-card"]').first()).toBeVisible();
  await shot(page, lang, 'packs-page');

  await page.getByRole('button', { name: t(lang, 'packs.details') }).first().click();
  await expect(page.locator('.p-dialog img').first()).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, lang, 'packs-details');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: t(lang, 'packs.add') }).click();
  await page.locator('input[data-test="pack-link"]').fill('https://github.com/demo/northern-blades');
  await page.getByRole('button', { name: t(lang, 'packs.check') }).click();
  await expect(page.locator('[data-test="pack-preview"]')).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, lang, 'packs-add-preview');
  await page.keyboard.press('Escape');

  await page.goto('/tools/item-generator');
  await expect(page.locator('app-item-card')).toBeVisible();
  await page.locator('p-select[data-field="pack"]').click();
  await expect(page.getByRole('option').first()).toBeVisible();
  await shot(page, lang, 'packs-choice');
  await page.keyboard.press('Escape');

  await page.goto('/tools/packs');
  await page.getByRole('button', { name: t(lang, 'packs.creator.create') }).click();
  await page.getByRole('button', { name: t(lang, 'packs.creator.newDraft') }).click();
  await expect(page.locator('input[data-test="draft-name-en"]')).toBeVisible();
  await page.locator('input[data-test="draft-name-en"]').fill(DEMO_MANIFEST.name.en);
  await page.locator('input[data-test="draft-name-en"]').press('Tab');
  await page.waitForTimeout(300);
  await shot(page, lang, 'packs-creator-details');

  await page.getByRole('tab', { name: t(lang, 'packs.creator.tabs.lists') }).click();
  await expect(page.locator('textarea[data-test="wordlist-fr-items"]')).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, lang, 'packs-creator-lists');

  await page.getByRole('tab', { name: t(lang, 'packs.creator.tabs.publish') }).click();
  await expect(page.getByRole('button', { name: t(lang, 'packs.creator.export') })).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, lang, 'packs-creator-publish');
});
