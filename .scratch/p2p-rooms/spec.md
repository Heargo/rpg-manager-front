# Spec: serverless rooms (peer-to-peer, host-dispatched)

Status: needs-triage
Date: 2026-11-06

## Goal

The app works with no backend of our own. One player opens a **room** and becomes its **host**; other players join through a **manual handshake**: the host sends an invite link (or shows a QR code), the player answers with a short code the host pastes back. No server of any kind is involved. Every message goes through the host: a client sends to the host, the host applies it to the room state and dispatches the result to the other clients in the same room. The app keeps working offline as a PWA; only the live room needs a network.

## Today

- The only backend use is auth and profile: `AuthService` (`GET /auth`, `POST /auth/login`, `POST /auth/register`), `UsersService` (`GET /user/profile`), the `tokenInterceptor`, and the auth guards. Everything else is a starter (home page, "Games" menu entry with no target).
- `@supabase/supabase-js` is installed but never imported.

So "without backend" mostly means removing accounts and adding the room layer from scratch.

## Signalling: manual handshake (decided)

Browsers talk peer-to-peer over WebRTC, and two browsers must swap a connection offer and answer (signalling) before they can talk. We do it **by hand, through whatever channel the players already use** (chat app, QR code at the table), so there is no signalling server at all. See `docs/adr/0002-manual-webrtc-signalling.md`.

Options that were considered: Trystero (public Nostr/MQTT/torrent relays) and PeerJS (free public broker). Both rejected: they depend on third-party infrastructure we don't control.

### The handshake, one per player

Each player gets their own `RTCPeerConnection` with the host, so the topology is a **star** and the host naturally dispatches everything.

1. **Host: invite.** In the lobby the host clicks "Invite a player". The app creates a peer connection and a data channel, makes an **offer**, waits for ICE gathering to finish (no trickle ICE: every candidate must be in the one message), and encodes it. It shows:
   - an **invite link** `https://<app>/join#<offer-code>` with Copy and Share (Web Share API) buttons. The code sits after `#`, so the static host never receives it;
   - the same link as a **QR code**, for players at the table.
   The invite stays pending, with its own status, until it is answered or cancelled.
2. **Player: answer.** Opening the link (or scanning the QR) lands on `/join`, which reads the offer, creates the **answer**, encodes it, and shows an **answer code** with a big Copy button, Share, and a QR code. The player sends it back to the host by the same chat, or shows the QR.
3. **Host: accept.** The host pastes the answer code into that pending invite (or scans the player's QR with the camera). The data channel opens, the player sends `hello`, and the host sends `welcome`.

The host can have several invites pending at once, one per player. Each pending invite lives in the host page's memory, so it dies if the host reloads; the UI says so.

### Encoding the codes

- v2 (current): only what WebRTC needs (ICE ufrag/password, DTLS fingerprint, setup role, media id, UDP candidates) in a compact binary form, base64url, prefix `2.`; ~140–180 characters (`core/p2p/helpers/compact-sdp.ts`). The receiver rebuilds a data-channel SDP.
- v1 (fallback, still decoded): the full SDP compressed with `CompressionStream('deflate-raw')`, prefix `1.`; ~650–800 characters. Too dense for reliable QR scanning, which is why v2 exists.
- Decoding validates the version and the SDP type (`offer` on `/join`, `answer` on the host), and shows a clear error for a bad paste.

### Reaching each other

- Same network (players around one table, same Wi-Fi): works with no other help.
- Different networks: needs the players' public addresses, found by asking a **STUN** server (Google's public `stun:stun.l.google.com:19302`). STUN is a stateless echo, not a backend: it sees an IP, never game data. Default on; a setting can turn it off for LAN-only play.
- Strict NATs (some mobile carriers, corporate Wi-Fi) need a TURN relay, which is a server. Out of scope; the UI shows "couldn't connect, try the same Wi-Fi" after a timeout.

### Libraries

- `qrcode` (MIT, 1.5.4): draw invite and answer QR codes.
- Scanning: the browser's `BarcodeDetector` where it exists (Chrome on Android/macOS), otherwise `jsqr` (Apache-2.0, 1.4.0) on camera frames. Pasting always works, so scanning is a convenience.

## Design

### Layers (follows `docs/rules.md`: Layering, Peer-to-peer services)

Component → business (game logic) → service (wrapper exposing API-like calls over peer-to-peer). Stateless plumbing lives in helpers.

```
core/p2p/
  peer-api.service.ts          PeerApi: the HttpClient of this app. Owns the RoomTransport, role, pending requests,
                               subscriptions. request(route, payload) → Promise, watch(topic) → Observable,
                               serve(route, handler) and publish(topic, data) on the host. In-process on the host.
  room-transport.ts            interface: createInvite() → {id, offerCode}, acceptAnswer(id, answerCode), cancelInvite(id),
                               answerInvite(offerCode) → answerCode, send(peer, msg), broadcast(msg),
                               onMessage, onPeerJoin/Leave, close()
  webrtc-transport.ts          the only file touching RTCPeerConnection
  fake-transport.ts            in-memory hub for tests
  helpers/
    signal-codec.ts            encode/decode offer and answer codes
    envelope.ts                build/parse { v, id, kind: request|response|error|publish, route, payload, seq }
    correlation.ts             createRequestTracker(): match responses to requests, timeouts
    routes.ts                  route/topic naming and matching
    peer-api-error.ts          PeerApiError { code, message } + mapping from wire errors
modules/room/
  pages/                       invite/join/lobby
  business/
    room.business.ts           signals: $role, $peers, $status, $pendingInvites; invite/accept/leave
    room-host.business.ts      host: registers room/* handlers (hello, kick), seq, persistence
  services/
    room.service.ts            hello(), leave(), watchRoom(); serveHello(), publishRoom()… (routes room/*)
    qr.service.ts              generate and scan QR codes
  models/
    room-state.ts, room-api.ts request/response types
modules/<feature>/             same pattern per game feature (character, item, table, dice…)
```

### Protocol

All wire messages are envelopes `{ v: 1, id, kind, route, payload }`:

- `request` (client → host) → `response` or `error { code, message }` with the same `id`. This is what `service.foo()` returns as a `Promise`.
- `publish { topic, seq, payload }` (host → clients): pushed state, what `service.watchFoo()` returns as an `Observable`. Every publish is the topic's **full** state, so a missed one is harmless: clients drop anything with a `seq` not above the last one they applied, and a player who joins gets every topic's latest state at once. A resync message would only be needed with partial updates (patches), which aren't used (decided in ticket 03).
- Session routes on `room/*`: `room/hello { playerId, name, rev, hash }` → `{ you, snapshot }`, `room/leave`, `room/kicked` (publish).
- The host is the **single source of truth**: clients never change shared state locally (except the host-offline features); they call a service, the host's handler validates and applies the rules, then publishes.
- The host is also a player: its UI calls the same services, which run the handlers in-process.

### Identity

No accounts (decided). On first launch the app creates a local profile `{ playerId: uuid, name }` in `localStorage`; the profile page edits it. Login/register pages, `AuthService`, `UsersService`, the token interceptor and the auth guards go away.

### Player data: host copy and player copy (decided)

- The **host** saves everything, including each player's data (character, inventory, money, notes the player shares).
- Each **player** keeps a copy of their own data for every room they joined, updated from every `state` the host sends.
- Every player record carries `rev` (incremented by the host on each change) and `updatedAt`.
- On `hello`, the player sends `{ playerId, rev, hash }` of their copy. Same hash: nothing to do. Different: the player sends their full copy and the host sees a **"Pick a save"** dialog for that player: the two versions side by side with differing fields highlighted (`p-dialog` + `p-table`), and buttons "Keep host version" / "Use player version". Until the host picks, that player is in the room read-only.
- The chosen version becomes the next `rev` and is broadcast; the player's copy is overwritten with it.
- Differences come from a host restore, a lost host save, or actions the player made while the host was offline (see Host offline).

### Rooms

- There is no room code to look up anywhere: a room is the host's open page plus its peer connections. The room still gets a display name and an ID (stored in the state, used for rejoin).
- Lobby (host): connected players, pending invites (with copy/QR/cancel and a "paste answer" field each), offline seats.
- Lobby (client): host name, other players (as the host reports them), connection status.
- Leaving: a client leaving is a `peer-leave`; the host keeps its seat in the state, marked offline, so it can rejoin with the same `playerId`.

### Room size (decided)

No hard limit. The host's lobby shows a recommended maximum and a non-blocking `p-message` warning when the room goes over it:

- Before play, an estimate from the host's setup: device memory and CPU cores (`navigator.deviceMemory`, `hardwareConcurrency`), connection type and downlink (`navigator.connection`, Chrome only; unknown elsewhere), and whether the host is on mobile. Start from ~8 and scale down for weak or mobile setups, up for strong ones; tune with real tests.
- During play, the real signal: per-player round-trip time (`ping`) and data channel `bufferedAmount`. If they degrade, the warning says "the host's connection is struggling" whatever the count.

### Persistence

The host saves the room state to IndexedDB after every handled request. Reopening the app as host restores the room and its seats. Clients keep their profile and the rooms they joined (ID, name, last snapshot).

Connections don't survive a reload: there is no server to reconnect through. After a host reload, every player rejoins with a fresh handshake. To keep that cheap, each offline seat in the host's lobby has a "Re-invite" button that makes a new invite for that seat; the player's `hello` carries their `playerId`, so they get their seat (and character) back.

### Host leaves

### Host offline (decided)

- Clients show a small **host-offline icon** (`pi-wifi` crossed out, with a `p-tooltip`: "Host offline: some features still work; ask the host for a new invite to reconnect") in the nav bar and on the table.
- Shared state is read-only, except the features the host allowed offline for this room.
- **Offline features are configured per room** by the host when creating or editing it (`p-toggleswitch` list):
  | Feature | Default | Offline behaviour |
  | --- | --- | --- |
  | View character sheet, inventory, items, last illustration | always on | from the local copy |
  | Dice roller | on | local rolls, not shared |
  | Personal notes | on | edited locally, sent on reconnect |
  | Spend stat points | off | applied to the local copy, queued |
  | Equip / unequip | off | applied to the local copy, queued |
  | Use consumables | off | applied to the local copy, queued |
  | Sell items | off | applied to the local copy, queued |
- Queued actions are kept as service requests (route + payload) in order. On reconnect the player's copy differs from the host's, which triggers the "Pick a save" dialog; the dialog also lists the queued actions, so the host can choose the player's version (accept them) or the host's (drop them).
- The room's offline settings are part of the room state, so players receive them while connected.
- Host migration (promote a client) stays out of scope: every player would have to re-handshake with the new host.

### PWA

The service worker keeps serving the app shell offline. Only joining/hosting needs a network; show a clear "offline: you can't open or join a room" state.

## Out of scope (v1)

- TURN relay for strict NATs.
- Automatic reconnection (impossible without a signalling server; re-invite is the answer).
- Client-to-client links: everything goes through the host.
- Host migration.
- Anti-cheat beyond "the host validates requests" (the host can cheat; it's a friends' table).
- The actual game rules: this spec builds the room layer; game features plug in as feature services with host handlers.

## Tickets

One file per ticket in `issues/` (01–11 below). Game features on top of rooms are in `.scratch/legacy-parity/` (the legacy GM becomes the host).


1. **Local profile replaces accounts**: remove auth/users services, interceptor, guards, login/register pages and `@supabase/supabase-js`; add the `localStorage` profile and its edit page.
2. **Signal codec + WebRTC transport**: `core/p2p/helpers/signal-codec.ts`, `RoomTransport` with invites, `core/p2p/webrtc-transport.ts`, `fake-transport.ts`.
3. **PeerApi + room service/business**: envelope, correlation and error helpers; `PeerApi` (request/watch/serve/publish, in-process on host); `room.service` + `room.business` + `room-host.business` (hello, leave, kick, rejoin); tested over the fake transport with one host and two clients.
4. **Invite, join and lobby pages**: host invite panel (link, share, QR, paste answer, cancel), `/join#…` page (answer code, copy, share, QR), lobby lists, leave.
5. **Host persistence and re-invite**: IndexedDB snapshot, restore on reopen, offline seats with "Re-invite", seat recovery by `playerId`.
6. **Offline and failure states**: offline banner, "host disconnected", connection timeout ("try the same Wi-Fi"), bad or expired code errors.
8. **QR scanning**: camera scan of invite and answer codes (`BarcodeDetector`, `jsqr` fallback).
9. **Player copy and "Pick a save"**: player-side copy per room, `rev`/hash on `hello`, host conflict dialog.
10. **Host offline mode**: offline icon, per-room offline feature settings, local application and queue of allowed actions.
11. **Room size warning**: setup-based recommended maximum, live RTT/buffer warning.
7. **Test runner**: wire up `npm test` (Vitest via `ng update @angular/cli --name migrate-karma-to-vitest`), needed before 2 and 3 can be done test-first.

## Open questions

1. ~~Signalling~~: decided, manual handshake (2026-11-06).
2. ~~Accounts~~: decided, removed; host copy + player copy with "Pick a save".
3. ~~Max players~~: decided, no limit, with a warning (see Room size).
4. ~~Host leaving~~: decided, offline icon + host-configured offline features.
