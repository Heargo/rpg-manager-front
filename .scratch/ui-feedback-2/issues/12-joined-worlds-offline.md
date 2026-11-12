# Players keep their joined worlds offline

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md`

- When a player joins a world, the app records it locally (IndexedDB): world id, world name, host name, invite, last seen; the player's character copy is the P09 copy.
- The Worlds page lists the GM's own worlds and the joined ones, each with a badge **GM** or **Player**.
- A joined world opens the character sheet read-only from the local copy when the host is offline, and offers Rejoin with the saved invite. Remove from the list is possible.
