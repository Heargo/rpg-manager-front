# Signal codec and WebRTC transport

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Signalling: manual handshake, Layers).

- `core/p2p/helpers/signal-codec.ts`: `encode(desc: RTCSessionDescriptionInit) → string` and `decode(code, expectedType) → RTCSessionDescriptionInit`; deflate-raw (`CompressionStream`) + base64url, `1.` version prefix; errors for bad version, wrong type, corrupt paste. Pure, unit-tested.
- `RoomTransport` interface: `createInvite()`, `acceptAnswer(id, code)`, `cancelInvite(id)`, `answerInvite(offerCode)`, `send`, `broadcast`, message and peer join/leave events, `close()`.
- `core/p2p/webrtc-transport.ts`: one `RTCPeerConnection` + ordered reliable data channel per player; non-trickle ICE (wait for `iceGatheringState === 'complete'`, with a timeout); STUN `stun:stun.l.google.com:19302` unless disabled.
- `core/p2p/fake-transport.ts` (in-memory) for `PeerApi` and service tests.
- Log the real code lengths in the ticket's Comments.

Done when: codec tests pass, and two browser tabs connect by pasting the offer then the answer code, and exchange a message.

## Answer

- `core/p2p/helpers/signal-codec.ts`: `1.` + base64url(deflate-raw of `o|`/`a|` + SDP) via `CompressionStream`; decodes a bare code or a whole link, ignores whitespace; `SignalCodeError` with `empty`, `version`, `corrupt`, `wrong-type`.
- `core/p2p/room-transport.ts`: `RoomTransport` (invites, accept, answer, send, broadcast, disconnect, `messages$`, `peerJoined$`, `peerLeft$`, close), `HOST_PEER`, `TransportError`.
- `core/p2p/webrtc-transport.ts`: one RTCPeerConnection + ordered data channel per player, non-trickle ICE (waits for gathering, 4 s cap), Google STUN by default (`iceServers: []` for LAN only), 20 s connect timeout on the host, closes everything on `pagehide`.
- `core/p2p/fake-transport.ts`: in-memory network with the same handshake shape, for `PeerApi` and service tests.
- Temporary dev-only lab `/dev/p2p` (`modules/dev/p2p-lab`) to test two tabs or devices by hand; ticket 04 deletes it.

## Comments

- Measured in two Chrome tabs on one machine (IPv4 + IPv6): offer code 758–760 characters (4 candidates, SDP 989 characters), answer code 637, invite ready in 132–207 ms. Connected, messages both ways (UTF-8 fine), host sees a normal leave at once (`pagehide`), ~20 s after an abrupt close. Not yet tested across two devices or networks: try it with the lab (`npm start`, open `/dev/p2p` on both).
- Codes contain public IP addresses (srflx candidates); noted in ADR 0002 as a consequence for the invite UI.
- Fixed a flaky L03 test (ordering by `updatedAt` when two writes landed in the same millisecond).
- Tests: 9 new (codec, fake network). Suite: 83 passing.
