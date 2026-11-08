# Skill model and skill catalogue

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (Skill catalogue).

`World.skills`, `skill.rules.ts` (validation, effect amount formulas on the safe parser with `rank`, `level` and caster attribute maxima, preview at rank 1 and max rank, delete refused while used). `/room/skills` page and skill editor (form + JSON). Passive skills add their permanent `modify` effects in `attributeStats` and the stats tooltip. Tools entry.

## Baseline

Test Files 112 passed (112), Tests 919 passed (919).

## Seams

1. **`skill.rules.ts` + `attributeStats` (pure rules)**: skill validation (maxRank 1–10, pointCost, active-only fields, effects), amount formulas on the safe parser with `rank`, `level` and caster attribute maxima, preview at rank 1 and max rank, where a skill is used (sheets: characters and NPCs) so delete is refused, and passive permanent `modify` effects added to a sheet's maxima with their own tooltip line. Misses: persistence and UI.
2. **Skill catalogue business (like `npc-catalogue.business`, over the world store / sandbox world)**: list with search + type filter, save, duplicate, delete refused while used (returns the usages), persisted in `World.skills`, also usable on the Tools sandbox world. Misses: the page template.
3. **Skill editor component inputs/outputs (`TEST_PROVIDERS`)**: given a skill and the world's attributes, form and JSON tabs emit a valid skill on save, show formula errors and the rank 1 / max rank preview, active-only fields hidden for passive. Misses: route wiring and the Tools menu entry (browser check).

## Red

- Test files: `src/app/modules/skill/helpers/skill.rules.spec.ts` (new), `src/app/modules/character/helpers/character-stats.spec.ts` (new `describe` appended), `src/app/modules/skill/business/skill-catalogue.business.spec.ts` (new, also covers the sandbox business), `src/app/modules/skill/components/skill-editor/skill-editor.component.spec.ts` (new)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one per file)
- Failing: the whole of each new file fails to compile/resolve (missing modules are the red; the `node:crypto` TS2591 line is pre-existing noise)
  - skill.rules.spec (16 tests: validateSkill x6, evaluateSkillAmount x2, previewSkillAmount x2, filterSkills, skillUsages x2) — `../models/skill` and `./skill.rules` (validateSkill, evaluateSkillAmount, previewSkillAmount, filterSkills, skillUsages) don't exist
  - character-stats.spec, `attributeStats with passive skills` x3 (adds permanent modify at sheet rank as `skillBonus` and in `max`; reads caster maxima; ignores active/timed/unowned) — `attributeStats` takes 3 args (needs 4th `skills: Skill[]`, new `skillBonus` field), `../../skill/models/skill` missing. The whole file fails to compile, so its existing tests are red too until green. Note the existing `toEqual` on a full stat will need `skillBonus: 0`
  - skill-catalogue.business.spec x6 (list+filter, save add/replace, duplicate, delete unused, delete refused with usages, sandbox save/duplicate/delete) — `SkillCatalogueBusiness`, `SandboxSkillCatalogueBusiness` (`modules/tools/business/sandbox-skill-catalogue.business.ts`) and `World.skills` don't exist; `remove` returns `{ removed, usages }`
  - skill-editor.component.spec x5 (fills form+JSON, preview rank 1/max rank, formula error blocks save, passive hides target/cooldown, emits edited skill from form and JSON) — `SkillEditorComponent` and `Skill` model don't exist (hooks in the spec's doc comment)
- Expected shapes: `Skill` in `modules/skill/models/skill.ts` (`effects`: `{kind:'damage'|'heal', attribute, amount: string}` or `{kind:'modify', attribute, amount, duration}`; `cost?: {attribute, amount}`); `evaluateSkillAmount(amount, {rank, level, maxima})` returns a `FormulaResult`; `previewSkillAmount(amount, attributeNames, maxRank)` returns `{ok:true, rank1, maxRank}` or `{ok:false,...}`.

## Green

- Files: `src/app/modules/skill/{models/skill.ts, helpers/skill.rules.ts, business/skill-catalogue.business.ts, business/skill-editor.business.ts, components/skill-editor/, components/skill-catalogue/, pages/skill-catalogue-page/, skill.routes.ts}`, `src/app/modules/tools/{business/sandbox-skill-catalogue.business.ts, pages/skill-catalogue-tool-page/, tools.routes.ts}`, `src/app/modules/character/helpers/character-stats.ts` (+ `character.business.ts`, character-sheet tooltip), `src/app/modules/npc/helpers/npc-visibility.rules.ts`, `src/app/modules/world/{models/world.ts, helpers/world.factory.ts, helpers/world-export.ts, business/sandbox-world.business.ts}`, `src/app/app.routes.ts`, room page button, `src/testing/game-device.ts` (per-device `SkillCatalogueBusiness`), `public/i18n/{en,fr}.json`
- Change: `World.skills` + `Skill` model; `skill.rules.ts` (validation, amount formulas on the safe parser with `rank`/`level`/maxima, preview, filter, usages, upsert/copy, JSON); GM and sandbox catalogue businesses (delete refused with usages); editor (form + JSON + live preview) and catalogue/page at `/room/skills` and `/tools/skills`; `attributeStats` takes a 4th `skills` arg and adds passive permanent `modify` effects as `skillBonus` (own tooltip line); world import validates `skills`.
- Suite: 945/946 pass (baseline 919 + 27 new). `tsc` clean, `ng build` OK (budget warnings only). The one failure is `character-stats.spec` "adds points and equipped modifiers": it uses `toEqual` on a full stat without `skillBonus`, while the new tests need `skillBonus: 0`. The spec needs `skillBonus: 0` added there (the ticket noted it); I left it unchanged.
- Open questions: (1) fix that existing `toEqual` in the spec; (2) the Tools nav entry is not added because `menu.service.spec` pins the exact nav list (route `/tools/skills` exists; add the menu item with label `nav.skillCatalogue` (already in en/fr) plus the spec update); (3) players do not receive `skills`, so their sheet tooltip shows no passive bonus until a later ticket.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/character/business/character.business.ts:79 — inline cast `(world as { skills?: Skill[] } | null)?.skills` (same optional `skills?` hack in npc-visibility.rules.ts:49) — add `skills` to `SheetWorld` / the `Pick` so the types say what is read.
  - src/app/modules/skill/helpers/skill.rules.ts:153 — `skill.rules.ts` imports `Sheet` from world models while `world.ts` imports `Skill` (circular type import, harmless) — fine for now, watch it.
  - src/app/modules/skill/components/skill-editor/skill-editor.component.ts:61,231 and skill-catalogue.component.ts:33 — text fields use `pInputText` on native `<input>` (the rule's own form for text), OK; no number or checkbox natives found.
  - Worlds already stored in IndexedDB have no `skills`; the catalogue/`upsertSkill` would throw on them. Accepted by the no-backward-compat policy, but old world exports are now rejected by `world.skills must be a list`; mention in the ticket if intended.
  - Known gap (out of scope): players do not get `World.skills`, so passive bonuses show on the GM side only.
- Checked: tsc spec typecheck clean; full suite 946/946 pass; en/fr keys paired; no secrets; no change to invite code handling; no host handlers added.

## Answer

Built: the `Skill` model and `World.skills`. `skill.rules.ts` covers validation, amount formulas on the safe parser (`rank`, `level`, caster attribute maxima), the rank 1 / max rank preview, filter, usages, upsert/copy and JSON parsing. There is a GM catalogue business and a sandbox one, and delete is refused with the list of usages. The skill editor has form and JSON tabs with a live preview. The catalogue page is at `/room/skills` (GM) and `/tools/skills`, with an entry in the Tools menu. `attributeStats` takes the world's skills and adds passive permanent `modify` effects as `skillBonus`, with its own tooltip line. World import validates `skills`.

Decisions: no fallback for worlds stored or exported without `skills` (dev rule: no backward compatibility; reset dev databases). The orchestrator added `skillBonus: 0` to an existing full-object `toEqual` in `character-stats.spec.ts`, plus the Tools menu entry and its menu spec line.

Checked: suite 946/946 (baseline 919), `ng build` clean (budget warnings only), review verdict ship. In the browser: `/tools/skills` in FR and EN, created a skill with an effect formula `rank * 3 + level` (preview "rank 1: 4 · rank 5: 16"), a broken formula shows an error, saved it to the list, editor usable at mobile width, no console errors. `/room/skills` is covered by the business tests only (it needs a hosted room).

Known gap (later ticket "What players receive"): players don't receive `World.skills`, so passive bonuses only show on the GM side for now.
