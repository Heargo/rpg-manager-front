# Join with the host's link only (signalling mailbox)

Status: ready-for-agent
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

## Comments
