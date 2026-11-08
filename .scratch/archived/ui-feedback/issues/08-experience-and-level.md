# Experience points and character level

Status: resolved
Type: task
Blocked by: 07

Spec: `../spec.md` (Experience and character level (decided 2026-11-07)).

XP and level on characters, the level curve (premade + custom) in the world, GM grants XP, level-ups grant stat points, `playerLevel` in formulas.

## Baseline

`npm test`: 90 test files, 627 tests, all passed (2026-11-07, `develop` at bfa5e93).

## Rules (user, 2026-11-07)

- Characters start at **level 1 with 0 XP**.
- Only the **GM grants XP**, like stat points: the host refuses a player's request (`forbidden`).
- Each level gained grants **`statPointsPerLevel`** stat points, a world setting (default 3).
- `playerLevel` in attribute formulas (U07) is this level, so a level-up can raise maxima; current rises by the same delta, as with spending a point.
- **The level curve** gives the XP cost of each level-up (from level L−1 to L), chosen per world:

| Preset | Cost of reaching level L | Levels 2, 3, 4, 5, 6 |
| --- | --- | --- |
| Flat | `100` | 100, 100, 100, 100, 100 |
| Growing (default) | `100 * level` | 200, 300, 400, 500, 600 |
| Steep | `round(100 * 1.5^(level - 2))` | 100, 150, 225, 338, 506 |
| Classic tabletop | fixed table, then +50 % per level | 300, 600, 1800, 3800, 7500, then 11250… |
| Custom | an expression in `level` (U07's safe parser, only `level` allowed) | — |

(Note: "Growing" is `100 * level`, so reaching level 2 costs 200.) The UI label is "Classic tabletop", with no trademark. Costs are integers of at least 1; an invalid Custom curve blocks the wizard and is rejected on import.

## Seams

Confirmed with the user (2026-11-07):

1. **`level.rules.ts`** (pure): the level and progress to the next level for a given XP; levels gained and stat points granted by a grant; curve validation and evaluation (safe parser, only `level`). Catches the maths; misses the wire.
2. **GM-only `grant-xp` over the fake peer network** (`game-device`): the GM grants XP; the character levels up and gets stat points; attribute maxima that use `playerLevel` update; a player's request is refused. Misses UI.
3. **UI** (`TEST_PROVIDERS`):
   - a curve picker in the wizard's Rules step, with a preview of the XP for levels 2 to 6, and a stat-points-per-level field;
   - the sheet shows the level and an XP progress bar (`p-progressbar`);
   - the GM has a grant XP control (amount input and button) where they grant stat points today.

   Misses layout.

## Red

- Test files:
  - new: `src/app/modules/character/helpers/level.rules.spec.ts` (imports `LevelCurve`, `levelCost`, `levelProgress`, `grantXp`, `validateLevelCurve` from `./level.rules`)
  - extended: `character/business/character-actions.spec.ts`, `character/helpers/character-actions.rules.spec.ts`, `character/helpers/character-stats.spec.ts`, `character/components/character-sheet/character-sheet.component.spec.ts`, `world/helpers/world.factory.spec.ts`, `world/helpers/world-draft.rules.spec.ts`, `world/helpers/world-export.spec.ts`, `world/pages/world-new-page/world-new-page.component.spec.ts`
  - fixtures updated for `xp: 0, level: 1`: `pick-a-save-dialog.component.spec.ts`, `offline-actions.rules.spec.ts`, `room/helpers/player-copy.rules.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30`
- Contract the tests fix (green must follow):
  - `level.rules.ts` (character/helpers): `LevelCurve = {preset:'flat'|'growing'|'steep'|'classic'} | {preset:'custom', expression}`; `levelCost(curve, level)`; `levelProgress(curve, xp) -> {level, xpIntoLevel, xpForNext, percent}`; `grantXp(curve, perLevel, xp, amount) -> {xp, level, levelsGained, statPointsGranted}`; `validateLevelCurve(curve) -> string | null`.
  - `Character.xp`, `Character.level`; `World.levelCurve`, `World.statPointsPerLevel` (defaults `growing`, 3); the same two on `WorldDraft` and `WorldInfo`; `WorldDraftErrors.levelCurve` / `.statPointsPerLevel`; export/import round-trip with errors `world.levelCurve is invalid`, `world.statPointsPerLevel must be a non-negative integer`.
  - Action `{kind:'grant-xp', amount}` in `CHARACTER_ACTION_KINDS` and `GAME_MASTER_ACTIONS`; errors `character.errors.gameMasterOnly`, `character.errors.invalidAmount`; `attributeStats` uses `character.level` as `playerLevel`; level-up raises current by the max delta.
  - Sheet: `[data-testid="character-level"]`, `p-progressbar[data-testid="xp-progress"]`, `[data-testid="xp-text"]` ("50 / 300"), GM-only `#grant-xp` input + `[data-testid="grant-xp-button"]`; sheet world input gains `levelCurve`.
  - Wizard Rules step: `select[name="level-curve"]`, `input[name="level-curve-expression"]`, `[data-testid="level-curve-preview"]`, `[data-testid="level-curve-error"]`, `#stat-points-per-level`.
- Failing: every new or changed test, because the Angular test build fails to compile (the whole `ng test` run, not just these files, is red until the types exist; the existing tests cannot pass in the meantime). Per test:
  - level.rules.spec (5 `levelCost`, 2 `validateLevelCurve` (+8 rows), 4 `levelProgress`, 4 `grantXp`) — `./level.rules` module missing.
  - character-actions.spec `grant-xp` (6 tests: starts level 1/0 XP, GM grants and levels up, several levels, `playerLevel` maxima and current delta, player refused, amount below 1) — `grant-xp` kind, `Character.level`, world `levelCurve`/`statPointsPerLevel` missing.
  - character-actions.rules.spec parse test — `grant-xp` not a kind, not in GM list.
  - character-stats.spec "uses the character level, not 0" — `Character.level` missing; stats hard-code `playerLevel: 0`.
  - character-sheet spec (3 new: level and XP bar, GM grant XP, hidden for players) — no `xp`/`level` fields, no level UI.
  - world.factory.spec (defaults assertion and "keeps the level curve") — `levelCurve`/`statPointsPerLevel` missing.
  - world-draft.rules.spec (2 tests) — draft fields and errors missing.
  - world-export.spec "round-trips the level curve and refuses an invalid one" — fields and validation missing.
  - world-new-page spec level curve (1 default, 3 presets, 1 custom) — Rules step has no curve picker.

## Green

- Files: `character/helpers/level.rules.ts` (new), `character-actions.rules.ts`, `character-stats.ts`, `character.rules.ts`, `character.business.ts`, `character-host.business.ts`, `character-sheet.component.{ts,html,scss}`, `character-sheet-page.component.ts`, `tools/business/sandbox-character.business.ts`, `tools/pages/sheet-tool-page.component.ts`, `world/models/world.ts`, `world.factory.ts`, `world-draft.rules.ts`, `world-export.ts`, `world-new-page.component.{ts,html,scss}`, `public/i18n/{en,fr}.json` (all under `src/app/modules/` unless noted)
- Change: pure level maths in `level.rules.ts`; `grant-xp` is a GM-only action (`applyCharacterAction` takes the world's curve and stat points per level as a 4th argument, raises current by the max delta); `attributeStats` feeds `character.level` as `playerLevel`; world gains `levelCurve` and `statPointsPerLevel` (draft, info, export validation); sheet shows a level badge, XP bar and "xp / next" and a GM grant XP form with a level-up toast (sheet page and tool page); wizard Rules step has the curve picker, preview, custom help and stat points per level. EN label for `world.new.create` is now "Create" (the spec looks for that exact text; FR "Créer").
- Suite: 667/668 pass in 90/91 files (baseline 627 tests, all passed). `npm run build` OK, initial bundle 971 kB (under 1.02 MB). `player-copy-guard.spec.ts` failed once in a run and passed on rerun (timing).
- Open questions:
  - Stale red fixtures (test files I may not edit): `character/helpers/character.rules.spec.ts` "creates a character from the world defaults" needs `xp: 0, level: 1` in its `toEqual` (the single remaining failure); `room/helpers/player-copy.rules.spec.ts` line ~21 (`shuffled` object cast `as Character`) needs `xp: 0, level: 1` or the whole Angular test build and `tsc -p tsconfig.spec.json` fail with TS2352. I patched that line only temporarily to run the suite, then restored it, so `tsc` and `ng test` are red until the red step fixes it.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `level.rules.ts:23` — the doc comment "Cost of levels 2 to 6 of the classic table…" now sits above `INVALID`, not `CLASSIC_TABLE` — move it down.
  - `character-actions.rules.ts:95` — `applyCharacterAction` silently defaults to the Growing curve and 3 points when the 4th argument is missing; `offline-actions.rules.ts:56,184` rely on that. Safe today because `grant-xp` is a GM action and never reaches offline replay (`PLAYER_KINDS` excludes it, `FEATURE_OF` has no entry). Make the argument required, or add a test that a queued `grant-xp` is refused.
  - Untested guards: `MAX_GRANTED_XP` (1e6, so a 1e12 request is rejected as `invalidAmount`) and `MAX_LEVEL` (100, which bounds the `levelProgress` loop). `grantXp` with 1e12 on Flat does terminate (at most 100 iterations), but nothing pins it. Add one rule test each.
  - `world-export.ts:93` — an imported character's `xp`/`level` are only checked as numbers. Negative, fractional or `level: 0` values are accepted. Require integers, `xp >= 0`, `level >= 1`.
  - `validateLevelCurve` checks levels 2 to 50 while the cap is 100. A custom curve that breaks only above level 50 falls back to a cost of 1. Check up to `MAX_LEVEL`.

### Focus answers
- Host: `onAction` refuses `grant-xp` from any non-`SELF_PEER` sender with `forbidden`/`gameMasterOnly` before the held check. The payload goes through `parseCharacterAction` (integer) and the cap. Correct.
- Custom curve: validated in the wizard (`validateWorldDraft`) and on import (`isValidLevelCurve`). Whitelisted words only, integer costs of at least 1 (rounded, minimum 1). Correct.
- Level-up delta: current changes by `stat.max - old.max`, clamped to `[0, max]`, and only when the max changed. Correct.
- `world.new.create` ("Create"): its only use is `world-new-page.component.html:260`. No other file or spec used "Create the world".
- Flaky `player-copy-guard.spec.ts`: this change doesn't touch it. The test at line 154 uses a real `setTimeout(400)`, which already existed and is the likely source of the timing flake. Not introduced here.

### Green, review fixes

- Files: `world-export.ts`, `character-actions.rules.ts`, `offline-actions.rules.ts`, `level.rules.ts`; tests added in `world-export.spec.ts`, `level.rules.spec.ts`, `character-actions.rules.spec.ts`.
- Change: imported `xp` must be an integer >= 0 and `level` an integer >= 1; `applyCharacterAction`'s `levelRules` is now required (offline apply/replay pass an explicit `NO_XP_RULES`, unreachable since `grant-xp` is refused offline); `validateLevelCurve` checks up to `MAX_LEVEL`; classic-table comment moved. Tests: 1e12 XP refused, huge flat grant stops at `MAX_LEVEL`, import refusals. In `character-actions.rules.spec.ts` the existing calls go through a small wrapper that supplies the growing curve and 3 points per level (import renamed), since the argument is now required.
- Suite: 679/679 pass (91 files), `tsc` clean, build OK (971 kB initial).

## Answer

- `character/helpers/level.rules.ts`:
  - the level curves (flat, growing, steep, classic tabletop, custom on U07's safe parser with only `level`);
  - `levelCost`, `levelProgress` and `grantXp`;
  - caps: `MAX_GRANTED_XP` 1e6, `MAX_LEVEL` 100;
  - `validateLevelCurve`, checked up to `MAX_LEVEL`.
- `Character.xp` and `Character.level`: start at level 1 with 0 XP.
- `World.levelCurve` and `statPointsPerLevel`: default growing, 3 points per level.
- `grant-xp`: a GM-only action, enforced by the host. Each level gained grants stat points, and attribute maxima using `playerLevel` update, with current rising by the same delta.
- Import requires integers: `xp` of at least 0 and `level` of at least 1. Offline replay can't grant XP.
- UI:
  - the wizard Rules step has the curve picker with a preview of levels 2 to 6, custom help, and stat points per level;
  - the sheet shows a level badge and an XP bar "xp / next";
  - the GM has a grant XP form next to grant stat points, with a level-up toast.
- Checked:
  - Suite 91 files, 679 tests (baseline 90 / 627). Build OK, initial bundle 971 kB.
  - Browser, sandbox sheet: level 1 with "0 / 200"; granting 500 XP gives level 3, "0 / 400", stat points 5 to 11, and the toast "Niveau 3 ! +6 points de stats".
- Notes:
  - The orchestrator added `xp` and `level` to two fixtures the red step missed.
  - The EN label `world.new.create` is now "Create".
  - `player-copy-guard.spec.ts` can flake: a real 400 ms timer, from before this ticket.
