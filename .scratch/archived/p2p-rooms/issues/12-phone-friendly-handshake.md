# Joining from a phone: survive leaving the page

Status: resolved
Type: task
Blocked by: none

Decided 2026-11-07: joining keeps the manual handshake (invite link, then answer code); no signalling mailbox on Netlify. So it has to work when the player (and the host) switch to their chat app to pass codes, which on a phone means the browser tab goes to the background.

## The problem

- The player opens the link, copies the answer code and switches to their chat app. Their tab is now in the background.
- The host pastes the code: connectivity checks start at once, and the player's tab must answer them. Android Chrome keeps a background tab's network running for a while; iOS Safari can freeze it within seconds. If the checks fail (about 30 s), the connection is lost and today the player sees a generic error.
- The host does the same in reverse when sending the link, but the host's page only waits, so it's less fragile.

## Scope

- **Measure first** on real devices (Android Chrome, iOS Safari, as player and as host): how long a background tab keeps answering, and whether the connection completes when the player comes back within the ICE timeout. Record the numbers in this ticket; they decide the wording below.
- **Player page:**
  - "Send to the host" button with the Web Share API (`navigator.share`, text = the answer code), copy as fallback, so sending takes one tap and returning is one swipe.
  - Right after sharing or copying, a clear step: "Come back to this page: you'll be connected as soon as the host pastes your code." with the waiting state.
  - The pending connection and its answer code survive the page being hidden (no rebuild on `visibilitychange`; keep the code on screen).
  - On return (`visibilitychange` → visible): show where it stands (connected / still waiting / failed). When it failed while away: "The connection timed out while you were away. Ask the host for a new link." with nothing else to do.
- **Host page:** pasting a code shows "Connecting…" on that invite; on failure the invite says "Couldn't connect: send a new invite" with a button that makes a fresh one for the same seat (re-invite already exists).
- **Wake lock**: while the player's page waits for the host, request a screen wake lock where supported, so the phone doesn't lock mid-join.

## Out of scope

- A server mailbox (rejected for now: keep the app serverless besides TURN credentials).
- The relay retry: ticket 13.
- QR scanning: ticket 08 (helps in person, no app switching).

## Done when

- Device measurements are written below.
- On Android Chrome and iOS Safari, a player who shares the code and comes back within the measured window ends up connected; one who comes back too late sees the timeout message, and the host can re-invite in one tap.
- Tests: the player join state (waiting → connected / failed-while-away) and the host invite state (connecting → failed → re-invite) with the fake transport.

## Baseline

- 2026-11-07, `develop` at 4229af8: 43 test files, 235 tests, all passing.

## Seams

1. `RoomBusiness`, player side, over the fake network: a `$joinState` (`preparing` → `waiting` → `connected` | `failed`, with `failedWhileAway` when the page was hidden at the time of failure, read from `document.visibilityState`). Catches the state machine and the timeout-while-away case; misses real browser freezing.
2. `RoomBusiness`, host side, over the fake network: each `PendingInvite` gets a `state` (`waiting` → `connecting` → `failed`); a failed accept keeps the invite marked failed instead of removing it, and `retryInvite(inviteId)` replaces it with a fresh invite for the same seat. Catches host recovery; misses the UI.
3. `JoinPageComponent` (inputs/DOM, `TEST_PROVIDERS`, `navigator.share` and wake lock stubbed): "Send to the host" calls `navigator.share` with the code (copy when unavailable), then shows the "come back to this page" step; the failed-while-away message. Catches wiring; misses real share sheets.

Confirmed by the user 2026-11-07. Device measurements come after the build (user tests on Android/iOS); the ticket stays open until they're recorded.

Wake lock goes through a small service (browser API), asked for by `RoomBusiness` while waiting and released after.

## Comments

## Red

- Test files: `src/app/modules/room/business/room-handshake.business.spec.ts` (new), `src/app/modules/room/pages/join-page/join-page.component.spec.ts` (new)
- Run: `npx ng test --watch=false --include src/app/modules/room/business/room-handshake.business.spec.ts` and `... --include src/app/modules/room/pages/join-page/join-page.component.spec.ts`
- Failing: 11 tests (business spec fails to compile until the symbols exist, so all 8 of its tests fail; component spec: 3 fail by assertion). Note: the missing exports make the whole `ng test` run fail to compile until green; the other 43 files pass when run without the business spec.
  - player: preparing → waiting → connected, wake lock requested then released — missing `$joinState`, `$failedWhileAway`, `WakeLockService`
  - player: stays waiting across visibilitychange hidden/visible — missing `$joinState`
  - player: failed, `$failedWhileAway` false when visible — missing
  - player: failed, `$failedWhileAway` true when hidden, wake lock released — missing
  - player: leave while waiting releases the wake lock, state back to `idle` — missing
  - host: invite `state` waiting → connecting during accept, invite dropped on success — `PendingInvite.state` missing
  - host: failed accept keeps the invite with `state: 'failed'` — missing
  - host: `retryInvite(inviteId)` returns a fresh invite for the same seat, replaces the failed one, and the new invite connects — `retryInvite` missing
  - component: "Send to the host" calls `navigator.share({ text: code })` then shows the come-back step — button missing
  - component: "Send to the host" copies via `Clipboard` when `navigator.share` is absent, then shows the step — button missing
  - component: failed + `$failedWhileAway` shows the timed-out message — message missing
- Names the green step must provide:
  - `RoomBusiness.$joinState: Signal<'idle' | 'preparing' | 'waiting' | 'connected' | 'failed'>` and `RoomBusiness.$failedWhileAway: Signal<boolean>` (true when `document.visibilityState === 'hidden'` at the moment of failure; reset on a new join/leave). `failed` must survive the internal `leave()` that follows a rejected `joined` (do not reset it to `idle`); `leave()` called by the user resets to `idle`.
  - `WakeLockService` at `src/app/core/services/wake-lock.service.ts`: `request(): Promise<void>`, `release(): void`. RoomBusiness requests it when `waiting` starts and releases on connected, failed and leave.
  - `PendingInvite.state: 'waiting' | 'connecting' | 'failed'`, set to `connecting` synchronously when `accept()` starts, `failed` (invite kept) when it fails (`accept` may still reject or resolve: tests tolerate both). `RoomBusiness.retryInvite(inviteId): Promise<PendingInvite>` replaces the invite with a fresh one (same `forPlayer`).
  - Component reads `$joinState`, `$failedWhileAway`, `join`, `qrCode`, `describeError` from `RoomBusiness`; "Send to the host" button is always shown (share when available, else copy), and the code textarea stays on screen.
- English wording (`public/i18n/en.json`): button "Send to the host" (`room.join.send`); come-back step "Come back to this page: you'll be connected as soon as the host pastes your code." (`room.join.comeBack`); failed-while-away "The connection timed out while you were away. Ask the host for a new link." (`room.join.failedAway`). Host side (not tested in components): "Connecting…", "Couldn't connect: send a new invite" (`room.invite.*`).
- Fake transport limits: it has no way to fail a connection at the ICE stage (`connected` never rejects). The player-side failure is simulated through a refused hello (a second device claiming a connected player's seat, rejected after accept); the host-side failure through `accept` with a wrong answer code (`TransportError('unknown-invite')`). No hook needed.
- Baseline note: the vacuous "visible failure shows no timeout message" test was dropped (it passed before implementation).

## Green

- Files: `src/app/core/services/wake-lock.service.ts` (new), `src/app/modules/room/business/room.business.ts`, `src/app/modules/room/pages/join-page/join-page.component.ts`, `src/app/modules/room/components/invite-card/invite-card.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: `RoomBusiness` gains `$joinState`, `$failedWhileAway`, `PendingInvite.state` and `retryInvite`; the wake lock is held while waiting and released on connected, failed and leave. `WakeLockService` wraps `navigator.wakeLock` (no-op if unsupported, errors swallowed, re-requested on visible). Join page has "Send to the host" (share, else copy), the come-back step, a "still waiting" status after returning, and the failed-while-away message. Invite card shows "Connecting…" and the failed message with a "New invite" button. EN and FR strings added.
- Suite: 45 files, 246 tests, all passing (baseline 43 files, 235 tests; the 11 red tests are green). `tsc -p tsconfig.spec.json` clean, `ng build` has no error, no test file in the unstaged diff.
- Open questions: none. The "still waiting" status is shown after the player returns to the page; a returned-while-connected case navigates to `/room` as before.

## Review

- Verdict: ship
- Must fix: none (suite 45 files / 246 tests green; spec matches the ticket's seams; no secrets or invite-code leaks; EN and FR keys added together)
- Consider:
  - wake-lock.service.ts `request`/`acquire` — `release()` during an in-flight `acquire()` leaves `sentinel` set after release (lock leaked until page hides) — re-check `held` after the await and release the sentinel if false. Also no spec covers the service (wake-lock calls are only stubbed).
  - join-page.component.ts `send()` — any `navigator.share` rejection is treated as "cancelled", so a NotAllowed/real failure gives no copy fallback — fall back to `copy()` unless `error.name === 'AbortError'`.
  - join-page.component.ts constructor — the "Follow the fragment…" comment now sits above the visibilitychange subscription instead of the `route.fragment` one — move it back.
  - invite-card.component.ts `retry()` — no error handling if `retryInvite` rejects — mirror `accept()`'s `error` handling.
  - room.business.ts `accept()` — "failed" only marks a rejected accept; an ICE failure after a resolved paste is not surfaced (needs the real-device measurement of the ticket).
  - Prettier reports style issues in 5 changed files (join-page, room.business, invite-card, both specs) and wake-lock.service.ts breaks its own `if` over two lines — run prettier on the touched files (some warnings may predate this change).
  - Ticket stays open: device measurements are still to be recorded.

- 2026-11-07, built (commit "feat(room): phone-friendly join"): join state on `RoomBusiness` (`$joinState`, `$failedWhileAway`), invite states with `retryInvite` (new invite created before the failed one is dropped), `WakeLockService`, "Send to the host" (Web Share, copy fallback; only `AbortError` counts as cancelled), come-back step, "still waiting" after returning, failed-while-away message, "Connecting…" / failed + "New invite" on the host card. Review: ship; three Consider points fixed. Browser check (desktop pane, two tabs): invite → join page → Send (copy fallback, come-back step) → host paste → refused duplicate seat shown to the player; layout fits at 375 px. Suite 246 passing.
- **Still open:** device measurements on Android Chrome and iOS Safari (user), then adjust wording/timings and resolve. Not covered: an ICE failure after a successful paste is only surfaced if the transport's `acceptAnswer` rejects (it does on `failed`), and it can't be reproduced without real devices.

## Answer

Built as described in the comments above (commit ca340f0). The device measurements are dropped: ticket 14 (signalling mailbox) takes the code and its time limit out of the normal path, and this ticket's flow stays as the fallback when the mailbox can't be reached. Its join and invite states, wake lock and "Send to the host" are reused by ticket 14.
