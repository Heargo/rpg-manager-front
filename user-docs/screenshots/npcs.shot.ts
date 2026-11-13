import { expect, test } from '@playwright/test';
import { go, hostWorld, langOf, prepareContext, shot } from './helpers';

test('npcs: catalogue and editor', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await hostWorld(page, lang);

  await go(page, '/room/npcs');
  await expect(page.locator('h1')).toBeVisible();
  await shot(page, lang, 'npcs-catalogue');

  await go(page, '/room/npcs/editor');
  await page.locator('[data-action="random"]').click();
  await page.waitForTimeout(300);
  await shot(page, lang, 'npcs-editor');
});
