# Packs ship fixed items, skills and classes

Status: needs-triage
Type: task
Blocked by: 04

User request 2026-11-15 (to do later, ticket only): a pack can hold a fixed list of items, classes and skills, present as such in the catalogues (not only generator words).

Today a pack only gives generator material (kinds, tints, texts, params, sprites). The world's starter items are generated (`starter-items.ts`) and the starter classes and skills are written in code (`starter-classes.ts`, EN/FR pairs).

## Questions to settle in triage

- Format: `domains.items.content` (path to a JSON list in the pack's language) or a separate `content` block in the manifest? Neutral packs can't have any (texts have a language).
- How it reaches a world: imported once into the catalogue (a copy the GM can edit), or read live from the active packs (read-only, updated with the pack)? An "Import from the pack" action in each catalogue?
- Ids and updates: what happens to a world's copy when the pack's version changes; duplicates when two packs give the same entry.
- Attributes: items and skills name attributes (`Force`, `Vie`) the world may not have. Map by attribute id, skip unknown modifiers, or let the pack declare which attributes it expects?
- Classes reference skills by id: the pack's classes must point to the pack's skills, imported together.
- Should Base ship today's starter classes and skills this way, replacing `starter-classes.ts`?
- Pack creator: editing those lists (reuse the item, skill and class editors?).
