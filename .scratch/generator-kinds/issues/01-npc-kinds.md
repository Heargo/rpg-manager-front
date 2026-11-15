# NPC generator on kinds

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1–5, "NPCs", "Generic code first").

- Generic first: the domain-free parts of `item-vocabulary.ts` (nearest-level lookup, words that add up along the chain, drawable kinds) become a shared helper; `buildItemVocabulary` uses it with no behaviour change.
- Manifest: `domains.npcs.kinds` with an `NPC_KIND_SCHEMA` (`roles` required on a root, non-empty subset of `NPC_ROLES`, a child may override; `person` boolean on a root only).
- Language file `generators/npcs.json` version 2 (top-level `given`, `epithets`, `templates`; per kind `nouns`, `descriptions`, `adjectives`, `names`), validated with readable errors (`listChecker('npcs')`); phrases checked like items.
- `NpcVocabulary` pooled from the world's active packs (texts of the world language only) through a business like `ItemVocabularyBusiness`.
- `generateNpc` draws a kind, takes its roles, names a person (given name, epithet, kind noun matching the gender) or a creature (kind noun + adjective via the kind `names`), description through `expandPhrase` with params and gender. `Npc.kind?` kept on save, export and room.
- The Pack select goes away from the NPC editor; `NpcNamesBusiness` and `npc-name-list.ts` v1 go away.
- Base FR and EN: manifests declare the NPC kinds of the spec (identical), `npcs.json` v2 with the current names and epithets moved, kind nouns, descriptions with params.
- Same seed and same active packs → same NPC.
