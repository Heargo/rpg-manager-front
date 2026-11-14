import { expect, test } from '@playwright/test';
import { go, hostWorld, langOf, prepareContext, shot } from './helpers';

test('items: catalogue, menu, editor', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await hostWorld(page, lang);

  await go(page, '/room/items');
  const slots = page.locator('[data-field="slot"]');
  await expect(slots.first()).toBeVisible();
  await shot(page, lang, 'items-catalogue');

  await slots.nth(2).click();
  await expect(page.locator('[data-automationid="edit"]')).toBeVisible();
  await shot(page, lang, 'items-menu');
  await page.keyboard.press('Escape');

  await go(page, '/room/items/editor');
  await page.locator('[data-action="random"]').click();
  await expect(page.locator('app-image-picker img')).toBeVisible();
  await shot(page, lang, 'items-editor');
});
