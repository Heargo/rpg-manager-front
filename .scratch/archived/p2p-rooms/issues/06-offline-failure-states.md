# Offline and failure states

Status: resolved
Type: task
Blocked by: 04

Offline banner (PWA), "Host disconnected: ask for a new invite link", connection timeout ("couldn't connect, try the same Wi-Fi"), bad, expired or already-used code errors, warning that pending invites die on host reload.

## Baseline

`npm test`: 67 test files, 438 tests, all passed (2026-11-07, `develop` at c75e9af).

## Already there (left alone)

Built by P04, P05 and P12–P14 (strings under `room.*` in `public/i18n/*.json`):

- host disconnected (`room.lobby.hostOffline`);
- connection timeout (`room.errors.timeout`);
- damaged, wrong-version and wrong-kind codes (`room.errors.code.*`);
- unknown invite (`room.errors.unknownInvite`);
- room reopened after a host reload (`room.lobby.restored`).

## Seams

Confirmed with the user (2026-11-07):

1. **Device-offline banner:** a business over the browser's `online`/`offline` events, and an app-wide banner component (`TEST_PROVIDERS`) that appears when the device goes offline and disappears when it's back. Catches the event wiring; misses real PWA network behaviour.
2. **Stale invite errors:** distinct "invite expired" and "invite already used" errors for a player opening a stale link, instead of the generic "no longer exists". Tested over the fake network and mailbox. Catches protocol and error codes; misses the real mailbox function.
3. **Pending invites warning:** a host-lobby note while invites are pending, and the browser's leave-page prompt (`beforeunload`) on reload or close while any invite is pending. Tested through the component and the business. Catches when the warning is armed; misses the browser's own dialog.

Constraint: the initial bundle is at its 1.02 MB budget. Don't raise it; anything that must be in the shell has to fit, by trimming elsewhere if needed.

## Red

- Test files: `src/app/core/business/online.business.spec.ts`, `src/app/core/components/offline-banner/offline-banner.component.spec.ts`, `src/app/modules/room/business/room-offline.business.spec.ts`, `src/app/modules/room/pages/room-page/room-page.component.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one file at a time: a missing module fails the whole build when files are combined)
- Failing: 12 tests
  - OnlineBusiness: starts online when the browser says so; starts offline when already offline; goes offline/online on the window events — `core/business/online.business.ts` (`OnlineBusiness`, `$online` signal) missing.
  - OfflineBannerComponent: is absent while online; appears ("You're offline") on `offline` and goes on `online` — `offline-banner.component.ts` (`OfflineBannerComponent`, `.offline-banner`) missing.
  - RoomBusiness stale invites (3): used invite via manual code; used invite via box link; cancelled invite — fake network still throws `unknown-invite`; needs `TransportError` reasons `invite-used` / `invite-expired` (fake network: accepted → used, cancelled → expired, never made → unknown), mapped in `roomErrorKey` to new `room.errors.*` strings ("This invite was already used. Ask the host for a new one." / "This invite has expired. Ask the host for a new one.").
  - RoomBusiness leave-page prompt (2): armed while an invite is pending; disarmed after the last is cancelled — no `beforeunload` handler (must `preventDefault()`).
  - RoomPageComponent (2): note `.pending-invites-note` ("Pending invites are lost if you reload or close this page") shown while invites are pending; absent otherwise and follows `$pendingInvites` — no such element.

## Green

- Files: `src/app/core/business/online.business.ts`, `src/app/core/components/offline-banner/offline-banner.component.{ts,html,scss}`, `src/app/app.{ts,html,config.ts}`, `src/app/core/p2p/{room-transport,fake-transport,webrtc-transport}.ts`, `src/app/core/p2p/helpers/mailbox-handler.ts`, `netlify/functions/signal.mts`, `src/app/modules/room/{business/room.business.ts,helpers/room-errors.ts,services/signal-mailbox.service.ts,pages/room-page/room-page.component.html}`, `public/i18n/{en,fr}.json`; specs extended (not red ones): `mailbox-handler.spec.ts`, `room-errors.spec.ts`.
- Change: `TransportError` gains `invite-used` / `invite-expired`, reported by the fake network and by the WebRTC transport (host-side `acceptAnswer`, manual path). Mailbox: the host closes a box with `DELETE ?reason=used|expired`, which leaves a marker until the TTL; a player's GET answers 409 (used) or 410 (expired, including past the TTL), `SignalMailboxService` maps those to `TransportError`, and `join` lets them through. A host GET on a stale box stays 204. `RoomBusiness` arms a `beforeunload` prompt while invites are pending; the room page shows `.pending-invites-note`; `OfflineBannerComponent` sits in the app shell under the nav bar. New strings in EN and FR: `common.offlineBanner`, `room.errors.inviteUsed/inviteExpired`, `room.lobby.pendingInvitesNote`.
- Budget: the shell additions put the initial bundle 1.2 kB over 1.02 MB. Moved `GameSessionBusiness` from an eager import in `app.config.ts` to a lazy `import()` in the app initializer (same pattern as player copy). Initial is now 984.20 kB; budget unchanged.
- Suite: 71 files, 458 tests, all pass (baseline 67 files, 438 tests). `tsc` clean, `ng build` no error, no red test file modified. The existing mailbox spec "treats a box older than 30 minutes as empty" now asserts a host GET (a player GET now gives 410).
- Open questions: a player hitting a box that was already swept (after TTL) still gets the generic "no longer exists" (204 is indistinguishable from a never-used box). Mailbox 409/410 and the real WebRTC reasons are unit-tested only at the handler level; the Netlify function itself is untested.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `src/app/app.config.ts:45` — lazy `GameSessionBusiness`: safe. Handlers only matter once a player connects, and a restored host has no live connection until it re-invites, so nothing is published before the chunk resolves. The effect reads `$room()` when it first runs, so a `/room` deep link that built `RoomBusiness` first still gets its handlers. The root singleton means no double start (`openWorldId` guard too). Differences from `player-copy.start.ts`: host restore now begins only when the chunk resolves or a page injects `RoomBusiness`, and a failed import only logs, leaving a restored host without handlers. Suggest a small `startGameSession(injector)` helper next to the player-copy one, and a retry or toast on failure.
  - `room.business.ts:517-523` (`pollPlayer`) — a waiting player's poll swallows the new 409/410, so a host who cancels the invite while the player waits is never reported (only the timeout is). Stop the polling and fail the join with the `TransportError`.
  - `room.business.ts:125-134` — `beforeunload` is armed for the injector's whole life and only the handler checks `invites()`. This is correct (no `preventDefault` when none pending or after `leave()`, which clears invites) but a permanent listener can block bfcache. Add and remove it from an `effect` on `$pendingInvites().length`.
  - `signal.mts` / `mailbox-handler.ts` — a stranger learns nothing new without the box id (unknown ids stay 204, the id is the capability). DELETE was already unauthenticated, and `?reason=` only adds a marker. Anyone holding the link can now mark it used and block the player's answer until the host re-offers. That is the same power as before (deleting the box), so acceptable. Unknown `reason` values fall back to a plain delete, which is good. The Netlify wrapper's `reason` pass-through is untested.
  - `mailbox-handler.spec.ts:95` — the edit is legitimate (a player GET on a stale box now returns 410, covered by the new test; `data.size` is still asserted 0). Add a stale-box PUT-by-player case.

### Review fixes

- `pollPlayer` now fails the join with the `invite-used` / `invite-expired` `TransportError` when the box is closed while the player waits (test in `room-mailbox.business.spec.ts`; `MemorySignalMailbox` now models closed boxes).
- `beforeunload`: attached only while an invite is pending, removed when the last goes. It is toggled synchronously where the invite list changes (`syncLeavePrompt`), not from an `effect`: an effect runs later, so the red tests (which dispatch right after `await invite()`) failed with it.
- Suite: 71 files, 459 tests pass; `tsc` clean; `ng build` no error, initial 984.62 kB.

## Answer

Built:

- `OnlineBusiness` (`$online` from the browser's `online`/`offline` events), and `OfflineBannerComponent` in the app shell under the nav bar: "You're offline. Saved data still works; connecting to a room needs a network."
- Stale invites:
  - `TransportError` gains `invite-used` and `invite-expired`, reported by the fake network, by WebRTC `acceptAnswer` (manual code) and by the mailbox.
  - Mailbox: the host closes a box with `DELETE ?reason=used|expired`, which leaves a marker until the TTL. A player's GET then answers 409 or 410 (410 also past the TTL).
  - `SignalMailboxService` and `pollPlayer` stop on these answers, so the waiting player sees the specific message.
  - New strings `room.errors.inviteUsed` and `room.errors.inviteExpired`.
- Pending invites: the `.pending-invites-note` in the host lobby, and a `beforeunload` prompt that is attached only while an invite is pending (synchronously, through `syncLeavePrompt`).

Decision: to fit the banner in the budget, `GameSessionBusiness` is now loaded lazily from the app initializer, like the player copy. The review checked it is safe: nothing is served before a player connects, and it starts only once. The initial bundle went from 1.02 MB to 984.62 kB, and the budget is unchanged.

Checked:

- Suite: 71 files, 459 tests (baseline 67 / 438). Build OK.
- Browser: the banner appears and disappears on the window events, in French and in English at mobile width. The lobby note appears once an invite is created, and the leave prompt is armed then. No console error and no horizontal scroll.

Left as Consider:

- A box already swept after its TTL still gives the generic "no longer exists".
- The Netlify function wrapper (the `reason` pass-through) is untested.
- If the lazy game-session chunk fails to load, the error is only logged: add a `startGameSession` helper with a retry or toast.
