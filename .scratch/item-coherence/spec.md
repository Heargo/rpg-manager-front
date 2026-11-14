# Coherent generated items: kinds, tints and phrases shared across packs

User request 2026-11-14: "il faut que l'image tirée aléatoirement soit cohérente avec le nom et si possible la description". Today the item generator draws a noun, an adjective and a description independently, and the random image matches a word of the name against sprite labels, then falls back on type and slot. A Bâton gets a bow, an Élixir an apple, "Anneau d'oreille" a ring, and "argenté" or "des braises" don't affect colours.

Replaces the item word list format (v1) and part of the manifest of `pack-languages` (archived). Dev project: no backward compatibility, the old formats are replaced outright.

## Decisions (user, 2026-11-14)

1. **A shared, language-free key ties everything together: the kind.** A kind is a concrete thing (`sword`, `potion`, `key`). The word list gives its nouns and descriptions, and sprites say which kinds they illustrate. Matching no longer goes through translated text.
2. **Kinds form a tree.** A kind has an optional `parent`. Only roots declare `type`. `slot` is declared once on the level where it applies (`weapon`), and children inherit `type` and `slot`. Nouns, descriptions, name templates and sprites are looked up from the kind up through its parents, and the first level that has some wins. Roots `equipment`, `consumable` and `item` carry the generic descriptions, so **descriptions per type go away**.
3. **Tints**: a pack can declare tints (an id plus a gradient, in the sprite gradient format). Adjectives and suffixes of the word list may carry a `tint`, and the image uses that gradient.
4. **Two levels in a pack.** The manifest (`pack.json`) holds what has no language: kinds (tree, type, slot), tints (gradients) and sprites (with their `kinds`). The language files hold the texts: `generators/items.json` (texts per kind, per tint, templates) and `generators/common.json` (params, shared by every generator).
5. **Neutral packs**: a pack may have no language. It then holds only sprites, kinds and tints (for example a drawing pack).
6. **Words with no sprite stay.** A pack can be text only. A kind with no sprite anywhere in its chain gets an image by type and slot as today.
7. **Everything is pooled across the world's active packs.** A generation no longer picks one pack: kinds, tints, sprites, params and texts come from all active packs. **Texts only come from packs in the world's language.** Kinds, tints and sprites come from every active pack, whatever its language (and from neutral packs).
8. **The Pack select next to the seed in the item editor goes away.**
9. **Phrases with variable parts.** Descriptions, kind name templates and params are phrases:
   - `[a|b|c]`: a variant drawn at random,
   - `{maker}`: a param, drawn from the params of that name in all active packs of the world's language; a param may contain variants and other params (limited depth),
   - `{g:forgé|forgée}`: agreement with the gender of the drawn noun,
   - `{base}`, `{adjective}`, `{suffix}`: the noun and the drawn words (name templates).
10. **Name templates (`templates`, per rarity) are optional.** The Base of each language gives them. A kind may have its own name templates (`names`, per rarity, e.g. `"Potion de {effect}"`) that come before the language's.
11. **Naming conventions so packs stay compatible**, documented in the user docs, with the Base packs publishing the standard set:
    - kinds: English, singular, kebab-case, the concrete thing (`sword`, `war-hammer`, `healing-potion`). A sub-kind gets a `parent` rather than a new isolated name.
    - tints: a material or an element (`steel`, `gold`, `fire`, `ice`, `rust`, `shadow`), not a raw colour.
    - params: named by their **role in the sentence** (`maker`, `owner`, `place`, `event`, `material`, `creature`). An entry is a complete noun phrase with its article ("un forgeron nain"), so it fits anywhere without agreement.
12. **Pack creator form is structured**: sections Kinds, Tints, Params (Templates for a language Base), with autocompletion on keys already known in installed packs and a preview of a few draws. Raw JSON stays as an advanced import/export.
13. **NPC, skill and class generators keep their lists and their Pack select for now, but will move to the same system next.** The pack structure must make that move an addition, not a rewrite:
    - the manifest groups content **per domain** (`domains.items`, later `domains.npcs`, `domains.skills`, `domains.classes`), each with the same shape: `kinds` (the tree, with fields specific to the domain) and `texts` (the path to its language file);
    - kind ids are scoped by domain (`items` `guard` and `npcs` `guard` are different);
    - a sprite says which domain it illustrates (`domain` + `kinds`), so NPC portraits can come later;
    - shared by every domain: tints (manifest), params (`generators/common.json`), the phrase engine, the kind tree (inheritance, pooling, conflicts), all written once as generic code; a domain only declares its own kind fields and text sections (a schema per domain);
    - each file carries its own `version`, so a domain's file can change without touching the others;
    - a domain the app doesn't know yet is ignored with a warning, so a newer pack still loads; unknown fields inside a known domain are errors (to catch typos).
    Until they move, `domains.npcs|skills|classes` only hold `texts` pointing at today's v1 lists.

## Example

`pack.json` (extract):

```json
"tints": {
  "fire": { "gradient": [{ "position": 0, "color": "#5a0a0a" }, { "position": 0.5, "color": "#f97316" }, { "position": 1, "color": "#fde047" }] }
},
"domains": {
  "items": {
    "kinds": {
      "equipment":  { "type": "equipment" },
      "weapon":     { "parent": "equipment", "slot": "weapon1" },
      "sword":      { "parent": "weapon" },
      "rapier":     { "parent": "sword" },
      "consumable": { "type": "consumable" },
      "potion":     { "parent": "consumable" }
    },
    "texts": "generators/items.json"
  },
  "npcs":    { "texts": "generators/npcs.json" },
  "skills":  { "texts": "generators/skills.json" },
  "classes": { "texts": "generators/classes.json" }
},
"common": "generators/common.json",
"sprites": [{ "id": "sword", "label": "Épée", "domain": "items", "kinds": ["sword"], "kind": "masked", "image": "sprites/sword.png", "materials": "sprites/sword.json" }]
```

A neutral pack has no `language`, no `common` and no `texts`. `generators` (the old flat map) goes away.

`generators/items.json` (French):

```json
{
  "version": 2,
  "kinds": {
    "equipment": { "descriptions": ["Chaque éraflure raconte une histoire."] },
    "weapon":    { "descriptions": ["Une arme [fiable|redoutable], {g:forgé|forgée} par {maker}."] },
    "sword":     { "nouns": [{ "text": "Épée", "gender": "f" }, { "text": "Lame", "gender": "f" }] },
    "rapier":    { "nouns": [{ "text": "Rapière", "gender": "f" }] },
    "potion":    { "nouns": [{ "text": "Potion", "gender": "f" }], "names": { "common": ["Potion de {effect}"] } }
  },
  "tints": {
    "fire": {
      "adjectives": { "rare": [{ "m": "ardent", "f": "ardente" }] },
      "suffixes": { "rare": ["des braises"] },
      "descriptions": ["Encore tiède au toucher, même après une nuit dehors."]
    }
  },
  "adjectives": { "common": [{ "m": "usé", "f": "usée" }] },
  "suffixes": { "rare": ["de vigueur"] },
  "templates": { "common": ["{base} {adjective}", "{base}"] }
}
```

`generators/common.json` (French, shared by every domain):

```json
{
  "version": 1,
  "params": {
    "maker": ["un forgeron nain", "les moines de {place}", "un apprenti [maladroit|pressé]"],
    "place": ["Valombre", "la côte gelée"],
    "effect": ["soin", "vigueur"]
  }
}
```

Drawing `rapier`: type `equipment` (from `equipment`), slot `weapon1` (from `weapon`), noun "Rapière" (own), description from `weapon`, sprite `sword` (from `sword`, any active pack). With the adjective "ardente" (tint `fire`): "Rapière ardente", a sword image in fire colours.

## Assumed

- **The world gets a `language`** (`en` | `fr`), set to the app language when the world is created, editable in the wizard's Rules step and the rules page. A stored world without it reads as the app language. Without a world (Tools, sandbox), the app language. *(assumed: needed by decision 7, the world had none)*
- In the rules, an active pack in another language is still allowed; it shows that only its sprites, kinds and tints are used. *(assumed)*
- **Kind conflicts**: the same kind declared by several active packs with a different `type`, `slot` or `parent`: the declaration of the Base packs wins, then the first in the world's pack order. The Packs page / rules show a warning. Identical declarations merge silently. *(assumed)*
- **Tint conflicts**: the same tint id with different gradients in several packs: all gradients are variants of that tint, one drawn per image. *(assumed)*
- A kind's tree must have no cycle, its root must declare a `type`, a `parent` declared in another pack is allowed (resolved when pooling); a kind whose chain doesn't reach a typed root in the active packs is ignored. *(assumed)*
- **Which kinds can be drawn**: a kind whose chain gives a type and at least one noun in the world's language. The draw keeps today's weights: type by `TYPE_WEIGHTS` (or fixed by the GM), slot among the slots that have a drawable kind (or fixed), then a kind, then a noun. *(assumed)*
- **Description pool**: the descriptions of the nearest level of the kind chain that has some, plus those of the tint of the drawn adjective or suffix; one is drawn from that pool. No description anywhere: empty description. *(assumed)*
- **Name templates**: the kind chain's `names[rarity]` if any level has some, else the language `templates[rarity]` pooled from active packs of the language, else `{base}`. *(assumed)*
- Untinted `adjectives` and `suffixes` (per rarity) stay at the top level of the language file; tinted ones live under their tint. Both are pooled and drawn together. *(assumed)*
- A phrase using a param that no active pack of the language defines is skipped (another one is drawn); if none is left, the text is empty. The pack validation only warns about params it doesn't define itself, since another pack may give them. Param nesting stops at depth 5. *(assumed)*
- **The item stores `kind` and `tints`** (optional; `tints` is the adjective's tint then the suffix's, when they have one). The "random image" button uses them, so a renamed item keeps a coherent image. An item with no `kind` (typed by hand, older item) is matched by its name: each word, singular form (trailing `s`/`x` dropped), against the nouns of the pooled language files, giving a kind; otherwise type and slot. Sprite labels are no longer used for matching. *(assumed)*
- **Image colours**: the item's `tints` go on the material layers in order (adjective's on the first, suffix's on the second); other layers get a random tint from the pooled tints (built-in presets if none). *(assumed)*
- **Base packs**: `base-fr` and `base-en` both declare the same kinds and tints in their manifests (identical, so they merge). The current `PRESETS` become Base tints, plus `rust`, `silver` and `shadow`. Every Base sprite gets its kinds, and every Base noun its kind, with new kinds for nouns that had no sprite (`staff`, `mace`, `orb`, `lantern`, `elixir`…). *(assumed)*
- Drafts and installed unofficial packs in the old format are dropped (no migration). *(assumed: dev, no fallback)*

## Out of scope

- Moving NPC, skill and class generators to kinds (next feature; this one only prepares the structure, Decision 13). NPC portraits.
- Splitting Base into a neutral drawing pack plus text-only language packs.
- Automatic translation between a pack's FR and EN versions.
