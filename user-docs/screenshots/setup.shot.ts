import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { go, hostWorld, langOf, prepareContext, shot, STATE_DIR, t } from './helpers';

/** Builds the world every other script uses, through the app's own wizard, and saves the browser state. */
test('create the sample world', async ({ browser }, info) => {
  const lang = langOf(info);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await prepareContext(context, lang);
  const page = await context.newPage();

  await page.goto('/worlds/new');
  await page.locator('#world-name').fill(lang === 'fr' ? 'Les Terres de Brume' : 'The Misty Lands');
  await page.locator('#world-description').fill(
    lang === 'fr' ? 'Un royaume de marais et de vieilles tours.' : 'A kingdom of marshes and old towers.',
  );
  await shot(page, lang, 'worlds-wizard-identity');
  await page.getByRole('button', { name: t(lang, 'world.new.next') }).first().click();

  await expect(page.getByTestId('attributes-next')).toBeVisible();
  await shot(page, lang, 'worlds-wizard-attributes');
  await page.getByTestId('attributes-next').click();

  const create = page.getByRole('button', { name: t(lang, 'world.new.create') });
  await expect(create).toBeVisible();
  await shot(page, lang, 'worlds-wizard-rules');
  await create.click();
  await page.waitForURL(/\/play/);
  await shot(page, lang, 'worlds-list');

  // Two NPCs drawn by the editor's Random button, so NPC pages, the table and combat have someone.
  await hostWorld(page, lang);
  for (let i = 0; i < 2; i++) {
    await go(page, '/room/npcs/editor');
    await page.locator('[data-action="random"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-action="save"]').click();
    await page.waitForURL((url) => url.pathname === '/room/npcs');
  }

  await context.storageState({ path: join(STATE_DIR, `${lang}.json`), indexedDB: true });
  await context.close();
});
