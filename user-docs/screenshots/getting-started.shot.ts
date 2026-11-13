import { expect, test } from '@playwright/test';
import { langOf, phone, prepareContext, shot } from './helpers';

test('getting started: landing, profile, phone', async ({ page, context, browser }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await page.goto('/');
  await expect(page.locator('[data-test="pitch"]')).toBeVisible();
  await shot(page, lang, 'getting-started-landing');

  await page.goto('/profile');
  await shot(page, lang, 'getting-started-profile');

  const mobile = await phone(browser, undefined, lang);
  await mobile.goto('/');
  await expect(mobile.locator('[data-test="pitch"]')).toBeVisible();
  await shot(mobile, lang, 'getting-started-landing-phone');
  await mobile.context().close();
});
