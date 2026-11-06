# Invite, join and lobby pages

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `../spec.md` (The handshake, Rooms).

- Host lobby: "Invite a player" creates a pending invite card with the invite link `/join#<offer-code>`, Copy, Share (Web Share API when available), QR code (`qrcode`), a "Paste answer code" field and Cancel. Several pending invites at once. Connected players and offline seats listed.
- `/join` page: reads the offer from the URL fragment, shows the answer code with a large Copy button, Share and a QR code, then "Waiting for the host…" until the channel opens, then the room.
- Client lobby: host, other players, status. Leave for both roles.

Done when: a host on one device and a player on another join through link + pasted answer, and through QR display.
- Delete the temporary dev-only lab `src/app/modules/dev/p2p-lab/` and its `dev/p2p` route (added in ticket 02).
