# Skill points and learning skills (players)

Status: resolved
Type: task
Blocked by: 06, 15

Spec: `../spec.md` (Skill points, What players receive).

World rules `startingSkillPoints` and `skillPointsPerLevel` (wizard Rules step and World rules page, defaults 1 and 1); level-ups grant them (toast says both). Actions `learn-skill` (player), `refund-skill`, `grant-skill-points`, `set-skill` (any skill at any rank), `set-class` (GM only), host-validated over the fake peer network; offline toggle `learnSkills`. Per-player view `class/mine` (own class, its tree and skills, own skills only; no catalogue to players). Sheet Skills tab with the tree view, skills taught outside the tree and a skill points badge.

Split (2026-11-08, user): the NPC part (class, "Learn from the class", free skill editing, class-based generation) moved to `18-npc-class-and-skills.md`.

## Baseline

Test Files 118 passed (118), Tests 973 passed (973).

## Seams

1. **Skill point rules (pure, `*.rules.ts`)**: world rules `startingSkillPoints` / `skillPointsPerLevel` validation and defaults (integers ≥ 0, 1 and 1), skill points granted by a level-up, learn checks (node in the sheet's class tree, prerequisites and min level met via `treeNodeStates`, rank below max, enough points for `pointCost`), refund refused while another learned node needs that rank, `set-class` refunding every tree skill. Misses: messaging and UI.
2. **Character business over the fake peer network (`src/testing/game-device.ts`, host + players)**: `learn-skill` from a player, GM-only `refund-skill`, `grant-skill-points`, `set-skill` (any catalogue skill, any rank, 0 removes) and `set-class`, all host-validated and synced. A level-up grants skill points, and the toast text has both kinds of points. `learn-skill` is queued offline only when `learnSkills` is on. `class/mine` returns the requesting player's own class, its tree and the skills it references plus their sheet's skills, never the catalogues or another player's class beyond its name. Misses: rendering.
3. **Sheet Skills tab component inputs/outputs (`TEST_PROVIDERS`)**: given the character and its `class/mine` view, it shows the tree with node states, skills taught outside the tree and the unspent points badge, and emits learn (player) / refund and set (GM). Misses: the World rules page and wizard fields (browser check; their validation is in seam 1).

## Red

- Test files:
  - `src/app/modules/skill/helpers/skill-points.rules.spec.ts` (seam 1, pure)
  - `src/app/modules/character/business/skill-points.spec.ts` (seam 2, host + 2 players over the fake network)
  - `src/app/modules/character/components/character-sheet/character-sheet-skills.spec.ts` (seam 3, in `CharacterSheetComponent`: no new file, so the build still resolves)
- Run: `npm test` (baseline 973 passed stays; 33 new tests fail)
- Contract the tests pin (names are the green step's to honour):
  - `applyCharacterAction(attrs, character, action, levelRules, { skills, classes })`: 5th arg is the catalogue; `LevelRules` gains `skillPointsPerLevel`. New kinds `learn-skill {skillId}`, `refund-skill {skillId}`, `grant-skill-points {amount}` (1..100), `set-skill {skillId, rank}`, `set-class {classId}`; all but `learn-skill` in `GAME_MASTER_ACTIONS`; parsed by `parseCharacterAction`.
  - Error keys: `character.errors.` + `notInTree` (no class or skill not in the tree), `skillLocked` (prerequisite or min level), `skillMaxRank`, `noSkillPoints`, `skillNeeded` (refund blocked), `skillNotLearned`, `unknownSkill`, `invalidRank`, `unknownClass`, `invalidAmount`.
  - World: `startingSkillPoints` / `skillPointsPerLevel` default 1 / 1 in `createWorld`, accepted on `WorldDraft`, errors `world.errors.nonNegativeInteger`; `OfflineFeatures.learnSkills`; `isOfflineAllowed(features, 'learn-skill')` follows it.
  - Level-up toast: `levelUpMessage` gives "Level 2! +3 stat points, +2 skill points" (update en.json and fr.json).
  - `CharacterBusiness.loadMyClass(): Promise<{ characterClass: CharacterClass | null; skills: Skill[] }>` (route `class/mine`); the player gets only their class and its referenced skills plus their sheet skills.
  - `CharacterSheetComponent` gains input `classView` (same shape) and a "Skills" tab: `[data-tree-node]`/`data-state` via the tree, `[data-skill-points]` badge, `[data-taught="id"]`, `[data-learn="id"]` (players, only when learnable and affordable), `[data-refund="id"]` and `[data-remove-taught="id"]` (GM; emit `refund-skill` / `set-skill` rank 0).
- Failing: 33 tests (the new tests use loose casts where a symbol is missing, because a type or unresolved-import error would break the whole build):
  - skill-points.rules.spec.ts (18): world defaults — `createWorld` has no `startingSkillPoints`; world validation — no error for the new fields; action kinds and GM list — kinds missing; parse — returns null; offline toggle — `learnSkills` unknown; level-up — no skill points granted; learn-skill (4), refund-skill (3), grant-skill-points, set-skill (2), set-class (2) — `applyCharacterAction` has no such cases.
  - skill-points.spec.ts (10): all fail in setup or action — host has no handler for `character/set-class` etc. (learn, refusals, other player's character, GM-only, GM refund/set/class, level-up toast, 4 `class/mine` tests, including no catalogues in WorldInfo).
  - character-sheet-skills.spec.ts (5): `classView` is not an input of `CharacterSheetComponent` (NG0303); covers tree states and badge, taught list, learn emit, no learn without points, GM refund/remove.

## Green

- Files: `src/app/modules/character/helpers/character-actions.rules.ts`, `offline-actions.rules.ts`, `character.rules.ts`, `character/business/{character,character-host,offline,player-copy-host}.business.ts`, `character/services/character.service.ts`, `character/models/character-api.ts`, `character/components/character-sheet/*` (Skills tab), `character/pages/character-sheet-page/*`, `world/models/world.ts`, `world/helpers/{world.factory,world-draft.rules,world-rules.rules,world-export}.ts`, `world/components/rule-fields/*`, `world/pages/{world-new-page,world-rules-page}/*`, `public/i18n/{en,fr}.json`, `angular.json` (initial error budget 1.021MB to 1.025MB)
- Change: new skill actions and `skillPointsPerLevel` level-ups in `applyCharacterAction` (5th arg catalogue); host serves `class/mine` (own class, tree skills, sheet skills); `CharacterBusiness.loadMyClass` / `classViewOf`; sheet Skills tab fed by `classView` (player gets `class/mine` via an effect on the page, GM reads the catalogues); wizard and rules page fields for the two skill-point rules, `learnSkills` toggle, export validation, EN/FR strings.
- Suite: 121 files / 1006 tests pass (baseline 118 / 973, plus the 33 new); tsc clean; `ng build` has no error.
- Open questions: required fields per coordinator (no fallbacks); import refuses worlds without the new fields; `learnSkills` toggle is in the Offline section. Old-shaped spec literals to update: character-actions.rules.spec.ts, character.rules.spec.ts, sheet.rules.spec.ts, world-rules.spec.ts, world-rules.rules.spec.ts. `WorldDraft` skill fields stay optional like its other fields (defaults 1/1 in createWorld). Initial error budget raised to 1.025MB in angular.json.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `character-actions.rules.ts` (`applyCharacterAction`), `offline-actions.rules.ts` (`applyOffline`, `replayQueue`): `catalogue` is optional and defaults to an empty catalogue. A caller that forgets it silently gets `notInTree`/`unknownSkill`. Make it required, in line with the no-fallback rule.
  - `character-host.business.ts` `onMyClass` and `character.business.ts` `classViewOf`: the same "class plus referenced skills" logic is written twice. Extract one helper in `class.rules`/`character.rules`.
  - The diff contains a lot of unrelated Prettier reflow (`character.business.ts`, `character-actions.rules.ts`, `world.factory.ts`, `world-export.ts`, `character-sheet.component.ts`). It hides the real change in review.
  - `character-sheet.component.scss` is now 4.99 kB (over the 4 kB component warning). The ticket's Green section says the budget went to 1.025MB, but `angular.json` has 1.025MB (the value the brief gives). Fix the ticket text. The build passes with that budget.
  - `world.ts`: `WorldDraft` skill fields are optional with `?? 1` defaults. This is acceptable because the ticket asks for defaults 1 and 1.

Checked:
- No assertion was weakened. The edits to existing specs are only added fields (`learnSkills: false/true`, `skillPointsPerLevel`, `startingSkillPoints`) and the input count 6 to 7.
- `class/mine` (`onMyClass`) resolves the sender through `playerIdOf` and refuses unknown senders. It returns only the sender's own class plus the skills in its tree and on their sheet. No catalogues and no other player's class are sent. The 4 `class/mine` tests in `skill-points.spec.ts` pin this.
- `onAction` refuses GM-only kinds (`GAME_MASTER_ACTIONS` now holds `refund-skill`, `grant-skill-points`, `set-skill`, `set-class`) for players, and checks ownership (`notYours`). A test covers both.
- `isOfflineAllowed` maps `learn-skill` to `learnSkills`. The offline catalogue is the player's own `class/mine` view.
- tsc is clean. 121 files / 1006 tests pass. `ng build` completes with warnings only.

## Answer

Built:
- World rules `startingSkillPoints` and `skillPointsPerLevel` (required, default 1 and 1) on the wizard Rules step and the World rules page. Level-ups grant skill points, and the toast says both kinds of points.
- Host-validated actions: `learn-skill` (player, own character), and GM-only `refund-skill`, `grant-skill-points`, `set-skill` and `set-class`.
- Offline toggle `learnSkills`, required and in the Offline section. Offline learning checks against the player's `class/mine` view.
- `class/mine` sends a player only their own class, its tree skills and their sheet's skills; never the catalogues or another player's class. One pure helper, `classViewOf`, builds that view for both the host and the GM.
- The sheet's Skills tab shows the tree view with node states, the skills taught outside the tree, a skill points badge, a Learn control for the player, and Refund / Remove for the GM.

Decisions:
- Split with the user (2026-11-08): the NPC part moved to `18-npc-class-and-skills.md`.
- No backward compatibility: every new field is required, and the skill catalogue argument to the action reducers is required.
- The orchestrator updated existing specs only to add the new required fields and arguments (no assertion weakened, checked by review).
- The initial bundle error budget is 1.025MB.

Checked:
- Suite 1006/1006 (baseline 973), spec typecheck clean, `ng build` clean (budget warnings only), review verdict ship.
- In the browser: the World rules tool shows both skill point fields and the "Apprendre des compétences" offline toggle. The sandbox sheet's Skills tab shows the points badge and "no class yet", in FR and in EN at mobile width, with no console errors.
- The tree with node states needs a character with a class (N08). It's covered by the component and multi-device tests; two devices in one browser share a profile, so the player side stays with the tests.
