# Joining from a phone: survive leaving the page

Status: ready-for-agent
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

## Comments
