# NPC class and skills

Status: resolved
Type: task
Blocked by: 07

Spec: `../spec.md` (NPC catalogue → Generate, Decisions 6).

Split from N07 (2026-11-08). The NPC editor gains a class picker, a "Learn from the class" action (spends the NPC's skill points along its class tree, using N07's learn rules), and free skill editing (any catalogue skill at any rank, like `set-skill`). Generation picks a class (random or chosen) from the world's classes and learns skills along its tree with the points its level gives. A world with no classes generates NPCs without a class, as today.

## Baseline

Test Files 121 passed (121), Tests 1006 passed (1006).

## Seams

Assumed order for "Learn from the class" (spec doesn't say): an NPC of level L has `startingSkillPoints + skillPointsPerLevel × (L − 1)` points. The button spends them one rank at a time, always on the first available node in tree order (row, then column) that is below max rank and affordable, using N07's learn checks. It is deterministic, and skills already on the sheet are kept. Generation does the same but picks among the available nodes with the `RandomSource`.

1. **NPC rules (pure, `npc*.rules.ts`)**: skill points for a level, learn from the class (order above, prerequisites and min level respected, stops when no node is affordable), free skill edit (any catalogue skill, any rank, 0 removes), generation with a chosen or random class learning along its tree, and no class when the world has none. Misses: the editor UI.
2. **NPC editor component inputs/outputs (`TEST_PROVIDERS`)**: class picker from the world's classes, "Learn from the class" fills the skills, free add / remove / re-rank of any catalogue skill, generate with a chosen class, and the emitted NPC carries `classId` and `skills` (form and JSON). Misses: the sandbox Tools page wiring (browser check).

## Red

- Test files: `src/app/modules/npc/helpers/npc-skills.rules.spec.ts` (new), `src/app/modules/npc/components/npc-editor/npc-editor.component.spec.ts` (edited: the "has no class or skills yet" test is replaced by the class/skills tests)
- Run: `npm test` (a single-file `--include` run fails to compile on `node:crypto` types here, even on untouched specs, so run the whole suite)
- Names the green must provide, all in `npc-editor.rules.ts`: `npcSkillPoints(level, world)`, `learnNpcSkillsFromClass(npc, world)` (sets `skillPoints` to the remainder), `setNpcSkill(npc, skillId, rank, world)`, `setNpcClass(npc, classId | undefined)`, and `generateNpc(world, random, names, classId?)`. The rules spec reads them off the module namespace with `as any` so the file compiles (green: switch to named imports and drop the casts). Component hooks are in the header comment of the component spec (`class`, `learn-from-class`, `add-skill`, `skill-entry`, `skill-rank`, `remove-skill`, `generate-class`).
- Failing: 21 tests (suite: 21 failed, 1006 passed; baseline 1006 passed)
  - npcSkillPoints: starting + per level — export missing
  - learnNpcSkillsFromClass (7): tree order until maxed, unlocked nodes and stop, min level reached, min level refused, skip unaffordable for cheaper, keep existing skills, no class no-op — export missing
  - setNpcSkill (5): add any skill, re-rank, remove at 0, ignore unknown/out-of-range rank, skill points untouched — export missing
  - setNpcClass: set and clear — export missing
  - generateNpc with classes (2): chosen class learns along tree, random class from world — `generateNpc` ignores classId and never sets class/skills
  - NpcEditorComponent (5): class picker saved + JSON, learn from the class, add/re-rank/remove skill, classId and skills from JSON, generate with chosen class — no `class`/`learn-from-class`/`add-skill`/`generate-class` elements yet
- Already passing (not counted): generation without world classes yields no class and no skills (current behaviour, guards against regression).

## Green

- Files: src/app/modules/npc/helpers/npc-editor.rules.ts, src/app/modules/npc/business/npc-editor.business.ts, src/app/modules/npc/components/npc-editor/npc-editor.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: added `npcSkillPoints`, `setNpcClass`, `setNpcSkill`, `learnNpcSkillsFromClass` and a `classId` argument on `generateNpc`. They reuse N07's `applyCharacterAction` (`learn-skill`, `set-skill`) and `treeNodeStates` through it. The editor gets a class picker, a skills fieldset (learn, add, re-rank, remove) and a class picker on the Generate tab, with EN/FR strings. The sandbox Tools page and the NPC page both embed the same component, so they get it with no wiring change.
- Suite: 122 files / 1027 tests pass (baseline 121 / 1006); tsc clean; ng build OK; no test file in the unstaged diff.
- Open questions: "Learn from the class" counts the points as the level's total minus the cost of tree skills already on the sheet, so a second press doesn't overspend. Skills outside the tree are free. The Seams note doesn't say this.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/npc/components/npc-editor/npc-editor.component.ts (skillName / skillMaxRank) — `?? skillId` and `?? 1` fallbacks for a skill missing from the world are defensive code for data that should not exist; drop them or leave it as a known display-only guard.
  - src/app/modules/npc/helpers/npc-editor.rules.ts (learnNpcSkills) — computes the whole option list with `applyNpcAction` on every loop step; fine at tree sizes, but `ordered` and the `inTree`/`spent` scan are rebuilt per call. Not worth changing now.
  - src/app/modules/npc/helpers/npc-editor.rules.ts (generateNpc) — an unknown `classId` silently falls back to a random class; a caller bug would be hidden. Acceptable per the Seams, but worth a test if it matters.
  - src/app/modules/npc/helpers/npc-skills.rules.spec.ts:8 — the long one-line imports and literals are not prettier-formatted; run the formatter.
  - Green's choice (points = level total minus cost of tree skills on the sheet; off-tree skills are free) is reasonable and avoids overspending on a second press; add one line to the spec's Decisions so it is not lost.

Checked: N07's `applyCharacterAction` (`learn-skill`, `set-skill`) is reused through `applyNpcAction`, with no duplicated learn checks. No optional or old-data fallbacks were added to the model. `delete next.classId` only keeps the "no class" shape clean. Strings are in both en.json and fr.json. The template uses `@for` and Optimus UI controls (`p-select`, `p-inputnumber`). No secrets or URL changes. Specs hit the pure rules and the component hooks the ticket named.

## Answer

Built: the NPC editor gains a class picker (from the world's classes), "Learn from the class", free skill editing (add any catalogue skill, re-rank, remove), and a class choice on the Generate tab. New pure rules in `npc-editor.rules.ts`:
- `npcSkillPoints`;
- `learnNpcSkillsFromClass`, deterministic, in tree order (row, then column);
- `setNpcSkill` and `setNpcClass`;
- `generateNpc` with a chosen or random class, learning along its tree with the `RandomSource`. With no classes in the world, the NPC gets no class.

These reuse N07's `applyCharacterAction` (`learn-skill`, `set-skill`), so no learn check is duplicated. The sandbox NPC editor tool gets all of this through the same component.

Decisions:
- An NPC's points are `startingSkillPoints + skillPointsPerLevel × (level − 1)`. "Learn from the class" spends that total minus the cost of tree skills already on the sheet, so a second press doesn't overspend. Skills added outside the tree are free.
- The orchestrator switched the rules spec from `as any` namespace reads to named imports and ran prettier on it. No assertion was changed.

Checked:
- Suite 1027/1027 (baseline 1006), spec typecheck clean, `ng build` clean, review verdict ship.
- In the browser (sandbox, FR): created skill "Frappe" (max rank 3) and class "Guerrier", picked it on a level 1 NPC, and "Apprendre selon la classe" gave Frappe rank 1 with 0 points left. The EN strings show at mobile width. No console errors.
