# Generators and sprites use the world's packs

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `../spec.md` (Decision 6, Assumed: no world, fallback).

- Word lists, sprites and the random item image come from the world's active packs. Without a world (sandbox, Tools pages), they come from the Base of the app language.
- The Pack select next to the seed offers "Random" and the active packs with content for this generator, with no filter on the app language.
- A generator with no word list in the active packs falls back to the Base of the app language.
- The Packs page loses its on/off toggle (moved here from PL03): install, add, create, duplicate and remove stay.
