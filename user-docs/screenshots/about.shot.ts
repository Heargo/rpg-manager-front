import { expect, test } from '@playwright/test';
import { langOf, prepareContext, shot } from './helpers';

test('about: credits and privacy', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  for (const [path, name] of [
    ['/credits', 'about-credits'],
    ['/privacy-policy', 'about-privacy'],
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await shot(page, lang, name);
  }
});
