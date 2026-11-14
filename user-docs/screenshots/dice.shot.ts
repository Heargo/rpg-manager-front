import { expect, test } from '@playwright/test';
import { langOf, phone, prepareContext, shot } from './helpers';

test('dice: roller, desktop and phone', async ({ page, context, browser }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await page.goto('/dice');
  await expect(page.locator('h1')).toBeVisible();
  await shot(page, lang, 'dice');

  const mobile = await phone(browser, undefined, lang);
  await mobile.goto('/dice');
  await expect(mobile.locator('h1')).toBeVisible();
  await shot(mobile, lang, 'dice-phone');
  await mobile.context().close();
});
