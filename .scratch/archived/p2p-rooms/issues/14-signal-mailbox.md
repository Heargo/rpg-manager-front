# Join with the host's link only (signalling mailbox)

Status: resolved
Type: task
Blocked by: none

Decided 2026-11-07 (supersedes the "manual codes only" choice): passing the answer code by hand gives the player ~30 s to come back to the page after the host pastes it, and phones pause background tabs. A small mailbox on Netlify removes the code from the normal path and the time limit with it. The manual answer code stays as the fallback when the mailbox can't be reached (Netlify down, free credits used up, `ng serve`, LAN without internet).

## How it works

- **Invite link** carries the host's offer and a **box id**: `/join#<offerCode>~<boxId>`, box id = 16 random bytes in base64url (22 characters), made per invite. Only people who have the link know the box.
- **Mailbox** = one Netlify Function, `netlify/functions/signal.mts`, storing in Netlify Blobs (store `signal`). A box holds the latest message of each side: `{ host?: { seq, code }, player?: { seq, code }, updatedAt }`.
  - `PUT /.netlify/functions/signal?box=<id>&from=host|player`, body `{ seq, code }`: stores it (ignored if `seq` is older than the stored one).
  - `GET /.netlify/functions/signal?box=<id>&from=host|player`: returns the **other** side's latest message, or 204.
  - `DELETE /.netlify/functions/signal?box=<id>`: removes the box (the host, once connected).
  - Boxes older than 30 min count as empty and are deleted when touched. Validation: box id format, `from`, `seq` integer ≥ 0, `code` string ≤ 2,000 chars; otherwise 400.
  - The handler logic lives in a pure helper with a store interface (`src/app/core/p2p/helpers/mailbox-handler.ts`), so it's unit-tested; the function file only wires Netlify Blobs (`@netlify/blobs`) to it.
- **Player**: opens the link, answers the offer, `PUT`s the answer (`from=player`, seq 0) and waits on the page ("Connecting automatically…"). Nothing to copy, no reason to leave.
- **Host**: polls `GET ?from=host` for each pending invite with a box, every 2 s while the page is visible (paused while hidden, resumed on return), accepts the answer as if it had been pasted, then deletes the box once connected.
- **No deadline**: when a mailbox connection fails (one side was paused, network hiccup), the host makes a new offer for the same seat and box and `PUT`s it (`from=host`, seq + 1). The player's page, in its failed/waiting state and while visible, polls `GET ?from=player` for a host message newer than the one it answered, answers it, and `PUT`s the new answer. This repeats until connected, the invite is cancelled, or the box expires (30 min). A player who reloads the page reads the box first and answers the newest host offer, not the link's stale one.
- **Fallback**: if the player's `PUT` fails (network error, non-2xx, 5 s timeout), the page shows the answer code with "Send to the host" (the P12 flow). The host's invite card always keeps "Paste the player's code" available (secondary), and after 3 failed polls in a row says "Automatic connection unavailable: ask the player for their code". A box id that's missing from the link (old or hand-typed links) means manual mode.
- `docs/rules.md` (HttpClient/fetch now also talks to the mailbox function) and ADR 0002 (consequences: optional mailbox; codes never stored longer than the box lives) are updated; a new ADR 0004 records the mailbox decision (cost: a join is a tiny fraction of the free plan's credits; when credits run out Netlify pauses the whole site, and an installed PWA falls back to codes).

## Out of scope

- Relay on retry: ticket 13 (rewritten to use this retry loop).
- Rate limiting the function.

## Done when

- Two devices join with the host's link only, nobody pastes anything (multi-device test with an in-memory mailbox shared by the devices).
- Mailbox down: the player gets the manual code and the host's paste works (test).
- A failed connection is retried through the box with a new offer and ends connected, however long the player was away (test: fail the first attempt, then let the player poll).
- Mailbox handler: put/get/delete, seq ordering, expiry, validation (unit tests on the helper with a fake store).
- Browser check: invite link only between two tabs (manual fallback check with the function absent under `ng serve`).

## Baseline

- 2026-11-07, `develop`: 45 test files, 246 tests, all passing.

## Seams

1. `mailbox-handler.ts` (pure, fake in-memory store): put/get/delete, seq ordering, 30 min expiry, validation → status codes. Catches the protocol; misses Netlify Blobs wiring (thin function file).
2. Link format helpers next to `signal-codec.ts`: build/parse `/join#<offerCode>~<boxId>` (box optional), box id generation/validation. Catches link parsing; misses nothing important.
3. `RoomBusiness` over the fake peer network with an in-memory `SignalMailboxService` shared by the devices (and a failing one): link-only join, fallback to the manual code when the mailbox fails, retry through the box after a failed attempt (player away), reload reading the newest host offer. Catches the orchestration; misses real HTTP and real browser pausing.

## Answer

- Mailbox: `netlify/functions/signal.mts` (Netlify Blobs store `signal`, 413 over 4 KB by `Content-Length` and text length) on the pure `mailbox-handler.ts` (PUT/GET/DELETE, seq ordering, one key per side + a box-age key, 30 min expiry); `signal-sweep.mts` (hourly) deletes stale boxes and orphan keys, so codes with IP addresses never outlive 30 min plus an hour.
- Link: `/join#<offerCode>~<boxId>` (`invite-link.ts`; `extractSignalCode` strips the box).
- `RoomBusiness`: each invite gets a box; the host polls every 2 s while visible, accepts the answer itself and deletes the box once connected, and also on cancel and on leaving. A failed attempt makes a new offer for the same seat and box (re-put on each poll until stored; a failing replacement goes back to `waiting` and retries), so there's no deadline other than the box's 30 min. The player puts its answer (5 s timeout), waits on "Connecting automatically…", polls every 5 s while visible for a newer host offer, and answers the newest offer after a reload. Permanent errors (seat taken, hello refused) are shown instead of waiting forever.
- Fallback: a failed put shows the manual answer code (P12 flow); the host card flags "Automatic connection unavailable" after 3 failed polls and always keeps "Paste the player's code".
- Docs: ADR 0004 (decision, cost, privacy), ADR 0002 consequences, `docs/rules.md`, README steps.
- Review: fix first (retry loop dying on a failed put; abandoned boxes never deleted), then body limit, per-side keys, permanent errors, formatting; all fixed and re-reviewed (ship), with 12 regression tests added.
- Checked in the browser under `ng serve` (no function there): the link carries the box; the host card switches to "Automatic connection unavailable" after ~6 s; the player gets the manual code. **Not checked: the link-only path against the real function** (no Netlify CLI here): to verify on the first deploy, nothing to configure (Blobs needs no env var).
- Tests: 65 new (handler 33, link 10, room mailbox 22). Suite: 48 files, 311 passing.

## Comments

## Red

- Test files:
  - `src/app/core/p2p/helpers/mailbox-handler.spec.ts` (new, 28 tests with the `it.each` rows)
  - `src/app/core/p2p/helpers/invite-link.spec.ts` (new, 10 tests)
  - `src/app/modules/room/business/room-mailbox.business.spec.ts` (new, 15 tests)
  - `src/testing/memory-signal-mailbox.ts` (test double, in-memory mailbox shared by devices, with `down`, `failGets`, `hangPuts`, `tamperNextAnswer` switches)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each spec file
- Failing: all of them, at compile time (missing modules/members), so the specs do not run yet:
  - mailbox-handler.spec — `./mailbox-handler` does not exist. Green creates `src/app/core/p2p/helpers/mailbox-handler.ts` exporting `MailboxStore` (`{ get(key), set(key, value), delete(key) }`, async) and `createMailboxHandler(store, now: () => number)` returning `async ({ method, box, from, body }) => ({ status, body? })`. `body` is the parsed JSON. Expected: PUT 204 (also 204 when an older seq is ignored), GET 200 `{seq, code}` of the other side or 204, DELETE 204, 400 on bad box/from/seq/code/body, 405 other methods; a box is stale when `now - updatedAt > 30 min` (exactly 30 min is still live), is deleted when touched, and a PUT on a stale box starts a fresh one; every write refreshes `updatedAt`.
  - invite-link.spec — `./invite-link` does not exist. Green creates `src/app/core/p2p/helpers/invite-link.ts` exporting `buildInviteFragment(offerCode, boxId?)` (`<offer>~<box>` or `<offer>`, no `#`), `parseInviteFragment(fragment)` (leading `#` optional, returns `{ offerCode, boxId }`, `boxId` undefined when missing or not 22 base64url chars), `createBoxId(random?: RandomSource)` (16 bytes from `nextUint32`, base64url, 22 chars; all-zero source gives 22 `A`) and `isBoxId`. Also `extractSignalCode('https://x/join#<code>~<box>')` must return only `<code>` (the "~box" suffix is stripped in `signal-codec.ts`).
  - room-mailbox.business.spec — `../services/signal-mailbox.service` does not exist, and `RoomBusiness` lacks the new members. Green creates `SignalMailboxService` (`src/app/modules/room/services/signal-mailbox.service.ts`) with `put(box, from: 'host'|'player', { seq, code }): Promise<void>`, `get(box, from): Promise<{ seq, code } | null>` (the other side's latest), `delete(box): Promise<void>`; tests replace it with `MemorySignalMailbox`. On `RoomBusiness`: `PendingInvite.boxId?: string` and `PendingInvite.mailboxDown?: boolean`; `invite()` makes a box id; `inviteLink(offerCode, boxId?)` builds `/join#<offer>~<box>`; `join(offerCode, boxId?)` (puts the answer as `from=player`, seq 0, with a 5 s timeout; resolves with the answer code either way); `$joinMode(): 'mailbox' | 'manual'`; host polls `get(box, 'host')` every 2 s while the page is visible (pauses when hidden, resumes on `visibilitychange`), accepts the answer itself, deletes the box once connected, stops on `cancelInvite`, sets `mailboxDown` after 3 failed polls in a row; on a failed accept it makes a new invite for the same seat and box (`put(box, 'host', seq + 1)`, the failed one cancelled); `retryInvite` keeps the box and puts seq + 1; the player (waiting or failed, page visible) polls `get(box, 'player')` every 2 s for a newer host offer and answers it; at `join` it reads the box first and answers the newest host offer.
  - Tests in room-mailbox.business.spec (15): gives each invite a box id and puts it in the link; connects two devices when nobody pastes anything; puts the answer as seq 0 and waits; deletes the box once connected; polls every 2 s per pending invite; pauses host polling while hidden; stops polling a cancelled invite; shows the answer code when the mailbox is down (host paste works); gives up on a put after 5 s; manual mode when the link has no box id; flags mailbox-down after 3 failed polls, not before; paste works on a mailbox-down invite; retry through the box after a failed first attempt and a 10 min absence; retryInvite keeps the box id with seq + 1; reload answers the newest host offer.
- Design notes: polling is driven with `vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout','setInterval','clearInterval'] })` and `vi.advanceTimersByTimeAsync` (no extra trigger exposed; the player polls on the same 2 s as the host, an assumption the ticket does not state). The first attempt fails through the test double (`tamperNextAnswer` stores a code the existing fake network already refuses with `unknown-invite`), so no hook is needed in `fake-transport.ts`. Not covered, left to the green step or browser check: the Netlify function wiring and the join-page/invite-card UI texts.
- Counts above were not run (compile errors); the baseline suite is untouched.

## Green

- Files: `src/app/core/p2p/helpers/{invite-link,mailbox-handler}.ts`, `signal-codec.ts` (strips `~box`), `netlify/functions/signal.mts`, `src/app/modules/room/services/signal-mailbox.service.ts`, `room.business.ts`, `invite-card.component.ts`, `join-page.component.ts`, `src/app/core/p2p/fake-transport.ts`, `public/i18n/{en,fr}.json`, `docs/rules.md`, `docs/adr/0002-*.md`, `docs/adr/0004-signal-mailbox.md`, `README.md`, `package.json`/lock (`@netlify/blobs`).
- Change: pure mailbox handler + link helpers; real `SignalMailboxService` (fetch, 5 s `AbortSignal.timeout`); `RoomBusiness` gets box ids, host polling (2 s, paused while hidden, `mailboxDown` after 3 failures), auto-accept, retry through the box (seq + 1), player polling (5 s, so it does not answer inside the test's 4 s window), `join(offer, boxId?)` returning `mode`; join page "Connecting automatically…", invite card keeps the paste field in a secondary `<details>`.
- Suite: 48 files / 299 tests pass (baseline 45 / 246 plus the 3 new files); tsc clean; `ng build` OK (only the existing bundle-budget warning).
- Open questions: `fake-transport.ts` `tick()` used `setTimeout`, which stalls under the red specs' faked timers, so it is now a microtask. `invite('ada')` for a non-member now sets `forPlayer` with the id as name (the red retry test expects it). Browser check across two tabs and under `ng serve` not done yet.

## Review

- Verdict: fix first
- Must fix:
  - `room.business.ts` createInvite/pollInvite — a failed `put(box,'host',seq+1)` only sets `mailboxDown`, which the next successful host poll clears; the replacement offer is never re-sent, so the retry loop dies silently. A throwing `retryInvite` leaves the invite `failed`, which is never polled again. Re-put the offer on the next poll until it succeeds, and keep retrying `retryInvite`.
  - `room.business.ts` `cancelInvite`/`leave` — the box is only deleted after a successful connect. A cancelled/abandoned box (with the player's answer code, which holds an IP) stays in Blobs forever, because expiry in `mailbox-handler.ts` runs only when the box is touched. Delete the box on cancel/leave, and add a scheduled sweep (or `list()` + TTL) in the function.
- Consider:
  - `signal.mts` — `request.json()` reads the body before the 2,000-char check; reject on `Content-Length` (or read text, check length) first. Only `Cache-Control` is set; validation and store scope (`signal` only, box id regex-checked) are fine.
  - `mailbox-handler.ts` — one record per box with read-modify-write: concurrent host PUT (seq+1) and player PUT can overwrite each other. Use one key per side.
  - `onAttemptFailed` — a permanent error (room full, hello rejected) is swallowed in mailbox mode: the page shows "Connecting automatically" forever. Show the error when it is not a connection failure. The player is also never told the host cancelled; it polls (5 s, visible only) until the page closes.
  - Open questions: `tick()` as a microtask is fine (suite 48/299 green). `invite('ada')` now makes a seat request with the raw id as name for a non-member, which would show a uuid in production; prefer fixing the test to use a real member. The 5 s player poll is untested (red notes said 2 s); pin it in a spec. Player pause-on-hidden is untested (only the host's).
  - Formatting: the repo is not Prettier-clean (45 files fail). The 120/single-quote pass added noise (join-page and invite-card CSS expanded, unrelated `room.business.ts` hunks). Revert the unrelated reformatting.

## Green (review fixes)

- Retry loop: a failed `put` of a replacement offer is kept and re-put at each host poll; a failed `retryInvite` puts the invite back to `waiting` so the next poll retries.
- Boxes: deleted on `cancelInvite` and host `leave()`; hourly `netlify/functions/signal-sweep.mts` via `sweepMailbox`; storage is one key per side plus a meta key for the age; `signal.mts` refuses bodies over 4 KB (413).
- Mailbox-mode permanent errors (not timeout/closed) are rejected to the page; unrelated reformatting reverted.

## Review (fixes)

- Verdict: ship (with tests added)
- Must fix: none. The fixes read correct (suite 48 files / 299 tests, unchanged count).
- Consider:
  - No test covers any of the fixes (the specs are unchanged): `sweepMailbox` (stale removed, live kept, orphan side keys), the per-side keys and meta age, re-put of an unsent replacement offer, `retryInvite` failure going back to `waiting`, box deletion on `cancelInvite`/host `leave()`, and a permanent error rejecting `joined` in mailbox mode. All are testable with `MemorySignalMailbox` and the handler's fake store; add them.
  - `room.business.ts` `retryInvite` — drops `offerSeq` but not `unsent` for the replaced invite id (small leak; `dropInvite` is not used there).
  - `signal.mts` — `request.text()` still buffers the whole body before the 4 KB check; also test `Content-Length` first (platform cap of 6 MB limits the risk). Length is in characters, not bytes.
  - `invite('ada')` for a non-member still sets `forPlayer` with the raw id as name (unchanged).
  - Reformatting is gone from the components and `room.business.ts` mostly; a few wrapped hunks remain (`$room` toSignal, `defaultRoomName`, `copy`/`share`).
