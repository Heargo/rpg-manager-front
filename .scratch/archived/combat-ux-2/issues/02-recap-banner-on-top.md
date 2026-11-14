# Recap banner above the dice screen, with bubbles

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Bugs: banner under the dice screen; Improvements: prettier recap). D03 was merged into this ticket (same component).

- The banner stays visible above the dice overlay and its backdrop, on the table page (GM and player) and in the sandbox, desktop and mobile.
- Layout: caster bubble → target bubbles (portrait or initial; enemies ringed like the grid), then dice and total and the outcome. Names as `title` and accessible labels. `SharedRoll.combat` may need portrait ids and sides (no hidden attributes).

## Decisions (orchestrator)

- **On top**: the banner sits above the dice overlay and its backdrop (z-index higher than the overlay's, same stacking context: the banner is fixed to the viewport, not inside a lower stacking parent).
- **Bubbles**: `SharedRoll.combat` gains `caster: { name; side; portraitId? }` and `targets: { name; side; portraitId? }[]` (replacing `casterName`/`targetNames`; no backward compatibility). Portrait ids are already public on the combat view; no attributes.
- Banner layout: caster bubble → arrow → target bubbles (up to 4 shown, then "+N"), then a separator, the skill name, the dice and total, the outcome. A bubble is a round portrait or initial, enemies ringed in the danger colour like the grid tokens; `title` and `aria-label` carry the name. One line on desktop; on mobile it wraps to two lines (bubbles, then skill · dice · outcome).
- `CombatRollsBusiness.$banner` exposes `caster` and `targets` instead of names.

## Baseline

Test Files 244 passed, Tests 2143 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session.

## Seams

1. **Combat over the fake peer network** (`combat.spec.ts`): the shared roll's `combat.caster` and `combat.targets` carry name, side and portrait id (no attributes) on every device. Misses: UI.
2. **`CombatRollsBusiness`**: `$banner` exposes caster and targets. Misses: UI.
3. **Component** `app-combat-roll-banner` (`TEST_PROVIDERS`): a bubble per caster and target (`data-testid="banner-bubble"`, `data-role="caster|target"`, `data-name`, enemy ring via `data-enemy`), portrait or initial, "+N" beyond 4 targets, names in `title`/`aria-label`; the banner host's computed z-index is above the dice overlay's (both read from the same constant or CSS variable). Misses: real stacking and layout (browser).

## Red

- Test files: `src/app/modules/combat/business/combat.spec.ts`, `src/app/modules/combat/business/combat-rolls.business.spec.ts`, `src/app/modules/combat/components/combat-roll-banner/combat-roll-banner.component.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (each file)
- Migrated to the new contract (`casterName`/`targetNames` -> `caster`/`targets`), same checks kept: combat.spec "publishes one shared roll per skill use..." and "shows a hidden NPC roll..." (the exact-keys check now lists `caster`/`targets`, and every caster/target has only `name`, `side`, `portraitId`); combat-rolls.business.spec "shows who, which skill and the targets on every device..."; banner component spec "names the caster, the skill and the targets on another player device..." (caster/targets now read from the bubbles' `data-role`/`data-name`).
- Failing: 10 tests
  - combat.spec: publishes one shared roll per skill use... — `combat.caster`/`combat.targets` missing (still names)
  - combat.spec: shows a hidden NPC roll... — same, plus caster `portraitId: 'portrait-orc'` not shared
  - combat-rolls.business.spec: shows who, which skill and the targets... — `$banner()` still returns `casterName`/`targetNames`
  - banner spec: names the caster, the skill and the targets... — no `banner-bubble` elements
  - banner spec (bubbles): initial without portrait + title/aria-label — no bubble
  - banner spec (bubbles): portrait (`app-stored-image`) when portraitId — no bubble
  - banner spec (bubbles): rings enemies only (`data-enemy`) — no bubble
  - banner spec (bubbles): 4 targets then "+2" — no bubbles/`banner-more`
  - banner spec (bubbles): no "+N" with 4 targets — no bubbles
  - banner spec: sits fixed above the dice overlay — host has no `position: fixed` / z-index > 1200

## Green

- Files: src/app/modules/combat/components/combat-roll-banner/combat-roll-banner.component.ts, src/app/modules/combat/business/combat-rolls.business.ts, src/app/modules/combat/helpers/combat-roll.rules.ts, src/app/modules/combat/business/combat-host.business.ts, src/app/modules/dice/models/dice-api.ts, src/app/modules/dice/components/dice-overlay/dice-overlay.component.ts, src/app/modules/tools/business/sandbox-combat.business.ts, src/app/modules/table/pages/table-page/table-page.component.{html,scss}
- Change: `SharedCombatRoll` now carries `caster`/`targets` (name, side, portraitId from the world's character or NPC). The banner shows caster bubble, arrow, up to 4 target bubbles and "+N", then skill, dice and outcome. Enemies get a red ring. The host is `position: fixed` with z-index `COMBAT_BANNER_Z_INDEX` (1300) over `DICE_OVERLAY_Z_INDEX` (1200), both in dice-api.ts. This covers table GM and player and the sandbox. The table page's own fixed positioning was removed. Under 640px the skill, dice and outcome wrap to a second line (CSS only, not checked in a browser).
- Suite: 244 files / 2149 tests passed (baseline 2143, +6 new). tsc clean, ng build OK. No i18n key added.
- Open questions: none

## Review

- Verdict: ship. The shared roll carries only name, side and portrait id, all already public in the combat view. Banner z-index 1300 above the overlay's 1200 (both constants in `dice-api.ts`), fixed, no trapping ancestor.
- Applied after the browser check (no test change): the banner was fixed at the very top, over the nav bar; it now sits at `top: 4rem`, just under it.
- Consider (not applied): the dice model imports `CombatSide` from combat (type-only dependency); portrait lookup duplicated with `combat-view.rules.ts`; an unknown id falls back to side `enemy`.

## Answer

- `SharedCombatRoll` carries `caster` and `targets` (name, side, portrait id) instead of names; `CombatRollsBusiness.$banner` follows.
- `app-combat-roll-banner`: caster bubble → target bubbles (portrait or initial, enemies ringed, "+N" beyond 4), then skill, dice, total and outcome; names in `title`/`aria-label`. Fixed under the nav bar, above the dice overlay (`COMBAT_BANNER_Z_INDEX` 1300 > `DICE_OVERLAY_Z_INDEX` 1200), on the table page (GM and player) and the sandbox; wraps to two lines under 640 px.
- Tests: 6 new, 4 moved to the new contract. Suite 244 files, 2149 tests pass (baseline 2143). Build clean.
- Browser: sandbox FR desktop: during the 3D roll the banner (Y → G ringed, "Trait arcanique") is the top element over the overlay, at y=64 under the nav; after landing "20 = 20 Réussite". EN mobile: two lines (bubbles, then "Arcane Bolt 2 = 2 Failure"), no horizontal scroll. No console error.
