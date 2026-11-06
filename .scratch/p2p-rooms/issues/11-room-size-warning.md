# Room size warning

Status: needs-triage
Type: task
Blocked by: 04

Spec: `../spec.md` (Room size).

Recommended maximum from the host's setup (`deviceMemory`, `hardwareConcurrency`, `navigator.connection` when available, mobile or not), shown in the lobby; non-blocking `p-message` warning when exceeded. Live warning from per-player ping RTT and data channel `bufferedAmount`. No hard limit. Heuristic in pure business code with unit tests.
