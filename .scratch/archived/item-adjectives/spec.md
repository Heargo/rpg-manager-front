# Adjectives and tints that fit the item

Follow-up of `archived/item-coherence` (user go, 2026-11-14). The IC06 review sampled Base FR items and found adjectives and tints that don't fit the kind: "Parchemin rouillé", "Diadème affûté", "Capuche affûtée", "Onguent renforcé". Tint descriptions are also rarely drawn ("Gants ardents" got a generic line). Untinted adjectives and suffixes can only be edited as raw JSON.

## Decisions (orchestrator, 2026-11-14, user go on "adjectifs propres à chaque catégorie")

1. **Kinds carry their own adjectives and suffixes.** In the language file, a kind's texts get `adjectives?` and `suffixes?` per rarity (same shapes as the top-level ones, tinted entries allowed through an optional `tint` on the entry). Unlike nouns, they **add up along the chain**: a sword draws from `sword`, `weapon` and `equipment` lists, plus the top-level ones.
2. **Top-level adjectives and suffixes are for anything.** Base keeps there only words that fit every item ("simple", "ordinaire", "ancien", "légendaire"…); material or use words move to the kinds they fit ("affûté", "trempé", "équilibré" → `weapon`; "renforcé", "rapiécé" → armour levels; "poli" → jewellery and metal; "frais", "éventé" → food…).
3. **A tint says which kinds it fits.** In the manifest, a tint gets `fits?: string[]` (kind ids). Its words and descriptions are only drawn for an item whose chain contains one of them; no `fits` means any item. Pooling: the union of `fits` across packs. Base: `rust`, `steel`, `silver` fit metal things (weapon, armour levels, jewellery, keys, tools); `wood` fits weapon/shield/tools; `leaf` fits food/consumables/clothes; `fire`, `ice`, `arcane`, `shadow`, `gold` fit anything.
4. **Tint descriptions come first.** When the drawn adjective or suffix has a tint with descriptions that expand, the description is drawn from the tint's pool one time in two (seeded), otherwise from the kind chain as today.
5. **Form**: a kind row gets "Adjectifs" and "Suffixes" per rarity (collapsed, like name templates); a tint row gets "Convient à" (kinds multiselect, `fits`); the Items section gets "Adjectifs et suffixes communs" (top-level lists, collapsed).

Dev project: the format changes in place (items word list stays version 2 with new optional fields; manifest stays format 2 with an optional `fits`), no migration needed since the fields are optional.
