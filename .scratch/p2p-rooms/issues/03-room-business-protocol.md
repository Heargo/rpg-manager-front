# Room business and wire protocol

Status: needs-triage
Type: task
Blocked by: 02, 07

Spec: `../spec.md` (Protocol).

- `room.business` / `host.business` with signals `$role`, `$roomCode`, `$peers`, `$state`, `$status`.
- Messages `hello`, `welcome`, `intent`, `state`, `reject`, `kicked`, versioned `v: 1`; `seq` gap → resync.
- Host validates and applies intents through a pluggable reducer (game rules plug in later).

Done when: tests over `FakeTransport` with one host and two clients cover join, intent accepted, intent rejected, gap resync.
