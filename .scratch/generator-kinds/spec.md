# NPC, skill and class generators on kinds (v2)

User request 2026-11-15: "passe le générateur de pnj à la version 2 (comme pour les objets), pareil pour classes et compétences". Second half of `archived/item-coherence` Decision 13: the three generators that still read a v1 list from one chosen pack move to the item system (kinds in the manifest, texts per kind in the language files, pooled across the world's active packs, phrase engine, no Pack select).

Dev project: no backward compatibility, the v1 lists `generators/npcs.json`, `skills.json`, `classes.json` are replaced outright (version 2), drafts and installed packs in the old format are dropped.

## Decisions (user request, shape assumed from the item system)

1. **Same machinery as items.** Each of `domains.npcs`, `domains.skills`, `domains.classes` gets `kinds` (a tree with `parent`, plus the domain's own fields, checked by a `KindSchema`) and `texts` (a version 2 language file with `kinds` per kind and top-level sections). Kinds, params and texts are pooled from the world's active packs with `poolDomain` / `poolParams`; texts only from packs in the world's language. Kind ids are scoped by domain.
2. **The Pack select next to the seed goes away** from the NPC, skill and class editors (and the Tools pages that have one). `PackChoiceBusiness`, `pack-choice.ts` and `packFor`-like code go away once no generator uses them.
3. **Phrases everywhere**: names, descriptions and name templates go through `expandPhrase` (variants, params from `common.json`, `{g:…}` agreement with the drawn noun or given name).
4. **The generated entity keeps its `kind`** (optional field on `Npc`, `Skill`, `CharacterClass` and their drafts), saved, exported and sent over the room like the other fields.
5. **No tints** for these domains: they have no image. Tints stay items only. *(assumed)*
6. **Pack creator**: structured Kinds sections for the three domains, like Items (IC08/IA02), raw JSON stays as advanced import/export.

7. **Fixed content (user, 2026-11-17).** A pack with a language can ship fixed items, skills and classes: `domains.items|skills|classes.content` is a path to a JSON list, like `texts`. Neutral packs have none.
8. **Imported copy.** Fixed content is copied into the world's catalogue (on pack activation, and through an "Import from the pack" action), where the GM edits it. Ids are `<packId>:<entryId>`; re-importing updates the untouched copies and leaves the GM's edited ones alone. A class brings the pack skills it references.
9. **Attributes.** A pack declares the attributes its content uses (`attributes`: id, name, default max and formula). When the world lacks one, the GM chooses for each: map it to an existing attribute, add it to the world, or skip it (its modifiers are dropped).
10. **Base ships the starter content.** Base FR/EN carry today's starter classes and skills as fixed content, and `starter-classes.ts` goes away.

## Per domain

### NPCs

- **Kind fields** (manifest): `roles?: ("story"|"merchant"|"enemy")[]`, non-empty; required on a root, a child may override it (nearest wins). `person?: boolean` on a root (default `true`): a person gets a given name, a creature is named from its kind's nouns. *(assumed)*
- **Texts** (`generators/npcs.json`, version 2): top level `given` (`{ text, gender }`), `epithets` (adjectives), `templates` (person name templates: `{given}`, `{epithet}`, `{noun}`); per kind `nouns` (the kind's title or creature name, `{ text, gender }`), `descriptions` (nearest level wins), `adjectives` (add up along the chain), `names` (the kind's own name templates, before the top-level ones; for a creature `{noun} {adjective}`). *(assumed)*
- **Draw**: kind (uniform among drawable kinds: a chain that reaches a root with roles, and for a creature at least one noun), roles from the kind (one of them drawn when several, as today one role), then for a person a given name and, when the template uses `{noun}`, a noun of the same gender if there is one; for a creature a noun. Gender for `{g:…}`: the given name's, else the noun's. Description from the nearest level that has some. Level, attributes, gear, money, XP and class stay as today. *(assumed)*
- **Base kinds** (FR and EN identical manifests): `townsfolk` (story) → `peasant`, `noble`, `scholar`, `priest`; `trader` (merchant) → `merchant`, `innkeeper`, `blacksmith`, `peddler`; `guard` (story, enemy); `outlaw` (enemy) → `bandit`, `cultist`, `mercenary`; `beast` (enemy, `person: false`) → `wolf`, `bear`, `giant-spider`, `boar`. *(assumed)*

### Skills

- **Kind fields**: `type` (`active`|`passive`) only on a root, required there; `effect?` (`damage`|`heal`|`modify`) on an active chain only, nearest wins. *(assumed)*
- **Texts** (`generators/skills.json`, version 2): top level `templates` (`{noun}`, `{adjective}`, `{suffix}`), `adjectives`, `suffixes`; per kind `nouns`, `descriptions` (nearest wins), `adjectives`, `suffixes` (add up along the chain), `names` (before the top-level templates). No rarity split (as today). *(assumed)*
- **Draw**: rarity as today; kind uniform among drawable kinds (typed root and at least one noun); type from the kind, effect from the kind or drawn as today; the rest of the numbers as today. *(assumed)*
- **Base kinds**: `attack` (active, damage) → `strike`, `shot`, `fire-spell`, `frost-spell`, `lightning-spell`, `shadow-spell`; `healing` (active, heal) → `prayer`, `remedy`; `support` (active, modify) → `blessing`, `curse`, `war-cry`, `song`; `trait` (passive) → `toughness`, `focus`, `agility`, `presence`. *(assumed)*

### Classes

- **Kind fields**: `skills?: string[]` (skill kind ids the class favours), nearest level that has some wins. *(assumed)*
- **Texts** (`generators/classes.json`, version 2): top level `templates`, `adjectives`, `suffixes`; per kind `nouns`, `descriptions`, `adjectives`, `suffixes`, `names`, same rules as skills. *(assumed)*
- **Draw**: kind uniform among drawable kinds (at least one noun); the tree is built from the world skills whose `kind` chain contains one of the class kind's `skills`; when that gives fewer than 3, it is topped up with other skills as today. Bonuses as today. *(assumed)*
- **Base kinds**: `martial` (`strike`, `shot`, `war-cry`, `toughness`) → `warrior`, `berserker`, `knight`; `arcane` (spells, `focus`) → `mage`, `warlock`, `sorcerer`; `divine` (`healing`, `blessing`, `prayer`) → `cleric`, `paladin`; `nature` (`remedy`, `frost-spell`, `agility`) → `druid`, `ranger`, `shaman`; `cunning` (`shot`, `curse`, `agility`, `presence`) → `rogue`, `assassin`, `bard`. *(assumed)*

## Generic code first

Where the item vocabulary has domain-free logic (nearest-level lookup, words that add up along the chain, drawable kinds, kind for an entity), it moves to a shared helper used by the four vocabularies, so a domain only declares its fields and text sections. *(assumed)*

## Out of scope

- NPC portraits from sprites (`domain: "npcs"`).
- An NPC kind suggesting gear kinds or a class kind.
- A kind select in the editors (the GM edits the result; items have none either).
- Fixed content lists in packs: tickets 05, 07, 08 (Decisions 7–10).
