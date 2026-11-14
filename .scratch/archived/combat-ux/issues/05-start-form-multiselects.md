# Start form: characters and NPCs multi-selects

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Starting a combat)

- Two `p-multiselect` (filter, chips, portrait): characters of the room, catalogue NPCs. Each picked NPC has a count (default 1) for several copies.
- Start keeps today's behaviour (sides, initiative).

## Decisions (orchestrator)

- Start form in `combat-gm-panel`: two Optimus UI `p-multiselect` (`display="chip"`, `filter`, option template with portrait or initial): `data-testid="start-characters"` (the room's characters, `combat.$characters()`) and `data-testid="start-npcs"` (catalogue NPCs, `combat.$npcs()`), each option `data-testid="start-option"` + `data-name`. Empty catalogues keep today's hints (`combat.start.noCharacters`, `combat.start.noNpcs`) instead of the multiselect.
- Each picked NPC gets a row under its multiselect (`data-testid="start-npc"`, `data-name`) with a `p-inputnumber` count (`showButtons`, min 1, max 20, default 1, `data-testid="npc-count"`). Unpicking an NPC drops its count.
- Start sends `{ characterIds, npcs: [{ npcId, count, side }] }` exactly as today (side from the NPC's roles); Start disabled while nothing is picked; the form resets after a successful start.
- A pure helper `startPicks(characterIds, npcIds, counts, npcs)` in `combat/helpers/combat-start.rules.ts` builds the payload (count defaults to 1, clamped 1–20, unknown ids dropped).

## Baseline

Test Files 237 passed, Tests 2031 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's i18n lines are staged.

## Seams

1. **Pure helper** `startPicks` (`combat-start.rules.ts`): payload, default count, clamping, side from roles, unknown ids dropped. Misses: UI.
2. **GM panel component** (`TEST_PROVIDERS`, `combat-table` fixtures; options are in an overlay outside the component, like `pickTarget`): two multiselects, picking characters and NPCs, an NPC count row per picked NPC, Start sends the picks and starts the encounter (combatants listed), Start disabled with nothing picked, hints for empty catalogues. Misses: layout (browser). Existing start-form tests move to the new contract in the red step, keeping what they check.

## Red

- Test files: `src/app/modules/combat/helpers/combat-start.rules.spec.ts` (new), `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts` (start-form test moved to the new contract, header contract updated), helper `pickStart(host, testid, name)` added to `src/testing/combat-table.ts`. No other spec drives the old start form (the Tools combat sandbox has no spec on it).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30`
- Failing: 10 tests
  - startPicks: builds the payload with the characters and the NPCs with their counts — `combat-start.rules` does not exist (missing module, bundle fails)
  - startPicks: defaults the count to 1 — same
  - startPicks: clamps the count between 1 and 20 — same
  - startPicks: puts an NPC with the enemy role among the enemies, whatever its other roles — same
  - startPicks: drops unknown NPC ids — same
  - panel: starts an encounter from the characters picked and an NPC count — no `start-characters` multiselect yet
  - panel: starts with the default count of one copy per picked NPC — no `start-npcs` multiselect
  - panel: drops the count row of an NPC that is unpicked — no `start-npcs` multiselect
  - panel: disables Start while nothing is picked — no `start-characters` multiselect
  - panel: shows the hint instead of the NPC multi-select when the catalogue is empty — `start-characters` multiselect absent (assertion)

## Green

- Files: `src/app/modules/combat/helpers/combat-start.rules.ts` (new), `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.{ts,html,scss}`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: `startPicks` helper (count default 1, clamp 1-20, unknown ids dropped, side from roles). The panel start form now has two `p-multiselect` (characters, NPCs; chips, filter, portrait or initial) and a `p-inputnumber` count row per picked NPC (unpicking drops its count). Start is disabled while nothing is picked, and the form resets after a start. Empty catalogues keep their hints. i18n: `combat.start.placeholder` and `combat.start.count` added, unused `combat.start.{pick,picked,fewer,more}` removed (checked with node in both files).
- Suite: 238 files / 2040 tests pass (baseline 237 / 2031); tsc clean; ng build no error. `git diff --name-only` lists only `static-pages.spec.ts`, which belongs to the other session.
- Open questions: none

## Review

- Verdict: ship. The moved start-form test still starts Ada, Bob and 2 Goblins and expects the same combatants.
- Consider (not applied): one shared option template for both multiselects; bind `MIN_NPC_COUNT`/`MAX_NPC_COUNT` instead of hard-coded 1/20; a negative/NaN count case in the helper spec.

## Answer

- `startPicks` (pure, `combat-start.rules.ts`): builds `{ characterIds, npcs: [{ npcId, count, side }] }`, count default 1, clamped 1–20, side from the NPC's roles, unknown ids dropped.
- GM panel start form: two Optimus UI multiselects (characters, NPCs) with chips, filter and portrait or initial; a count row (`p-inputnumber`, 1–20) per picked NPC, dropped on unpick; Start disabled while nothing is picked; reset after start; empty-catalogue hints kept. Keys: `combat.start.placeholder`, `combat.start.count` added; unused `pick`, `picked`, `fewer`, `more` removed (FR, EN).
- Tests: 5 helper + 5 panel tests; the old start-form test moved to the new contract (`pickStart` in `src/testing/combat-table.ts`). Suite 238 files, 2040 tests pass (baseline 2031). Build clean.
- Browser: Tools combat sandbox, FR, EN and mobile: picking Yusica and the cave goblin shows chips and a count row "Gobelin des cavernes 1"; count 2 then Start gives Gobelin des cavernes 1 and 2 and Yusica; no horizontal scroll, no console error.
