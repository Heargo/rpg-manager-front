# Players keep their joined worlds offline

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- When a player joins a world, the app records it locally (IndexedDB): world id, world name, host name, invite, last seen; the player's character copy is the P09 copy.
- The Worlds page lists the GM's own worlds and the joined ones, each with a badge **GM** or **Player**.
- A joined world opens the character sheet read-only from the local copy when the host is offline, and offers Rejoin with the saved invite. Remove from the list is possible.

## Baseline

Test Files 146 passed, Tests 1174 passed.

## Seams

1. **Joined worlds business over its storage service (service mocked as business specs do; the service itself on `fake-indexeddb`)**: joining records the world (id, name, host name, invite, last seen) and updates it on rejoin; list; remove. Misses: the real join flow.
2. **Worlds page (play page) component**: lists the GM's worlds and the joined ones with a GM / Player badge; the page title is "Worlds"/"Mondes"; a joined world offers Rejoin (saved invite) and opening the character read-only from the local player copy; Remove asks first.
3. **Character sheet page for a joined world while the host is offline**: shows the sheet from the local P09 copy, read-only. Misses: real host-offline transport (multi-device test covers the copy).

## Red

- Test files:
  - `src/app/modules/play/services/joined-worlds-storage.service.spec.ts` (fake-indexeddb)
  - `src/app/modules/play/business/joined-worlds.business.spec.ts`
  - `src/app/modules/play/pages/play-page/play-page-worlds.component.spec.ts`
  - `src/app/modules/character/pages/joined-world-sheet-page/joined-world-sheet-page.component.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (per file)
- Failing: 17 tests (3 + 5 + 6 + 3)
  - storage: saves and lists back; replaces same world id; deletes one record — missing `JoinedWorldsStorageService` / `models/joined-world` (store `joinedWorlds` keyPath `worldId`, bump `APP_DATABASE_VERSION` to 4)
  - business: records with lastSeenAt; updates on rejoin; most recent first; loads from storage; removes — missing `JoinedWorldsBusiness`
  - play page: title "Worlds"/"Mondes" (currently "Play"); GM/Player badges; Rejoin navigates `['/join'], {fragment: offerCode}`; open-sheet navigates `['/play/joined','w9']`; no rejoin/remove on own world; Remove asks via ConfirmationService first — no `world-entry`/badge/buttons or `play.title` change
  - joined sheet page: sheet from saved copy; read-only notice; unknown world shows nothing — missing `JoinedWorldSheetPageComponent`
- Contracts to implement:
  - `JoinedWorld { worldId, roomId, name, hostName, invite, lastSeenAt, sheetWorld }` (`sheetWorld`: the `SheetWorld` snapshot, needed because the player device has no world data offline).
  - `JoinedWorldsBusiness` (play): `load()`, `$worlds` (latest seen first), `record(entry)` stamps `Date.now()`, upsert by worldId, `remove(worldId)`.
  - `PlayBusiness.$joinedWorlds` and `removeJoinedWorld(id)`.
  - Page data-test hooks: `world-entry`, `world-badge`, `rejoin`, `open-sheet`, `remove-joined`.
  - Route `/play/joined/:worldId`, `JoinedWorldSheetPageComponent`: uses `PlayerCopyBusiness.savedCopy(roomId)` and `[data-test="joined-readonly"]`.
- Already exists (reused, not retested): `JoinedRoomRecord` and `RoomStorageService` (`joinedRooms` store keyed by room id), `RoomBusiness.$recentRooms`/`forgetRecentRoom`, `PlayBusiness.$joinedRooms`/`forgetRoom`, the "Salles rejointes" card on the play page, `PlayerCopyStorageService` / `PlayerCopyBusiness.savedCopy` (`playerCopies` store). Missing today: the invite and world id are not recorded, no world snapshot, no GM/Player badges, no Rejoin or offline open. Not covered by tests: calling `record` from the real join flow (wiring).

## Green

- Files: new `src/app/modules/play/models/joined-world.ts`, `play/services/joined-worlds-storage.service.ts`, `play/business/joined-worlds.business.ts`, `character/pages/joined-world-sheet-page/joined-world-sheet-page.component.ts`. Changed `core/helpers/app-database.ts` (v4, `joinedWorlds` store, `joinedRooms` dropped on upgrade), `play/business/play.business.ts` (`$joinedWorlds`, `removeJoinedWorld`, `load` also loads joined), `play/business/game-session.business.ts` (records the joined world), `play/play.routes.ts` (`/play/joined/:worldId`), play page ts/html/scss, `room/business/room.business.ts` (`$joinedInvite`; recent-rooms code removed), `room/services/room-storage.service.ts`, `room/models/room.ts`, `public/i18n/en.json` and `fr.json`.
- Change: joined worlds are stored locally and listed on the play page (title Worlds/Mondes) as world cards with a GM (warn) or Player (info) p-tag, with Rejoin (saved invite fragment, box id kept), Open character (read-only sheet from the P09 copy) and Remove (confirmation). Wiring: `GameSessionBusiness` (started at launch) runs an effect that records the world (name, host name, invite from `RoomBusiness.$joinedInvite`, sheet rules snapshot) once connected as a player with world info and a character, and again at each world info update (refreshes `lastSeenAt` and `sheetWorld`). The old "Salles rejointes" card, `$recentRooms`, `forgetRecentRoom`, `$joinedRooms`, `forgetRoom`, `JoinedRoomRecord`, the `joinedRooms` store and its storage methods, the `room.recent.*` i18n keys are removed (nothing in P05/P14 reconnection used them).
- Suite: 150 files, 1190 tests all pass (baseline 146/1174 plus the 4 red files); tsc clean; `ng build` has no error. No red spec file is modified.
- Older specs edited (tests of removed code): `room/business/room.business.spec.ts` deleted the test "remembers the rooms a player joined, and forgets them on request"; `play/business/play.business.spec.ts` dropped the `forgetRecentRoom`/`$recentRooms` mock entries; `play/pages/play-page/play-page.component.spec.ts` and `play-page-scan-focus.component.spec.ts` mock `$joinedWorlds` instead of `$joinedRooms`.
- Open questions: Rejoin uses the saved invite, which fails with the usual "invite used/expired" error when the host has since issued a new one (a fresh invite is then needed; no automatic fallback). The recorder in `GameSessionBusiness` is not unit tested (not covered by the red tests).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - game-session.business.ts:48 — the recorder effect tracks `$room()` whole, so every member or presence change rewrites the record and bumps `lastSeenAt`; no loop (the write is in `untracked`, `record` touches no tracked signal) and it skips the host's own world (`$isHost`) and non-connected states. Narrow it with a `computed` on room id and host name, or accept it as a "last seen" refresh. It is untested: a small spec (player records once, host does not, offline does not) would pin the guard.
  - joined-worlds.business.ts:19 — `load()` replaces the signal from storage; a `record()` made while it runs can be dropped from the list until the next load. Merge instead of set.
  - app-database.ts:39-41 — v4 upgrade drops `joinedRooms` through double casts and has no upgrade test; acceptable per no-backward-compat, but a v3 to v4 `fake-indexeddb` check would prove the store is gone and `joinedWorlds` exists.
  - play-page-worlds.component.spec.ts:39 — the red spec still mocks the removed `$joinedRooms` (harmless).
  - joined-world.ts:1 — `play` models import `SheetWorld` from the character business, and the character page imports the play business: a module cycle between features. Fine now, watch it.
  - Removed recent-rooms code: no leftover references in src or public (only the stale mock above).

### Green follow-ups (review)

- `JoinedWorldsBusiness.load()` merges storage with entries recorded meanwhile (by worldId, newest lastSeenAt wins).
- The recorder in `GameSessionBusiness` reads a `computed` key (world info, invite, room id, host name, sheet present, connected, not host) with a field-wise `equal`, so member presence changes and character updates do not rewrite the record.
- New `play/business/game-session.business.spec.ts`: records once when connected as a player; not on the host; not offline or joining.
- Suite: 151 files, 1193 tests pass; tsc clean; ng build no error.

## Answer

Joined worlds stored locally (IndexedDB v4 `joinedWorlds`, old `joinedRooms` dropped), recorded by `GameSessionBusiness` for connected players only (computed key, so presence changes do not rewrite). Worlds page (title Mondes/Worlds) lists own and joined worlds with GM/Player badges, Rejoin (saved invite), Open character read-only (`/play/joined/:worldId`, P09 copy), Remove with confirm. Old "Salles rejointes" card and recent-rooms code removed. Review: ship; follow-ups applied (merge on load, narrowed recorder, recorder spec). Browser: Worlds title and GM badge, chunks load with 200 after reload. The player side stays covered by specs (one browser profile). Known limit: a saved invite may be used/expired at Rejoin.
