# Doc screenshots with Playwright

Status: resolved
Type: task
Blocked by: 08

Spec: `../spec.md` (User documentation)

- Playwright (dev dependency) scripts, one per module, under `user-docs/screenshots/`: start from the dev server, seed data (profile, a world, characters, items, NPCs, a combat) through the app's own storage or import, set the language, take named screenshots (FR and EN, mobile where the page differs) into the doc's assets.
- Two-device flows (room, invite, combat as a player) use two browser contexts in one script.
- `npm run docs:screenshots` runs them all (starts and stops the dev server itself). Screenshots are stable: fixed seed, fixed viewport, animations off.

## Answer

- **Playwright** `@playwright/test` 1.64.1 in `user-docs` (dev dependency, pinned; it uses Chromium build 1248, already in the local Playwright cache). Scripts in `user-docs/screenshots/`, config `playwright.config.ts`, images in `user-docs/src/assets/screens/<fr|en>/<module>-<name>.png` (36 per language, 5.2 MB of PNG; Astro converts them to WebP at build).
- **One command**: `npm run docs:screenshots` (root) installs the doc's packages, runs `playwright install chromium` (no-op when present) and every script in both languages, about 52 s. The config starts the dev server on port 4200, or reuses one already there (`SHOTS_BASE_URL` to point elsewhere).
- **Seeding through the app itself**: a `setup-<lang>` project per language creates the sample world with the wizard (starter items and classes), hosts it and adds two NPCs with the editor's Random button, then saves the browser state with IndexedDB; module projects start from it. No hand-written world JSON to keep in sync.
- **Scripts**: getting started (landing desktop and phone, profile), worlds (wizard steps, worlds list, lobby, world rules and the combat section), items (catalogue, slot menu, editor with a random item and image), NPCs (catalogue, editor), skills (skills, classes), dice (desktop, phone), tools (sprite colorizer with the demo, sprite library, item generator, external tools), about (credits, privacy), and **play**: a two-device game in one browser (the GM's saved context and a fresh player context): invite, join (the GM pastes the player's code: the dev server has no signalling mailbox), character creation, the player's table (desktop and phone), the sheet, the GM's table, starting an encounter, the GM combat panel and the player's combat view (desktop and phone).
- **Stable images**: seeded `crypto.getRandomValues`, `Math.random` and `crypto.randomUUID` in the screenshot browsers (same names, items, rolls and ids every run), animations and transitions off, carets and scrollbars hidden, pointer parked, tooltips hidden, fonts and images decoded before each shot, service workers blocked. The join code, its QR and the invite link carry fresh WebRTC keys, so they are masked in the app's paper colour. Two consecutive runs: 72 images, only a few scattered pixels of rendering noise differ.
- Helpers (`helpers.ts`): `t(lang, key)` reads the app's own i18n files so selectors follow the app's labels in both languages; `shot`, `go` (in-app navigation that keeps a hosted room open), `hostWorld`, `phone`.

Found while capturing (not fixed here): in the GM's table, a running combat squeezes the middle column so each row's life bar overlaps the initiative field (`combat-gm.png`); the dev server logs an Angular `NG0956` warning (a list tracked by identity re-creates 4 items) during the setup.
