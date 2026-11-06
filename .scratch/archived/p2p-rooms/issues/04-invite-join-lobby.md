# Invite, join and lobby pages

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (The handshake, Rooms).

- Host lobby: "Invite a player" creates a pending invite card with the invite link `/join#<offer-code>`, Copy, Share (Web Share API when available), QR code (`qrcode`), a "Paste answer code" field and Cancel. Several pending invites at once. Connected players and offline seats listed.
- `/join` page: reads the offer from the URL fragment, shows the answer code with a large Copy button, Share and a QR code, then "Waiting for the host…" until the channel opens, then the room.
- Client lobby: host, other players, status. Leave for both roles.

Done when: a host on one device and a player on another join through link + pasted answer, and through QR display.
- Delete the temporary dev-only lab `src/app/modules/dev/p2p-lab/` and its `dev/p2p` route (added in ticket 02).

## Answer

- `/room` (`room-page`): start view (host a room with a default "<name>'s table", or paste an invite link/code, which goes to `/join`), host lobby (members with kick, "Invite a player", one `invite-card` per pending invite), player lobby (members, status, host-offline and removed messages, leave).
- `invite-card`: link with Copy (CDK clipboard) and Share (Web Share API when present), QR toggle, the privacy note from ADR 0002, answer field, Connect, Cancel; errors shown in words.
- `/join` (`join-page`): reads the code from the URL fragment, makes the answer code, shows it with a large Copy, Share and a QR code, waits, then goes to `/room`.
- `member-list` component; `QrService` (`qrcode`, allowed as a CommonJS dependency); `room-errors.ts` maps codec/transport/API errors to translated messages (all keys in EN and FR, checked by a test).
- Menu: "Play / Jouer" → `/room`. Dev lab and its route deleted.
- Kicking now publishes the room without the player first and disconnects 300 ms later, so the player sees "The host removed you" (status `removed`) instead of "host offline".
- Checked in the browser (two tabs, two profiles): host a room, invite, open the link as the player, answer code + QR, paste on the host, both lobbies show both members online, kick shows the removed message, host QR. Not yet checked across two real devices or networks; and the QR is displayed but scanning is ticket 08.
- A dev-server reload drops the host's room (expected until ticket 05).
- Tests: 10 new (error mapping, kick → removed). Suite: 120 passing.
