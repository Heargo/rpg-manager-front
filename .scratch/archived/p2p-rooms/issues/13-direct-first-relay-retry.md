# Direct first, relay invite on failure

Status: resolved
Type: task
Blocked by: 14

Decided 2026-11-07: try to connect without the TURN relay first, and only use Metered's Open Relay when the direct connection fails. **Updated after ticket 14:** with the mailbox, the retry loop already sends a new offer through the box, so the switch to the relay is silent: attempt 1 is STUN only, retries use TURN. With manual codes (fallback), it stays a "Try through the relay" invite as described below.

## Today

`WebRtcTransport` asks `fetchIceServers()` before every peer connection, so every invite includes TURN: a relay allocation is requested each time, and codes carry relay candidates (~7 bytes each). ICE already prefers direct paths, so the relay only carries data when direct fails (`docs/adr/0003-open-relay-turn.md`).

## Scope

- **First invite: STUN only.** No call to the ICE servers function, shorter codes, no relay allocation.
- **On failure** (connection `failed`, or not connected ~15 s after the host pasted the answer): the host's invite shows "Couldn't connect directly. Try through the relay" which makes a **relay invite** for the same seat: TURN servers from the function, and `iceTransportPolicy: 'relay'` so it doesn't retry the paths that just failed. The player opens that new link as usual.
- The relay invite is marked in the code (one flag bit or a version), so the player's side also asks the function for TURN servers before answering.
- The player's failure message (ticket 12) says the host can send a relay invite.
- **Optional, decide when building:** detect a symmetric NAT on the host while gathering (two STUN servers giving different public ports for the same socket) and make the first invite a relay invite directly, to skip a failed round. Keep only if it's reliable in tests.
- If the function is unreachable (`ng serve`, offline, quota used up), the relay button explains that the relay isn't available instead of making an invite that can't work.
- Update ADR 0003's consequences (relay no longer offered on every invite).

## Done when

- A first invite never calls the ICE servers function (unit test on the transport options) and its code has no relay candidate.
- A failed direct attempt offers the relay invite; a relay invite carries the flag, and both sides use TURN with relay-only policy (unit tests with a mocked `fetchIceServers`).
- Checked once on real networks: phone on mobile data ↔ computer on Wi-Fi connects through the relay invite when the direct one fails.

## Comments

## Baseline

48 files / 311 tests passing (2026-11-07).

## Seams

1. Signal codec (`signal-codec.ts`): a `relay` flag round-trips in the offer code (and a direct code has no relay candidate). Catches the code format; misses real SDP.
2. `WebRtcTransport` with a mocked `fetchIceServers` and a fake `RTCPeerConnection`: the first invite is STUN only and never calls the function; a relay invite, and the answer to a relay offer, use the function's TURN servers with `iceTransportPolicy: 'relay'`. Catches the transport options; misses real networks.
3. `RoomBusiness` over the fake peer network (with the in-memory mailbox): in mailbox mode the retry after a failed direct attempt is silently a relay invite; in manual mode a failed invite offers "Try through the relay"; when the function is unreachable, the relay is reported unavailable instead of making an invite. Catches orchestration; misses real HTTP.

Decided: symmetric NAT detection is skipped (not reliable to test; the silent mailbox retry makes the extra round cheap).

## Red

- Test files: `src/app/core/p2p/helpers/signal-codec.spec.ts` (4 new tests in "relay flag"), `src/app/core/p2p/webrtc-transport.spec.ts` (new, 7 tests), `src/app/modules/room/business/room-relay.business.spec.ts` (new, 6 tests)
- Run: `npx ng test --watch=false --include <file>` for each file
- Failing: 17 tests. Each file fails to compile (TS2339/TS2353/TS2554) on the symbols that don't exist yet, which is the red:
  - signal-codec "relay flag" (4) — `encodeSignal({ relay })` and `decodeSignal(...).relay` don't exist.
  - webrtc-transport (7): first invite STUN only and no function call; relay invite uses TURN and `iceTransportPolicy: 'relay'`; code flag on relay vs direct invite; relay invite refused with `TransportError('relay-unavailable')` when no TURN server; direct offer answered STUN only; relay offer answered with TURN and relay-only; answering a relay offer rejects when TURN is unavailable — `createInvite({ relay })` and the codec flag don't exist.
  - room-relay business (6): first invite direct; mailbox retry is silently a relay invite; connects through it; manual failure stays `failed` with no silent retry; "Try through the relay" via `retryInvite(id, { relay: true })` gives a `relay` invite on the same seat and box; relay unavailable rejects with `relay-unavailable` and keeps the failed invite — `PendingInvite.relay`, `retryInvite(id, options)` and `RoomService.createInvite(options)` don't exist.
- Interface the tests assume: `RoomTransport.createInvite(options?: { relay?: boolean })`, `TransportError` reason `'relay-unavailable'`, `PendingInvite.relay`, `RoomBusiness.retryInvite(id, { relay?: boolean })`, `RoomService.createInvite(options?)`. `WebRtcTransport` builds its configs from `fetchIceServers` (mocked via `vi.mock('./helpers/ice-servers')`) and treats a list without a `turn:` URL as unavailable. `FakeTransport` is untouched: the business tests spy on `RoomService.createInvite` to check the option.

## Green

- Files: `src/app/core/p2p/helpers/compact-sdp.ts`, `signal-codec.ts`, `room-transport.ts`, `peer-api.service.ts`, `webrtc-transport.ts`, `src/app/modules/room/services/room.service.ts`, `business/room.business.ts`, `helpers/room-errors.ts`, `components/invite-card/invite-card.component.ts`, `public/i18n/en.json`, `fr.json`, `docs/adr/0003-open-relay-turn.md`
- Change: relay flag (bit 3 of the compact flags byte) round-trips in offer codes. `WebRtcTransport` makes direct invites with STUN only (no function call) and relay invites, and answers to relay offers, with the function's TURN servers and `iceTransportPolicy: 'relay'`, rejecting `relay-unavailable` without a `turn:` URL. `RoomBusiness.retryInvite(id, { relay })` and `PendingInvite.relay`; the mailbox retry is silently a relay invite (falls back to a direct retry when the relay is unavailable). Invite card gets "Try through the relay" on failed direct invites plus the unavailable message; player failure messages mention the relay invite; EN/FR keys; ADR 0003 consequences updated.
- Suite: 321 tests pass in 49 files (baseline 311); tsc clean, build OK. 1 file fails to load: `webrtc-transport.spec.ts` (7 tests never run).
- Open questions: BLOCKER, `webrtc-transport.spec.ts` uses `vi.mock('./helpers/ice-servers', ...)`, which the Angular unit-test builder refuses for relative paths ("vi.mock ... not supported for relative imports ... use TestBed"). The red spec must change (e.g. inject a mock through `WebRtcTransportOptions`/`iceServers` instead of module mocking) or the runner config must allow it. Note the spec asserts the transport never calls `fetchIceServers` on a direct invite, so it needs the default fetcher to be mockable another way. The transport logic is written to that spec but unverified.

### Red update (transport spec rewritten)

`webrtc-transport.spec.ts` no longer uses `vi.mock` (the builder refuses relative mocks). It passes `iceServers: vi.fn()` into `new WebRtcTransport({...})` and asserts a direct invite never calls it. Same 7 behaviours. Run against the green transport: 7 pass.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `invite-card.component.ts`, `webrtc-transport.ts`: the diff is mostly Prettier reflow of lines the ticket didn't touch (template, styles, imports). Passes `prettier --check`, but it hides the real change; commit the reformat separately.
  - `room.business.ts` (~line 474): the relay-then-direct fallback chain is nested `.catch` calls; a small private `retryViaRelay(id)` helper would read better.
  - `webrtc-transport.ts` `newConnection`: `url.startsWith('turn')` also matches `turns:`, intended, but a one-line comment would help. The ticket's "invite has no relay candidate" is only covered indirectly (STUN-only config); the real-network check in "Done when" is still to be done by hand.
  - Player-side messages say "ask for a relay invite", but only the host UI offers "Try through the relay" in manual mode; fine.
- Checked: 328 tests / 50 files pass; spec items (flag round-trip, direct never calls the function, relay-only policy on both sides, silent mailbox retry, manual "Try through the relay", unavailable handling, ADR, EN/FR keys) are covered and implemented. No secrets or invite-code leakage changes.

## Answer

- Code: a `relay` flag (bit 3 of the compact flags byte) round-trips in offer codes. `WebRtcTransport.createInvite({ relay })`: a direct invite uses STUN only (`directServers`) and never calls the ICE servers function. A relay invite, and the answer to a relay offer, use the function's TURN servers with `iceTransportPolicy: 'relay'`, and reject with `TransportError('relay-unavailable')` when no `turn:`/`turns:` URL comes back.
- `RoomBusiness`: `PendingInvite.relay`, `retryInvite(id, { relay })`. In mailbox mode the retry after a failed direct attempt is silently a relay invite (same seat and box), and falls back to a direct retry when the relay is unavailable. In manual mode the invite card shows "Couldn't connect directly. Try through the relay", or "The relay isn't available right now" when the function can't be reached. The player's failure messages mention the relay invite. EN/FR keys; ADR 0003 consequences updated.
- Decided: no symmetric NAT detection (not reliable to test; the silent retry makes the extra round cheap).
- Tests: 17 new (codec 4, transport 7 with an injected fetcher, since the Angular runner refuses `vi.mock` on relative imports; room relay 6). Suite: 50 files, 328 passing (baseline 48 / 311). Build OK. Review: ship. Consider lines not acted on: Prettier reflow in `invite-card.component.ts` and `webrtc-transport.ts` mixed in; nested `.catch` chain in the relay retry could become a helper.
- Browser: the app loads with no console error under `ng serve`. The failed-invite and relay UI can't be reached in one browser (two tabs share one profile, and a failure needs a real broken network), so it stays covered by the business tests. **Not checked: the real-network test (phone on mobile data ↔ computer on Wi-Fi through the relay invite)**, to do on the next deploy.
