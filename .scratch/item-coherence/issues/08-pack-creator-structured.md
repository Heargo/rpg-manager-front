# Pack creator: structured kinds, tints and params

Status: ready-for-agent
Type: task
Blocked by: 01, 03

Spec: `../spec.md` (Decisions 4, 5, 11, 12, 13).

- Details: language optional ("Neutral: images, kinds and tints only").
- "Kinds" section: one row per kind (id with autocomplete from installed packs, parent, type for roots, slot), and for a language pack its nouns (text + gender), descriptions and name templates per rarity. A "preview" button draws 3 items of that kind with the draft plus the installed Base.
- "Tints" section: id (autocomplete), gradient editor (the colorizer's), and for a language pack its adjectives, suffixes and descriptions per rarity.
- "Params" section: name (autocomplete), list of phrases.
- "Templates" section (language pack): name templates per rarity, collapsed by default ("only needed for a Base").
- Sprites: a kinds multi-select (known kinds + the draft's) replaces type and slot.
- Validation errors and warnings (01, 02, 03) shown next to the field. An info line lists the draft's kinds with no sprite in the installed packs (not blocking).
- Sections are grouped by domain (Items for now, built so another domain adds its own section); Tints and Params are shared, outside the domains. NPCs, skills and classes keep today's JSON text areas until they move.
- Raw JSON stays under an "Advanced" panel (import/export of the word list).
- Optimus UI controls only (`p-*`), red theme.
