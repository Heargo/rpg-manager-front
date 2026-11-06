# PeerApi, room service and room business

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Layers, Protocol); rules: `docs/rules.md` (Layering, Peer-to-peer services).

- Helpers in `core/p2p/helpers/`: `envelope.ts`, `correlation.ts` (request tracker with timeouts), `routes.ts`, `peer-api-error.ts`. Pure, unit-tested.
- `core/p2p/peer-api.service.ts`: `request()` → Promise, `watch()` → Observable, `serve()` / `publish()` on the host, in-process when the caller is the host; `PeerApiError('host-offline' | 'timeout' | 'not-found' | 'rejected')`.
- `modules/room/services/room.service.ts`: `hello()`, `leave()`, `watchRoom()`, `serveHello()`, `publishRoom()`.
- `room.business.ts` (role, peers, status) and `room-host.business.ts` (hello/leave/kick handlers, `seq`, seats).

Done when: helper tests pass; `PeerApi` tests over the fake transport cover request/response, error, timeout, publish/watch with `seq` gap → resync, in-process host call; room tests cover one host and two clients joining, leaving and being kicked.
