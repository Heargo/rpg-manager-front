# Item generator draws a kind; the item keeps its kind and tint

Status: ready-for-agent
Type: task
Blocked by: 05

Spec: `../spec.md` (Decisions 2, 8, 10, Assumed: draw weights, description pool, name templates, item stores kind and tints).

- `generateItem` takes the pooled vocabulary: type (weights or GM), slot (among slots with a drawable kind, or GM), kind, noun, adjective/suffix (tinted or not), name from the kind's `names` or the language templates, description from the nearest level's pool plus the drawn tint's.
- Phrases go through the phrase engine (params from the pool, agreement with the noun's gender).
- `ItemDraft` and `Item` get optional `kind` and `tints` (the adjective's tint, then the suffix's, when they have one). They are saved, exported and sent over the room like the other fields.
- The Pack select next to the seed goes away from the item editor and the Tools item generator page; `packFor` and the item part of `PackChoiceBusiness` go away. NPC, skill and class editors keep theirs.
- Same seed and same active packs → same item.
