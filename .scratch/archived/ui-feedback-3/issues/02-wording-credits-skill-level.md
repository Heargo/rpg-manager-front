# Wording: credits AI note, "niveau de compétence"

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Wording)

- Credits AI section: the new FR and EN texts from the spec.
- Every FR label saying "rang" for a skill says "niveau" (« niveau de compétence », « Niveau max », « Niveau requis »…); EN "rank" → "skill level" / "level". Includes the skill and class AI prompts. Code identifiers are renamed in G11.

## Answer

Text only (no seam: i18n values and prompt prose). Credits AI text replaced in FR and EN (FR spelling fixed: « Je serais ravi », « sont voulues », « une copie »). Every skill "rang"/"rank" label now says niveau / level; the skill and class AI prompts too. Hints that name the formula variable `rank` are left for G11, which renames the variable. Suite unchanged: 173 files, 1417 tests pass.
