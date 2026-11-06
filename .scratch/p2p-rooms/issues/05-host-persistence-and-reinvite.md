# Host persistence and re-invite

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `../spec.md` (Persistence).

Host saves state to IndexedDB after each handled request; reopening restores the room and its seats. Seats whose player is disconnected show "Re-invite", which creates an invite tied to that seat; the player's `hello { playerId }` restores their seat and character. Clients store joined rooms (ID, name, last snapshot) for a read-only offline view.
