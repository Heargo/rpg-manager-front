# 0004 — Signalling mailbox

Status: accepted
Date: 2026-11-07

## Context

The manual handshake (`0002-manual-webrtc-signalling.md`) makes the player send an answer code back and the host paste it within about 30 s. On phones the player has to leave the page to send the code, and the browser pauses the page in the background, so the connection often timed out. Passing the code by hand also costs the host a step per player.

## Decision

A small mailbox on Netlify: one Function (`netlify/functions/signal.mts`) storing messages in Netlify Blobs (store `signal`). The invite link becomes `/join#<offer>~<box id>`, the box id being 16 random bytes in base64url, made per invite. A box holds the latest message of each side (`host`, `player`, each with a `seq`). The player puts its answer in the box, the host polls it every 2 s while its page is visible and accepts the answer as if it had been pasted. When a connection fails, the host puts a new offer (seq + 1) in the same box and the player's page, polling while it is visible, answers it: no deadline. Boxes count as empty after 30 min and the host deletes its box once the player is connected. The logic is a pure helper (`core/p2p/helpers/mailbox-handler.ts`) tested with a fake store; the function file only wires Blobs to it.

The manual codes stay as the fallback: a missing box id in the link, a failed or timed-out (5 s) put, or three failed host polls in a row show the code flow again.

## Consequences

- A join takes the link only; nobody pastes anything in the normal case, and there is no 30 s limit.
- The app now has an optional server dependency. Without it (`ng serve`, a LAN without internet, Netlify down) everything works as before through the codes.
- **Cost**: a join is a handful of tiny function calls, a tiny fraction of the Netlify free plan's credits. When the credits run out Netlify pauses the whole site, not only the function; an installed PWA then keeps working from its cache and falls back to the codes.
- **Privacy**: the answer and offer codes contain IP addresses (see `0002`). They are stored for at most 30 minutes and deleted once the player is connected. The box id is only in the link's fragment (never sent to the app's host), and only people with the link know it. There is no rate limiting.
- The player polls less often (every 5 s) than the host, since it only looks for a replacement offer after a failed attempt.
