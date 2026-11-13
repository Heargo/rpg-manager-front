# Doc screenshots with Playwright

Status: ready-for-agent
Type: task
Blocked by: 08

Spec: `../spec.md` (User documentation)

- Playwright (dev dependency) scripts, one per module, under `user-docs/screenshots/`: start from the dev server, seed data (profile, a world, characters, items, NPCs, a combat) through the app's own storage or import, set the language, take named screenshots (FR and EN, mobile where the page differs) into the doc's assets.
- Two-device flows (room, invite, combat as a player) use two browser contexts in one script.
- `npm run docs:screenshots` runs them all (starts and stops the dev server itself). Screenshots are stable: fixed seed, fixed viewport, animations off.
