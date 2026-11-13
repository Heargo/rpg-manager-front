import { expect, test } from '@playwright/test';
import { go, hostWorld, langOf, prepareContext, shot } from './helpers';

test('worlds: lobby and world rules', async ({ page, context }, info) => {
  const lang = langOf(info);
  await prepareContext(context, lang);
  await hostWorld(page, lang);
  await shot(page, lang, 'rooms-lobby');

  await go(page, '/room/rules');
  await expect(page.locator('h1')).toBeVisible();
  await shot(page, lang, 'worlds-rules');
  const combat = page.getByTestId('rules-section-combat');
  if (await combat.count()) {
    await page.getByRole('tab').nth(1).click();
    await combat.evaluate((d) => ((d as HTMLDetailsElement).open = true));
    await combat.scrollIntoViewIfNeeded();
    await shot(page, lang, 'worlds-rules-combat', { locator: combat });
  }
});
