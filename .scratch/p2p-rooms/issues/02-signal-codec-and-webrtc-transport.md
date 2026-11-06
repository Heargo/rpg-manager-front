# Signal codec and WebRTC transport

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Signalling: manual handshake, Layers).

- `core/p2p/helpers/signal-codec.ts`: `encode(desc: RTCSessionDescriptionInit) → string` and `decode(code, expectedType) → RTCSessionDescriptionInit`; deflate-raw (`CompressionStream`) + base64url, `1.` version prefix; errors for bad version, wrong type, corrupt paste. Pure, unit-tested.
- `RoomTransport` interface: `createInvite()`, `acceptAnswer(id, code)`, `cancelInvite(id)`, `answerInvite(offerCode)`, `send`, `broadcast`, message and peer join/leave events, `close()`.
- `core/p2p/webrtc-transport.ts`: one `RTCPeerConnection` + ordered reliable data channel per player; non-trickle ICE (wait for `iceGatheringState === 'complete'`, with a timeout); STUN `stun:stun.l.google.com:19302` unless disabled.
- `core/p2p/fake-transport.ts` (in-memory) for `PeerApi` and service tests.
- Log the real code lengths in the ticket's Comments.

Done when: codec tests pass, and two browser tabs connect by pasting the offer then the answer code, and exchange a message.
