# Pack fixed content reaches the catalogues

Status: ready-for-agent
Type: task
Blocked by: 05

Spec: `../spec.md` (Decisions 7–9).

- Activating a pack in the world rules imports its fixed items, skills and classes into the world's catalogues, using 05's import rules.
- Each catalogue (items, skills, classes) gets an "Import from the packs" action that re-runs the import for the active packs: untouched copies are updated, edited ones kept; a short notice says what was added, updated and kept.
- When the pack's content uses attributes the world doesn't have, a dialog (Optimus UI) asks the GM, for each one: map it to an existing attribute, add it to the world, or skip it. Cancel imports nothing.
- Imported entries are ordinary catalogue entries afterwards: saved, exported, sent over the room.
- Both languages, mobile width.
