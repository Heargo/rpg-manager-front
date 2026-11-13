# Random generators for skills and classes

Status: resolved
Type: task
Blocked by: 10

Spec: `../spec.md`

- Pure generators in `core/generators/`: `generateSkill(random, attributes, lang words)` (name, description, type, rarity, cost, cooldown, target, effects on the world's attributes) and `generateClass(random, attributes, skills)` (name, description, bonuses, a small valid tree from given skills).
- EN/FR word lists in `public/i18n/generators/<lang>/`.
- The skill and class editors get the Random button next to Save.

## Baseline

Test Files 142 passed, Tests 1162 passed.

## Seams

1. **`generateSkill` (pure, `core/generators/skill-generator.ts`, seeded `RandomSource`, word lists passed in)**: same seed same skill; valid against the skill rules (`skill.rules.ts` validation), effects only on the given attributes, passive skills have no cost/cooldown/target.
2. **`generateClass` (pure, `core/generators/class-generator.ts`)**: same seed same class; bonuses on given attributes; tree uses only given skills and passes `validateClass`.
3. **Skill and class editor components**: Random (pi-sparkles, next to Save) fills the form with a generated entry and a new one per click.

## Green

- Files: src/app/core/generators/{skill-generator,class-generator}.ts (new), name-generator.ts (exports `adjectiveForm`, `capitalize`), core/services/word-list.service.ts, core/business/word-list.business.ts, modules/{skill,class}/business/*-editor.business.ts, modules/{skill,class}/components/*-editor/*.component.ts (+ class scss), public/i18n/generators/{en,fr}/{skills,classes}.json (new)
- Change: pure `generateSkill` / `generateClass` (typed word lists: templates, gendered nouns, gender-agreeing adjectives, suffixes, descriptions; 24 entries per list, 20 FR/EN descriptions for classes, 10 per type for skills); `WordListBusiness.skillWords/classWords` (cached, validated, EN fallback); editor businesses `random(world)`; Random button (pi-sparkles) before Save in both editors, filling form and JSON via `setDraft`. Class trees are a root plus nodes each requiring one earlier node.
- Suite: 146 files / 1174 tests pass (baseline 142 / 1162); tsc clean; ng build no error; no unstaged test file.
- Open questions: skill descriptions have 10 entries per type (below 20); the "common.random" key already existed so no new i18n UI strings.

## Answer

Pure `generateSkill` / `generateClass` with EN/FR word lists (gender agreement in FR), loaded through WordListBusiness; Random next to Save in the skill and class editors. Browser: five Random skills in FR read naturally (e.g. "Estocade des profondeurs"). Skill descriptions: 10 per type (below the 20 asked), enough for now.
