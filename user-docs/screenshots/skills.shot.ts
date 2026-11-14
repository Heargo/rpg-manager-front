import { expect, test } from '@playwright/test';
import { go, hostWorld, langOf, prepareContext, shot } from './helpers';

test('skills: skill catalogue and classes', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await hostWorld(page, lang);

  await go(page, '/room/skills');
  await expect(page.locator('h1')).toBeVisible();
  await shot(page, lang, 'skills-catalogue');

  await go(page, '/room/classes');
  await expect(page.locator('h1')).toBeVisible();
  await shot(page, lang, 'skills-classes');
});
