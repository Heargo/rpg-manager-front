# Random generators and word lists

Status: needs-triage
Type: task
Blocked by: none

Spec: `../spec.md` (Random generators as separate helpers, Word lists).

- `core/generators/`: `random-source.ts` (crypto + seeded sfc32), `random.ts` (`randomInt` with rejection sampling, `pick`, `weightedPick`, `shuffle`, `chance`), `word-list.ts` (types + `validateWordList`), `name-generator.ts`, `item-generator.ts`. Pure TypeScript, no Angular.
- `public/i18n/generators/en/items.json` and `fr/items.json`: bases for every slot and type, adjectives and suffixes per rarity, templates per rarity, descriptions; French with gender agreement.
- `word-list.service.ts` (HTTP) + `word-list.business.ts` (cache per language, follows `LanguageBusiness.$language`, falls back to `en`).
- Add `/i18n/**` coverage check: generators work offline.

Done when: unit tests cover unbiased `randomInt`, same seed → same item, every rarity/type/slot produces a valid draft, French names agree in gender, invalid word list JSON is rejected with a readable error.
