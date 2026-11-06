# Random generators and word lists

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Random generators as separate helpers, Word lists).

- `core/generators/`: `random-source.ts` (crypto + seeded sfc32), `random.ts` (`randomInt` with rejection sampling, `pick`, `weightedPick`, `shuffle`, `chance`), `word-list.ts` (types + `validateWordList`), `name-generator.ts`, `item-generator.ts`. Pure TypeScript, no Angular.
- `public/i18n/generators/en/items.json` and `fr/items.json`: bases for every slot and type, adjectives and suffixes per rarity, templates per rarity, descriptions; French with gender agreement.
- `word-list.service.ts` (HTTP) + `word-list.business.ts` (cache per language, follows `LanguageBusiness.$language`, falls back to `en`).
- Add `/i18n/**` coverage check: generators work offline.

Done when: unit tests cover unbiased `randomInt`, same seed → same item, every rarity/type/slot produces a valid draft, French names agree in gender, invalid word list JSON is rejected with a readable error.

## Answer

- `core/models/item.ts`: rarities, types, equipment slots, `ItemModifier`, `ItemDraft` (L03 builds the stored item on top).
- `core/generators/`: `random-source.ts` (crypto source, seeded sfc32 with cyrb128 seed hashing, readable `createSeed()`), `random.ts` (`randomInt` with rejection sampling, `pick`, `weightedPick` on integer weights, Fisher–Yates `shuffle`, exact `chance(n, d)`), `word-list.ts` (format + `validateWordList` with readable errors), `name-generator.ts` (templates per rarity, gender agreement), `item-generator.ts` (rarity/type/slot draws, rarity rules for modifier count and size, consumables ×3, plain items without modifiers, price from rarity and modifier points ±20%, rounded to 5).
- Word lists: `public/i18n/generators/{en,fr}/items.json` (every slot and type, 5 rarities); French descriptions written gender-neutral.
- `core/services/word-list.service.ts` (HTTP) + `core/business/word-list.business.ts` (cache per language, active language by default, English fallback with a warning, failed loads not cached).
- `chance()` takes integer odds (`numerator, denominator`) instead of a float probability, so it stays exact.
- Offline: both lists are in the service worker's prefetch group (checked in `ngsw.json`).
- Tests: 37 new (random helpers incl. rejection at the boundary, word list validation incl. both shipped files, French agreement, every base × rarity in both languages, item rules, determinism, price ordering, business cache/fallback). Suite: 57 passing.
- Note: the dev server only serves files added to `public/` after a restart.
