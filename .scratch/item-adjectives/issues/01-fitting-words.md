# Kind adjectives, tint fits and tint descriptions first

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1–4).

- Language file: kind texts accept `adjectives` / `suffixes` per rarity; entries may carry `tint` (an adjective as `{ m, f, mp?, fp?, tint? }` or `{ text, tint }` for a string form, a suffix as `string | { text, tint }`). Validation updated (unknown tint ids are fine, they may come from other packs).
- Manifest: tint `fits?: string[]` (kebab-case kind ids). `poolTints` keeps the union of `fits`.
- Vocabulary: `adjectives(rarity, kind)` / `suffixes(rarity, kind)` = top-level + every level of the kind's chain + tinted words of tints that fit the kind; `tintDescriptions(tint, kind)` empty when the tint doesn't fit.
- Generator: uses the kind-aware lists; description drawn from the tint pool one time in two when it has some.
- Base FR/EN content per spec Decisions 2–3; both manifests keep identical tints (with `fits`).
- Same seed and packs → same item.
