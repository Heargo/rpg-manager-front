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

## Carried from IC03 review (2026-11-14)

- **Plural nouns**: Base FR has plural nouns (Gants, Bottes, Jambières…) that get singular adjectives ("Bottes usée"). A noun gets an optional `plural: true`; an adjective may give `mp` / `fp` forms, otherwise the plural is the singular form plus `s` (no `s` added after `s` or `x`); `{g:…}` accepts four options `{g:m|f|mp|fp}` as well as two. Update the Base FR nouns and the irregular adjectives.
- With the interim adapter gone, kind-level descriptions (`key`, `potion`, `shield`) must only reach their own kind chain; check the Base wording once the draw is by kind.
