# PeerApi, room service and room business

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Layers, Protocol); rules: `docs/rules.md` (Layering, Peer-to-peer services).

- Helpers in `core/p2p/helpers/`: `envelope.ts`, `correlation.ts` (request tracker with timeouts), `routes.ts`, `peer-api-error.ts`. Pure, unit-tested.
- `core/p2p/peer-api.service.ts`: `request()` → Promise, `watch()` → Observable, `serve()` / `publish()` on the host, in-process when the caller is the host; `PeerApiError('host-offline' | 'timeout' | 'not-found' | 'rejected')`.
- `modules/room/services/room.service.ts`: `hello()`, `leave()`, `watchRoom()`, `serveHello()`, `publishRoom()`.
- `room.business.ts` (role, peers, status) and `room-host.business.ts` (hello/leave/kick handlers, `seq`, seats).

Done when: helper tests pass; `PeerApi` tests over the fake transport cover request/response, error, timeout, publish/watch with `seq` gap → resync, in-process host call; room tests cover one host and two clients joining, leaving and being kicked.

## Answer

- Helpers in `core/p2p/helpers/`: `envelope.ts` (request, response, error, publish; versioned, validated), `correlation.ts` (request tracker with timeouts), `routes.ts` (`<feature>/<action>`), `peer-api-error.ts` (`PeerApiError` codes: host-offline, timeout, not-found, forbidden, invalid, rejected, internal).
- `core/p2p/peer-api.service.ts`: session (`startHosting`, invites, `joinRoom`, `disconnect`, `leave`), `request()` (in-process on the host, `SELF_PEER` as caller), `serve()`, `publish()`, `watch()` (replays the latest value, switches to fresh streams per session so a previous room's state never shows), `$role`, `$peers`, `$hostOnline`, `peerJoined$`/`peerLeft$`. Transport from the `ROOM_TRANSPORT_FACTORY` token (WebRTC by default).
- Room: `models/room.ts`, `helpers/room.rules.ts` (create, join/rejoin by `playerId`, offline, remove, hello validation), `services/room.service.ts`, `business/room-host.business.ts` (answers `room/hello`, maps peers to seats, marks offline on leave, kick, refuses a second connection for an online seat), `business/room.business.ts` (status, room state, pending invites, host/invite/accept/cancel/kick, join → answer code → hello, leave).
- No resync message: every publish is a topic's full state, so stale ones are dropped by `seq` and late joiners get the latest state on connect. Spec updated.
- `src/testing/peer-network.ts`: several devices (injectors) on the fake network in one test.
- Tests: 27 new (protocol helpers, PeerApi over the fake network, room rules, host + two players: join, leave/rejoin, kick, host offline, cancelled invite, seat already taken, bad hello). Suite: 110 passing.
