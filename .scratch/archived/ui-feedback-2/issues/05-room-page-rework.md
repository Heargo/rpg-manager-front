# Room page cleanup, offline features move to World rules

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- `/room`: cleaner layout (title, invite card, members, actions), the "open room" info card styled like the other app cards (same surface, border, radius, type scale, red theme accents).
- The offline features panel leaves the room page and becomes a section of the World rules page (same settings, saved the same way).

## Baseline

Test Files 131 passed, Tests 1113 passed.

## Seams

1. **Room page component (`TEST_PROVIDERS`)**: shows title, invite card, members and actions; no offline features panel any more. Misses: visual style (browser check).
2. **World rules page component**: shows the offline features section and saves its changes like the other rules. Misses: layout.

## Red

- Test files: `src/app/modules/room/pages/room-page/room-page.component.spec.ts`, `src/app/modules/world/pages/world-rules-page/world-rules-page.component.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/room/pages/room-page/room-page.component.spec.ts` (the world spec only runs in the full suite, `npx ng test --watch=false`: with `--include` on a world spec the build stops on an unrelated TS2591 `node:crypto` error in `src/testing/jsdom-setup.ts`, also without my change)
- Failing: 1 test
  - RoomPageComponent offline features > no longer hosts the offline features panel — the room page still renders `app-offline-features-panel`.
- Already green (not red): "WorldRulesPageComponent > saves the offline features toggled in its offline section with the other rules". `app-rule-fields` already has the Offline section and `saveRules` already saves `offlineFeatures`, so seam 2 needs no code change. It is a characterization test guarding the move.
- Full suite: 1 failed (the new red), 1114 passed.

## Green

- Files: src/app/modules/room/pages/room-page/room-page.component.{html,scss,ts}, public/i18n/en.json, public/i18n/fr.json
- Change: removed the offline features card, its handler and imports from the room page; dropped the now unused `room.offline.title` key (en, fr). Invite actions and pending invites now sit in an "invite" p-card; header gets a type-scale title and a theme-token bottom border; hint icons use the primary (red) colour. Only theme tokens used.
- Suite: 131 files / 1115 tests pass (baseline 1113 + 2 new); tsc clean; ng build OK.
- Open questions: `offline-features-panel` component and its spec are NOT deleted: the staged room-page spec imports `OfflineFeaturesPanelComponent` (3 `remove` overrides), so deleting it breaks compilation (TS2307). It is now unused in production; delete it together with those spec lines in a later step. Visual result not checked in a browser.

## Answer

Offline features panel removed from the room page (component deleted; the World rules page already had the Offline section and saves it). Room header keeps only Go to the table (the catalogues, rules and close now live in the in-room nav bar); invite actions in their own card, theme tokens. Browser: hosted a world, checked the room page and invite card, no console error.
