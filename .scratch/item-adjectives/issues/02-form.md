# Pack creator: kind adjectives, tint fits, common words

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (Decision 5).

- Kind row: collapsed "Adjectifs" and "Suffixes" per rarity (adjective forms m / f / mp / fp, optional tint).
- Tint row: "Convient à" `p-multiselect` of known kinds (`id — first noun` labels), editing the manifest `fits`.
- Items section: collapsed "Adjectifs et suffixes communs" per rarity (top-level lists).
- Pure draft edits for each (`setKindWords`, `setTintFits`, `setCommonWords`), pruning empty lists. Optimus UI only, FR and EN strings.
