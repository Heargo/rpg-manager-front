# Direct first, relay invite on failure

Status: ready-for-agent
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
