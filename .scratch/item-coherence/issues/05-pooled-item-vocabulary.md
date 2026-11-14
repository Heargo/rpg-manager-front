# Item vocabulary pooled from the active packs

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 04

Spec: `../spec.md` (Decisions 7, 13, Assumed: kind and tint conflicts, which kinds can be drawn).

A business that gives one merged item vocabulary for the world (replaces the one-pack `itemWords`).

The pooling is generic: a pooled kind tree per domain (inheritance, conflicts, lookups up the chain), pooled tints and pooled params are written once and parameterised by the domain schema of 01 / 03; items is the first domain to use them. NPCs, skills and classes will reuse them as is.


- Kinds and tints from every active pack (any language, neutral included); texts (kinds' nouns/descriptions/names, tints' words, adjectives, suffixes, params, templates) only from active packs in the world's language.
- Kind tree resolved across packs: `type`/`slot` inherited; conflicts settled Base first, then the world's pack order, and reported (a list the Packs/rules pages can show as a warning); kinds not reaching a typed root are dropped; cycles across packs broken and reported.
- Tints: every gradient of a tint id kept as variants.
- Lookups the generator and the image need: the chain of a kind, its nearest nouns/descriptions/names, the drawable kinds per type and slot, the kind for a noun (singular match, for hand-typed names).
- No world: the app language and its Base. A language with no active text pack falls back to the Base of that language.
- Cached per (active packs, language), invalidated when the world's packs or language change.
