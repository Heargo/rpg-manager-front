# Room size warning

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Room size).

Recommended maximum from the host's setup (`deviceMemory`, `hardwareConcurrency`, `navigator.connection` when available, mobile or not), shown in the lobby; non-blocking `p-message` warning when exceeded. Live warning from per-player ping RTT and data channel `bufferedAmount`. No hard limit. Heuristic in pure business code with unit tests.

## Baseline

`npm test`: 78 test files, 493 tests, all passed (2026-11-07, `develop` at 017f7bc).

## Seams

Confirmed with the user (2026-11-07):

1. **`room-size.rules.ts`** (pure): the recommended maximum from the host's setup, and whether the connection is struggling given recent ping times and buffered bytes. Catches the heuristics; misses real devices.
2. **Host business over the fake network:** the host pings each player and records round-trip times and `bufferedAmount`. It exposes the recommended maximum, an over-the-maximum flag and a struggling flag. Catches the ping protocol and wiring; misses real network numbers.
3. **Lobby component** (`TEST_PROVIDERS`): shows the recommended maximum, a non-blocking `p-message` when the room is over it, and "the host's connection is struggling" when struggling. Misses layout.

## Starting values (user, 2026-11-07; constants in the rules file, to tune with real tests)

- **Recommended maximum:**
  - start at 8; mobile halves it;
  - memory: 2 GB or less −3, 8 GB or more +4;
  - cores: 2 or fewer −2, 8 or more +2;
  - slow connection (`effectiveType` 2g/3g, or `downlink` under 1.5 Mbps): −3;
  - unknown values change nothing;
  - clamp to 2–16.
- **Struggling:** any player's median ping over their last 3 pings is above 400 ms, or more than 1 MB is buffered on any channel.
- **Ping:** every 5 s, only while hosting with players connected.

## Red

- Test files: `src/app/modules/room/helpers/room-size.rules.spec.ts`, `src/app/modules/room/business/room-size.business.spec.ts`, `src/app/modules/room/pages/room-page/room-page.component.spec.ts` (new `describe`, 3 tests)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (per file; each currently fails at build on the missing symbols below)
- Names the green must create:
  - `helpers/room-size.rules.ts`: `DeviceSetup { mobile: boolean; deviceMemory?; hardwareConcurrency?; effectiveType?; downlink? }`, `recommendedMax(setup)`, `isStruggling(pingsByPlayer: number[][], bufferedBytes: number[])`.
  - `core/services/device-setup.service.ts`: `DeviceSetupService.read(): DeviceSetup` (mocked in the business spec).
  - `business/room-size.business.ts`: `RoomSizeBusiness` with `$recommendedMax`, `$overMax` (online members incl. host > max), `$struggling`, `$pingTimes` (Record playerId -> rtt[]); started by `RoomBusiness.hostRoom`; pings every 5 s only with players connected.
  - `RoomService.ping(peer): Promise<void>` (host asks a player; RTT measured on the clock) and `RoomService.bufferedAmount(peer): number`.
  - Room page: `.room-size-max` (shows the max), `p-message.room-size-warning` (over max), `.room-size-struggling` ("... connection is struggling").
- Failing: 23 tests, each one line:
  - rules: recommendedMax starts at 8; halves on mobile; memory steps; core steps; slow connection; halving before adjustments; strong setup; floor at 2; isStruggling calm; median above 400 ms; not exactly 400 or single spike; only last 3 pings; more than 1 MB buffered — `room-size.rules` module missing (13 tests).
  - business: recommends a maximum from the host setup; over the maximum only above it; pings every 5 s and keeps RTTs; no ping with no player; struggles on median ping above 400; recovers when pings are fast; struggles on more than 1 MB buffered — `RoomSizeBusiness`, `DeviceSetupService`, `RoomService.ping`/`bufferedAmount` missing (7 tests).
  - page: shows the recommended maximum; warns only while over the maximum; says the connection is struggling — `RoomSizeBusiness` missing, no markup (3 tests).

## Green

- Files: `src/app/modules/room/helpers/room-size.rules.ts`, `src/app/core/services/device-setup.service.ts`, `src/app/modules/room/business/room-size.business.ts` (new); `room.business.ts`, `services/room.service.ts`, `models/room.ts`, `pages/room-page/room-page.component.{ts,html}`, `core/p2p/{peer-api.service,room-transport,fake-transport,webrtc-transport}.ts`, `public/i18n/{en,fr}.json`; one fix in `room-size.business.spec.ts` (below).
- Change: rules and `RoomSizeBusiness` as specified. Real ping: `PeerApi.requestPeer` (host asks a player, who answers `room/ping` through a handler `RoomBusiness` registers), timed with `performance.now()` in the business; `bufferedAmount` added to `RoomTransport` (WebRTC reads the channel, the fake returns 0). The timer runs only while players are connected (starts on `peerJoined$`, clears when the last one leaves) and `RoomBusiness.leave` calls `stop()`. `RoomBusiness` loads `RoomSizeBusiness` with a dynamic `import()` in `hostRoom`/restore, so it stays out of the initial bundle (only the lazy room page injects it). Lobby shows `.room-size-max`, a `p-message.room-size-warning` and `.room-size-struggling`; `room.size.*` keys in EN and FR.
- Spec fix (mechanism only, no assertion or RTT value touched): `fakeClock()` ran after `join()`, but the business's `setInterval` is created at join time on the real clock, so the fake clock never fired it (confirmed: 4 of 7 tests failed on the original ordering). I moved `fakeClock()` to the start of each test that uses it, and `join()` now ends with `vi.advanceTimersByTimeAsync(0)` instead of `flush()` when the timers are faked (`flush` waits on a `setTimeout` that would hang). The `slowPings` mock with `advanceTimersByTime` works as intended once the clock is faked from the start.
- Suite: 80 files, 516 tests, all pass (baseline 78 / 493). `tsc` clean. `ng build` has no error; initial bundle 986.21 kB (baseline 984.62 kB, +1.6 kB from the PeerApi/RoomService/RoomBusiness changes), budget not changed. Unstaged diff lists only the allowed `room-size.business.spec.ts` among tests.
- Open questions: `DeviceSetupService` (core) imports the `DeviceSetup` type from the room module's rules, as the tests place it there; type-only import.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - Spec fix (focus 1): the diff of `room-size.business.spec.ts` against the staged red version touches only `fakeClock()` placement and `join()`'s final wait. No assertion, RTT (500/50), threshold or count changed. The tests still fail on a bug such as an always-on interval, a ping that is not kept, or a median that is not computed. Gap: nothing asserts that pinging stops after the last player leaves, on `leave()`, or after restore (no double interval). Add a test for each. Nothing exercises `PeerApi.requestPeer` or the player's `room/ping` handler in isolation either, only through the business.
  - `core/p2p/peer-api.service.ts:~226` (focus 2): `onHostMessage` resolves or rejects any pending id from any player, without checking that the sender is the peer that was asked. Ids are `crypto.randomUUID()`, so a player cannot guess another's. Low risk, but recording the asked peer in the tracker would close it. Player side is safe: `onMessage` accepts only `from === HOST_PEER`, and the only handler a player registers is the trivial `room/ping`. A host-side `not-found` for unknown routes is returned as before.
  - Dropped player mid-ping: the request waits for the 4 s timeout (below the 5 s interval), is rejected and caught in `pingPeer`; no unhandled rejection. Sync throws (not hosting, `send` failing) are also inside the `try`. The `pinging` guard stops overlapping pings, and `Promise.all` over per-peer catches means a slow player never blocks the others. Nit: the timeout message in `correlation.ts` says "The host did not answer", which is wrong for a player ping.
  - `room.business.ts` `watchRoomSize` (focus 3, 4): `start()` calls `stop()` first, so restore plus `hostRoom` cannot double the interval. `$peers` updates before `peerJoined$` and `peerLeft$` emit, so `sync()` sees the right count. Races: (a) `leave()` while the `import()` is still pending leaves `this.size` unset, so the later `start()` runs after the room is closed (`tick` stops it within 5 s, but the wiring stays until then); (b) if the chunk fails to load (offline, uncached), `hostRoom` rejects after `host.open` already ran. Wrap the import in try/catch (the size warning is optional) and re-check the role after the await. The `{ stop(): void }` type could be `import type { RoomSizeBusiness }`.
  - `core/services/device-setup.service.ts:2` (focus 5): `core/` imports a type from `modules/room`. The import is type-only and the tests fix the location, but it inverts the dependency direction. Define `DeviceSetup` in `core/models/` and re-export it from `room-size.rules.ts` so the specs still work.
  - `room-size.business.ts`: formatting is wrapped differently from the module's other files (the `inject(...)` and import blocks). Run prettier.

## Green (review fixes)

- Files: `room.business.ts`, `core/p2p/peer-api.service.ts`, `core/p2p/helpers/correlation.ts`, `core/models/device-setup.ts` (new, `DeviceSetup` moved, re-exported from `room-size.rules.ts`), `core/services/device-setup.service.ts`, `room-size.business.ts` (prettier), specs `room-size.business.spec.ts` (+2 tests), `room-size-load.spec.ts` (new).
- Change: `watchRoomSize` catches a failed load/start (logs a warning), re-checks the role after the await, and uses `import type`. `PeerApi` remembers which peer each `requestPeer` went to and ignores answers from other peers. `tracker.start` takes a timeout message (default peer-neutral; player pings say "The player did not answer in time").
- Tests added: pinging stops after the last player leaves and when the host closes the room; `hostRoom` still resolves when the size warning cannot start. `vi.mock` of a relative module is unsupported by the Angular runner, so the failure is simulated by a throwing `DeviceSetupService` (same catch as a failed chunk import).
- Suite: 81 files, 519 tests pass; `tsc` clean; `ng build` no error, initial 986.49 kB, budget unchanged.

## Answer

Built:

- `room/helpers/room-size.rules.ts`: `recommendedMax(setup)`, with the starting values above (halving for mobile comes before the adjustments, then the result is clamped to 2–16), and `isStruggling(pings, buffered)` (median of the last 3 pings above 400 ms, or more than 1 MB buffered).
- `core/models/device-setup.ts` and `DeviceSetupService` read `deviceMemory`, `hardwareConcurrency`, `navigator.connection` and whether the device is mobile.
- `RoomSizeBusiness`, loaded lazily from `RoomBusiness` when hosting and on restore:
  - It pings each player every 5 s through the new `PeerApi.requestPeer` and the player's `room/ping` handler, timed with `performance.now()`, and reads `bufferedAmount` from the data channel.
  - It runs only while players are connected, and stops on the last leave, on leave and when the role changes.
  - A failed chunk load only logs, and hosting carries on.
  - A `requestPeer` answer is accepted only from the peer that was asked.
- Lobby: `.room-size-max`, a non-blocking `p-message` while over the maximum, and "the host's connection is struggling". FR and EN.

Checked:

- Suite: 81 files, 519 tests (baseline 78 / 493). Build OK, initial bundle 986.49 kB (+1.9 kB).
- The spec's fake-timer mechanism was fixed in green; no assertion or value changed.
- Browser:
  - The French lobby shows "14 people" on this machine (32 GB, 16 cores: 8 + 4 + 2).
  - In mobile emulation, in English, it shows 10 (8 halved to 4, + 4 + 2).
  - No warning while alone, no console error, no horizontal scroll.
- Not in the browser: the over-the-maximum warning and the struggling message, which need real players and are covered by the component and business specs.

Left as Consider: the values are starting points, to tune with real rooms.
