# Player copy and "Pick a save"

Status: resolved
Type: task
Blocked by: 03, 05

Spec: `../spec.md` (Player data: host copy and player copy).

- Player records carry `rev` and `updatedAt`; the host bumps `rev` on each change.
- Client stores its own player data per room (IndexedDB), updated from each `state`.
- `hello { playerId, rev, hash }`; on mismatch the client sends its copy, the player stays read-only, and the host gets a "Pick a save" `p-dialog`: both versions side by side, differing fields highlighted, queued offline actions listed; "Keep host version" / "Use player version". The pick becomes the next `rev`, is broadcast, and overwrites the client copy.

Done when: tests over the fake transport cover equal hashes (no dialog), mismatch → host keeps own, mismatch → host takes player's.

## Baseline

`npm test`: 56 test files, 372 tests, all passed (2026-11-07, `develop` at 771965c).

## Seams

Confirmed with the user (2026-11-07):

1. **`player-copy.rules.ts`** (pure): a stable hash of a player record (key order does not matter), the list of differing fields between two versions, and resolving a pick to the next `rev`. Catches hash and diff bugs; misses the wire.
2. **Host and player over the fake peer network** (`src/testing/game-device.ts`):
   - the player's copy is saved per room on every state;
   - equal hashes mean no conflict and no dialog;
   - a mismatch makes the player read-only and gives the host a pending conflict;
   - "Keep host version" and "Use player version" each become the next `rev`, are broadcast, and overwrite the player's copy.

   Misses UI.
3. **Pick a save dialog component** (`TEST_PROVIDERS`): both versions side by side, differing fields highlighted, queued actions listed when there are any; emits keep/use. Misses real layout.

Decision: the player copy sent on mismatch carries a `queued` list of actions (route + payload), always empty in this ticket. The dialog lists it when it isn't empty. P10 fills it.

## Red

- Test files:
  - `src/app/modules/room/helpers/player-copy.rules.spec.ts`
  - `src/app/modules/character/components/pick-a-save-dialog/pick-a-save-dialog.component.spec.ts`
  - `src/app/modules/character/business/player-copy.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (one per file)
- Failing: 17 tests; every file fails to build on missing modules (the whole `npm test` build fails until they exist):
  - rules: hash ignores key order (nested too); hash changes with any field; differingFields lists sorted deep differences; differingFields empty for equal and ignores rev/updatedAt; resolvePick host gives max rev + 1; resolvePick player gives max rev + 1; resolvePick goes past the higher rev — missing `room/helpers/player-copy.rules` (`hashPlayerRecord` async, `differingFields`, `resolvePick(host, player, pick, now)`).
  - dialog: side by side with only differing fields highlighted; queued actions listed only when present; emits keepHost / usePlayer — missing `PickASaveDialogComponent` and `character/models/player-copy` (`PlayerCopyConflict { playerId, playerName, host, player, queued: {route, payload}[] }`). Contract: rows `[data-field]` with `.host-value`/`.player-value`/`.differs`, `.queued li`, buttons `[data-action="keep-host"|"use-player"]`.
  - wire (fake network): saves the player's copy per room on every state; equal hashes no conflict; first join with no copy no conflict; mismatch gives read-only player and pending host conflict; keep host version; use player version — missing `PlayerCopyBusiness` (`savedCopy(roomId)`, `$readOnly`), `PlayerCopyHostBusiness` (`$conflicts`, `keepHost(playerId)`, `usePlayer(playerId)`), `PlayerCopyService`, `PlayerCopyStorageService`. The spec builds them per device in a child injector over `gameDevice`, so `game-device.ts` is untouched. They must hook in by themselves (e.g. on room status connected, own route for hello rev/hash and the full copy on mismatch). Decisions baked in: next rev = max(host rev, player rev) + 1; differingFields ignores rev and updatedAt.

## Green

- Files: `src/app/modules/room/helpers/player-copy.rules.ts`; `src/app/modules/character/{models/player-copy.ts, services/player-copy.service.ts, services/player-copy-storage.service.ts, business/player-copy.business.ts, business/player-copy-host.business.ts, components/pick-a-save-dialog/*, components/pick-a-save/pick-a-save.component.ts, player-copy.start.ts, pages/character-sheet-page/character-sheet-page.component.ts}`; `src/app/core/helpers/app-database.ts` (v3, `playerCopies`); `src/app/app.config.ts`; `public/i18n/{en,fr}.json`.
- Change: pure rules (stable hash, differing fields, pick to next rev); `PlayerCopyBusiness` saves the player's character per room once the host answered `player-copy/hello {rev, hash}`, sends its copy on mismatch and is `$readOnly` while its id is in the host's `player-copy/read-only` topic; `PlayerCopyHostBusiness` serves hello/submit, keeps `$conflicts`, `keepHost`/`usePlayer` write the pick as the next rev, publish characters and clear read-only. `PickASaveComponent` (`p-dialog` over the dialog content) shows the first conflict; the character sheet page disables actions with a warning note when read-only. Both businesses and the dialog start from `player-copy.start.ts`, a lazy chunk imported by the app initializer (`@defer` cost about 10 kB of core runtime and broke the 1.02 MB budget; `GameSessionBusiness` is not used because injecting there would give the spec a second, root-level instance).
- Suite: 59 files / 388 tests pass (baseline 56 / 372, plus the 3 new files, 16 tests); `tsc` clean; `ng build` no error, initial total 1.01 MB (budget untouched).
- Open questions: read-only is applied to the character sheet only; the dice and table pages still allow actions for a read-only player (P10 can cover them with the offline queue). The pending conflict is dropped when the same player says hello again; one that leaves for good stays listed until picked.

## Review

- Verdict: fix first
- Must fix:
  - `src/app/modules/character/business/character-host.business.ts:33,45,65` — the host never consults `PlayerCopyHostBusiness`' waiting list, so a read-only player's character actions (and create) are still applied; only the sheet's disabled buttons stop them. Spec says read-only, and client-side disable is not enforcement. Fix: expose `isWaiting(playerId)` from the host business (or a small shared rule) and reject with `PeerApiError('forbidden', ...)` in `onAction`/`onCreate`; add a wire test (waiting player sends an action, host state unchanged). Mind the layering: character-host must not create a cycle with player-copy-host (put the waiting set in a helper-backed business both use).
  - Race: `player-copy/hello` runs after `connected`, so actions sent before the answer arrive are accepted, and a player who never says hello is never held. The separate-route design is sound otherwise (the host answers before it publishes `read-only`, so no gap after the answer), but the host must close the window: treat a connected member as "unchecked" until its hello is served and reject actions from it (or run the check inside the join handshake as the spec's Protocol says). Add a test for an action sent right after connect.
  - `player-copy.business.ts:hello` — if `submit` fails (timeout, host busy) the player stays read-only with no conflict on the host: stuck for good. Retry, or have the host list a waiting player without a copy.
  - `player-copy-host.business.ts` — a conflict for a player who left stays listed and blocks the dialog queue (`$conflicts()[0]`). Drop it (and the waiting id) when the member leaves the room; the ticket's open question is a defect, not a note.
- Consider:
  - `player-copy.start.ts:1` — mounting `app-pick-a-save` by hand in `document.body` with `createComponent` is outside `docs/rules.md` (dialogs live in `app.html`, like the confirm dialog). A lazy chunk for 10 kB is a weak reason; prefer `<app-pick-a-save/>` in `app.html` (or a route-level `loadComponent`) and let the businesses start from `GameSessionBusiness`; fix the budget in `angular.json` if truly needed. The appended element is never destroyed and the `catch` only logs.
  - `player-copy-host.business.ts:onSubmit` — `queued` is cast, not validated per entry (route/payload shape).
  - Read-only covers the character sheet only; dice/table pages still send actions (host enforcement above fixes this for free).
  - Hash includes `rev`/`updatedAt` while `differingFields` ignores them: a mismatch with an empty diff shows a dialog with nothing highlighted.

## Green (after review)

- Files: added `character/business/player-copy-gate.business.ts` (shared hold set, no cycle) and `character/business/player-copy-guard.spec.ts` (5 wire tests); changed `character-host.business.ts`, `player-copy-host.business.ts`, `player-copy.business.ts`, `room/helpers/player-copy.rules.ts` (+ its spec: the hash test no longer expects `rev` to change it, plus one test that it is ignored), `src/testing/game-device.ts` (gate added to `GAME_DEVICE`), `public/i18n/{en,fr}.json` (`character.errors.held`).
- Change: (1) `onAction`/`onCreate` reject `forbidden` while the gate holds the sender (waiting for a pick); (2) the gate holds a connection until its `player-copy/hello` is served (per peer, only while the player-copy host is running, so other host tests are unaffected); (3) the player retries `submit` up to 5 times (100 ms steps) instead of staying stuck; (4) the host drops the waiting id and conflict of any player no longer online in the room; (5) the hash covers content only, without `rev`/`updatedAt`.
- Suite: 60 files / 394 tests pass; `tsc` clean; `ng build` no error, initial total 1.01 MB.
- Open questions: after 5 failed submits the player is still read-only (logged); leaving and rejoining recovers. The review's "consider" items (`player-copy.start.ts` mounting, per-entry `queued` validation) are not done.

## Review (re-check after fixes)

- Verdict: ship
- Must fix: none. Host enforcement (`isHeld` in `onAction`/`onCreate`), the unchecked-connection window, submit retry, dropping offline players' conflicts and the content-only hash are in and covered by `player-copy-guard.spec.ts` and the rules spec.
- Consider:
  - `player-copy-gate.business.ts` `checkedPeers` is never pruned for peers that disconnect (small leak; and it relies on a rejoin getting a fresh `PeerId`, which the test shows today). Delete the peer on leave.
  - After 5 failed submits the player stays read-only until rejoin (logged only); a toast would help.
  - Earlier Consider items still open: `player-copy.start.ts` manual mount outside the `app.html` pattern, per-entry `queued` validation.

## Answer

Built:

- `room/helpers/player-copy.rules.ts`: content-only hash (key order and `rev`/`updatedAt` ignored), differing fields, and resolving a pick to max(rev) + 1.
- Player side, `PlayerCopyBusiness`: saves its character per room (IndexedDB v3 `playerCopies`) on every state; sends `player-copy/hello {playerId, rev, hash}` after connect, and its full copy (with an empty `queued` list) on mismatch, retried up to 5 times; is `$readOnly` while held. The character sheet disables actions and says why.
- Host side, `PlayerCopyHostBusiness` + `PlayerCopyGateBusiness`:
  - holds a connection until its hello is served, and holds a mismatched player until the pick;
  - `CharacterHostBusiness` rejects a held sender's actions and creation as `forbidden`;
  - `keepHost`/`usePlayer` write the pick as the next rev, broadcast it, and release the player;
  - a departed player's conflict is dropped.
- "Pick a save" `p-dialog` (`p-table` side by side, differing fields highlighted, queued actions listed when present). It is started with both businesses from the lazy `player-copy.start.ts` chunk, to keep the initial bundle within 1.02 MB.

Decisions:

- **Protocol**: the check runs on its own `player-copy/*` routes after connect, not inside `room/hello` (keeps the room module free of character data). The race is closed by holding unchecked connections on the host.
- **Hash**: content only, decided by the user.
- **`queued`**: always empty until P10.

Checked:

- Suite: 60 files, 394 tests (baseline 56 / 372). Build OK, initial 1.01 MB.
- Browser: the app starts with no console error, and the dialog's chunk loads and mounts.
- The conflict flow itself needs two profiles, so it is covered by the multi-device tests (`player-copy.spec.ts`, `player-copy-guard.spec.ts`), not the browser: two devices in one browser share one profile.

Left as Consider:

- `checkedPeers` is not pruned on disconnect.
- No toast after 5 failed submits (rejoin recovers).
- Manual mount in `player-copy.start.ts` rather than `app.html`.
- No per-entry validation of `queued` (P10 will fill it).
