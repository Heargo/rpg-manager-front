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

Manual handshake. The host makes one invite per player: a link `/join#<offer-code>` (also shown as a QR code). The player's app answers with an answer code they send back; the host pastes or scans it and the data channel opens. Codes carry only what the connection needs (ICE credentials, DTLS fingerprint, role, media id, UDP candidates) packed as binary and base64url, with a version prefix (`2.`); the other side rebuilds a standard data-channel SDP. Any SDP the compact form can't hold falls back to the whole SDP compressed with `CompressionStream('deflate-raw')` (`1.`), which is still decoded. One peer connection per player gives a star topology, so the host dispatches everything. Public STUN is used to find public addresses; it never sees game data.

## Consequences

- Zero infrastructure and no third party in the signalling path.
- Joining takes two copy/pastes (or two QR scans) instead of typing a room code.
- No automatic reconnection: after a host reload or a dropped connection, the host re-invites the seat. Seats and characters survive through `playerId`.
- Pending invites live in the host page's memory.
- Players on strict NATs can't connect without TURN, which is out of scope.
- The `RoomTransport` interface keeps the signalling swappable if this proves too clunky.
- **Codes contain the player's public IP address(es)**: the SDP lists every ICE candidate, including the public IPv4/IPv6 found through STUN. That's inherent to WebRTC (connected peers learn it anyway), but an invite link posted publicly exposes the host's address. The UI should say to share invites only with the players you're inviting.
- Measured in Chrome (2026-11-06, one machine with IPv4 + IPv6): full-SDP codes were ~760 characters (offer) and ~640 (answer), which made dense QR codes phones failed to scan. Compact codes (2026-11-07): offer 177 characters, answer 142, invite link ~205. TCP candidates are dropped (they need TURN to help). Checked Chrome ↔ Chrome; Firefox ↔ Chrome still to be tried on real devices.
- A player who leaves normally is seen as gone at once (connections closed on `pagehide`); after a crash or network loss it takes ~20 s (WebRTC's own timeout).
