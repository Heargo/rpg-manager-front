import { expect, test } from '@playwright/test';
import { langOf, prepareContext, shot, t } from './helpers';

test('tools: sprite colorizer, item generator, links', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);

  await page.goto('/tools/sprite-colorizer');
  await page.getByRole('button', { name: t(lang, 'sprite.demo') }).click();
  await expect(page.locator('.material-item').nth(1)).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, lang, 'tools-sprite-colorizer');

  await page.getByRole('button', { name: t(lang, 'sprite.library.open') }).first().click();
  await expect(page.locator('[data-test="library-sprite"]').first()).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, lang, 'tools-sprite-library');
  await page.keyboard.press('Escape');

  await page.goto('/tools/item-generator');
  await expect(page.locator('app-item-card')).toBeVisible();
  await shot(page, lang, 'tools-item-generator');

  await page.goto('/tools/links');
  await shot(page, lang, 'tools-links');
});
