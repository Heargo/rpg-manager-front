# Pack creator: NPC, skill and class kinds

Status: ready-for-agent
Type: task
Blocked by: 01, 02, 03

Spec: `../spec.md` (Decision 6).

- The pack creator gets structured sections for NPCs, Skills and Classes like Items: kinds (id, parent with autocompletion, the domain's fields: roles and person / type and effect / favoured skill kinds) and, for a pack with a language, the texts per kind (nouns, descriptions, adjectives, suffixes, names, collapsed) and the top-level lists (given names, epithets, templates…).
- Preview of a few draws per domain, like Items.
- Raw JSON import/export carries the new fields; the draft validates with the same checks as an installed pack.
