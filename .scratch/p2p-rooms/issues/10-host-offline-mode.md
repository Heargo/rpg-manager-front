# Host offline mode

Status: ready-for-agent
Type: task
Blocked by: 09

Spec: `../spec.md` (Host offline).

- Host-offline icon with tooltip in the nav bar and on the table when the host's channel closes.
- Room setting `offlineFeatures` (dice, notes, spend stat points, equip/unequip, use consumables, sell) edited by the host with `p-toggleswitch`es on room create/edit; defaults per the spec table; part of the room state.
- Offline, allowed actions apply to the local copy through the same reducer the host uses and are queued; disallowed ones are disabled with a tooltip.
- On reconnect, the mismatch flows into "Pick a save" (ticket 09) with the queue attached.
