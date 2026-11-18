# NPC, skill and class images from packs

Status: needs-triage
Type: task
Blocked by: 01

Spec: `../spec.md` (Asset types a pack can carry)

- Check what NPC sprites do today (the note says "should already be implemented"; only `items` sprites seem to be drawn in `pack.business.ts`).
- A pack's sprites with domain `npcs`, `skills` or `classes` are offered by the NPC, skill and class editors' Random button and image picker, matched by kind like items.
- The pack creator's Sprites tab lets the author pick the domain and kinds for each sprite.

To triage: which of the three the user wants first, and whether skills and classes have an image field yet.
