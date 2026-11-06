# Host persistence and re-invite

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (Persistence).

Host saves state to IndexedDB after each handled request; reopening restores the room and its seats. Seats whose player is disconnected show "Re-invite", which creates an invite tied to that seat; the player's `hello { playerId }` restores their seat and character. Clients store joined rooms (ID, name, last snapshot) for a read-only offline view.

## Answer

- IndexedDB v2 adds `hostedRoom` (one record) and `joinedRooms`; `RoomStorageService` reads and writes them.
- Host: every room change is published and saved; closing the room deletes the saved copy. At startup (app initializer, any page) `RoomBusiness` reopens the saved room if this profile hosts it: same id and seats, players offline (`resumeRoom`), host online, and a "Room reopened… use Re-invite" notice.
- Re-invite: offline seats show "Re-invite" in the host lobby; the invite card says "Re-invite <name>". The seat comes back through the player's `playerId` in `room/hello`, so any invite works; the label is for the host.
- Player: each room joined is saved (name, host, members, last seen) and listed on the start page as "Rooms you joined", with Forget. A read-only view of game data comes with the game features.
- Found while testing: two tabs with the same profile both reopened the room, and one then closed it (deleting the save). Fixed with a Web Locks host lock (`HostLockService`): only one tab per device hosts or reopens; a second tab gets "already hosting a room in another tab". Also fixed `/join` ignoring a second invite link opened on the same page (now follows the URL fragment).
- `qrcode` is now loaded on first use (dynamic import), so the room code that starts with the app doesn't pull it into the main bundle.
- Checked in the browser: host + Ada, host reload → Ada offline + notice, Re-invite Ada → same seat, no duplicate; second tab can't host; database upgraded to v2; Ada's joined rooms saved.
- Tests: 7 new (resume rules, host reload, re-invite to seat, closed room and other profile not reopened, joined rooms, lock refusal). Suite: 127 passing.
