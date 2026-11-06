# Player copy and "Pick a save"

Status: needs-triage
Type: task
Blocked by: 03, 05

Spec: `../spec.md` (Player data: host copy and player copy).

- Player records carry `rev` and `updatedAt`; the host bumps `rev` on each change.
- Client stores its own player data per room (IndexedDB), updated from each `state`.
- `hello { playerId, rev, hash }`; on mismatch the client sends its copy, the player stays read-only, and the host gets a "Pick a save" `p-dialog`: both versions side by side, differing fields highlighted, queued offline actions listed; "Keep host version" / "Use player version". The pick becomes the next `rev`, is broadcast, and overwrites the client copy.

Done when: tests over `FakeTransport` cover equal hashes (no dialog), mismatch → host keeps own, mismatch → host takes player's.
