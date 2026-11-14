import { expect, Page, test } from '@playwright/test';
import { go, hostWorld, langOf, prepareContext, shot, t } from './helpers';

/**
 * A real two-device game in one browser: the GM (saved state) invites, a player context joins with the link.
 * The dev server has no signalling mailbox, so the GM pastes the player's code (the manual fallback).
 */
test('play: invite, join, character, table, combat', async ({ page: gm, context, browser }, info) => {
  test.setTimeout(180_000);
  const lang = langOf(info);
  await prepareContext(context, lang);
  await hostWorld(gm, lang);

  // GM: invite a player
  await gm.getByRole('button', { name: t(lang, 'room.invite.add') }).click();
  const link = gm.locator('input[id^="link-"]').first();
  await expect(link).toHaveValue(/\/join/);
  const invite = await link.inputValue();
  await shot(gm, lang, 'rooms-invite', { mask: [link] });

  // Player: open the link on another device
  const playerContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    // a new device: not the GM's saved state, which the project would apply otherwise
    storageState: { cookies: [], origins: [] },
  });
  await prepareContext(playerContext, lang, lang === 'fr' ? 'Ysolde' : 'Robin');
  const player = await playerContext.newPage();
  await player.goto(invite);
  const answer = player.locator('#answer-code');
  await expect(answer).toHaveValue(/.{20,}/, { timeout: 60_000 });
  await shot(player, lang, 'rooms-join', { mask: [answer, player.locator('img.qr')] });

  // GM: paste the player's code
  await gm.getByText(t(lang, 'room.invite.paste')).click();
  await gm.getByPlaceholder(t(lang, 'room.invite.answerPlaceholder')).fill(await answer.inputValue());
  await gm.getByRole('button', { name: t(lang, 'room.invite.accept') }).click();

  // Player: create the character
  const name = player.locator('#character-name');
  await expect(name).toBeVisible({ timeout: 60_000 });
  await name.fill(lang === 'fr' ? 'Ysolde la Rousse' : 'Robin of the Fens');
  const firstClass = player.getByTestId('class-card').first();
  if (await firstClass.count()) await firstClass.click();
  await shot(player, lang, 'characters-create');
  await player.getByRole('button', { name: t(lang, 'character.create.submit') }).click();
  await player.waitForURL(/\/room\/(table|sheet)/, { timeout: 30_000 });
  await settle(player);
  await shot(player, lang, 'table-player');
  await player.setViewportSize({ width: 390, height: 844 });
  await shot(player, lang, 'table-player-phone');
  await player.setViewportSize({ width: 1280, height: 800 });

  // Player: the character sheet
  await player.getByRole('button', { name: t(lang, 'character.sheet.open') }).first().click();
  await player.waitForURL(/\/room\/sheet\//);
  await settle(player);
  await shot(player, lang, 'characters-sheet');
  await go(player, '/room/table');

  // GM: the table
  await go(gm, '/room/table');
  await settle(gm);
  await shot(gm, lang, 'table-gm', { fullPage: true });

  // GM: start an encounter with the character and one enemy
  const start = gm.locator('[data-action="start"]');
  await start.scrollIntoViewIfNeeded();
  await gm.locator('[data-action="toggle-character"]').first().click();
  await gm.locator('[data-action="npc-plus"]').first().click();
  await shot(gm, lang, 'combat-start', { locator: gm.locator('section.combat') });
  await start.click();
  await expect(gm.locator('[data-action="next-turn"]')).toBeVisible({ timeout: 30_000 });
  await shot(gm, lang, 'combat-gm', { locator: gm.locator('section.combat') });

  await expect(player.locator('app-combat-player-view')).toBeVisible({ timeout: 30_000 });
  await settle(player);
  await shot(player, lang, 'combat-player', { fullPage: true });
  await player.setViewportSize({ width: 390, height: 844 });
  await player.locator('app-combat-player-view').scrollIntoViewIfNeeded();
  await shot(player, lang, 'combat-player-phone');

  await playerContext.close();
});

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
