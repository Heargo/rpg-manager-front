# 0002 — Manual WebRTC signalling (invite link / answer code)

Status: accepted
Date: 2026-11-06

## Context

The app must run with no backend: one player hosts a room and dispatches state to the others over WebRTC. WebRTC peers still have to swap an offer and an answer before connecting. Options:

| Option | Depends on |
| --- | --- |
| Trystero | Public Nostr relays, MQTT brokers or BitTorrent trackers |
| PeerJS | PeerJS's free public broker (or a self-hosted one) |
| Manual handshake | Nothing: players pass codes through their own chat or a QR code |

## Decision

Manual handshake. The host makes one invite per player: a link `/join#<offer-code>` (also shown as a QR code). The player's app answers with an answer code they send back; the host pastes or scans it and the data channel opens. Codes are the SDP compressed with `CompressionStream('deflate-raw')` and base64url, with a version prefix. One peer connection per player gives a star topology, so the host dispatches everything. Public STUN is used to find public addresses; it never sees game data.

## Consequences

- Zero infrastructure and no third party in the signalling path.
- Joining takes two copy/pastes (or two QR scans) instead of typing a room code.
- No automatic reconnection: after a host reload or a dropped connection, the host re-invites the seat. Seats and characters survive through `playerId`.
- Pending invites live in the host page's memory.
- Players on strict NATs can't connect without TURN, which is out of scope.
- The `RoomTransport` interface keeps the signalling swappable if this proves too clunky.
