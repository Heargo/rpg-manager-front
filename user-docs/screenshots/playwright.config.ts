import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { LANGS, STATE_DIR } from './helpers';

/**
 * Screenshots of the app for the user documentation: `npm run docs:screenshots` (repo root).
 * A setup step per language builds a world through the app's own wizard and saves the browser state
 * (IndexedDB included); every module script starts from it. Images go to src/assets/screens/<lang>/.
 */
const baseURL = process.env.SHOTS_BASE_URL ?? 'http://localhost:4200';

export default defineConfig({
  testDir: '.',
  testMatch: '*.shot.ts',
  outputDir: '../node_modules/.cache/screenshots-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  },
  projects: LANGS.flatMap((lang) => [
    {
      name: `setup-${lang}`,
      testMatch: 'setup.shot.ts',
      metadata: { lang },
    },
    {
      name: lang,
      testIgnore: 'setup.shot.ts',
      dependencies: [`setup-${lang}`],
      metadata: { lang },
      use: { storageState: join(STATE_DIR, `${lang}.json`) },
    },
  ]),
  webServer: {
    command: 'npm start -- --port 4200',
    cwd: '../..',
    url: baseURL,
    reuseExistingServer: true,
    // the screenshots don't need the doc's own dev server
    env: { SKIP_DOCS: '1' },
    timeout: 180_000,
  },
});
