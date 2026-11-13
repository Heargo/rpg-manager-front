# Combat UI (GM panel, player view, sandbox tool)

Status: resolved
Type: task
Blocked by: 13, 07

Spec: `../spec.md` (Combat: UI).

GM combat panel (start encounter with characters and NPC counts, initiative entry, turn order with drag reorder, active row with counters / skills / items, targeting, pending results with Apply / Edit / Dismiss, manual damage / heal / status, undo, end dialog with rewards); player turn strip, "Your turn" banner, own skills in a bottom bar on mobile (pick a skill and targets, the roll appears for everyone, then "waiting for the GM"), typed initiative. Combat sandbox in Tools. List mode only: the grid is 16. Browser check in both languages and at mobile width.

## Baseline

`npm test` (2026-11-13, after N13): Test Files 186 passed (186), Tests 1524 passed (1524).

N13's review notes (player view leaks through `pending`/`log`, typed initiative in rolled mode, raw error codes) are split into `20-combat-protocol-followups.md`, not part of this ticket.

## Seams

1. **GM combat panel component** (inputs/outputs with `TEST_PROVIDERS`, over the fake peer network from `src/testing/game-device.ts` with the GM as host): start an encounter (characters + NPC counts), initiative, turn order and reorder, active row with counters / skills / items, targeting a skill, pending results Apply / Edit / Dismiss, manual damage / heal / status, undo, Next turn, end dialog with rewards. Catches: the GM flow end to end against the real `CombatBusiness`. Misses: drag gestures themselves (reorder goes through the component's output/handler), layout.
2. **Player combat view component** (same setup, a player device): turn order strip, "Your turn" banner, own skills / items / counters, pick a skill and targets → roll shown → "waiting for the GM", typed initiative, skills readable outside the turn. Catches: the player flow and that only own actions are offered. Misses: mobile bottom-bar layout (browser check).
3. **Combat sandbox tool page** (component with `TEST_PROVIDERS`, the Tools route): the sample character against catalogue enemies on the sandbox world, GM and player views on one screen, without a room. Catches: the Tools entry works with no game. Misses: anything beyond wiring.

## Red

- Test files: `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts`, `src/app/modules/combat/components/combat-player-view/combat-player-view.component.spec.ts`, `src/app/modules/tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.spec.ts`; shared fixture `src/testing/combat-table.ts` (GM + Ada + Bob room, `mount()` renders a component on a device injector). The data-testid / data-action contract of each component is in the header comment of its spec.
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (per file)
- Failing: 27 tests; all fail on the missing components (`CombatGmPanelComponent`, `CombatPlayerViewComponent`, `CombatSandboxToolPageComponent` do not exist) and the missing `tools/combat` route. Checked against empty stub components: every test then fails on its own assertion, the fixture is sound.
  - GM panel (14): starts an encounter from the characters picked and an NPC count; shows the turn order with active row, life bar, initiative, statuses and round; types an initiative; reorders by hand (`reorder(ids)`); expands the active row with counters / skills / items and ticks a counter; uses an item; picks a skill and target, lists the pending result and greys the skill out; applies a pending result; edits the amount then applies; dismisses a pending result; manual damage / heal / status; marks a combatant at 0 life as down; undo and next turn; end dialog with proposed rewards then confirm.
  - Player view (10): turn order strip; "Your turn" only on own turn; ends own turn; own skills / items / counters only; skills readable outside the turn; no GM controls; ticks a counter and uses an item; picks skill and target, roll shown, waiting for the GM; stops waiting after apply; typed initiative.
  - Sandbox page (3): is a Tools route (`tools/combat`); shows GM and player views without a game; starts Yusica against "Cave goblin" seen from both views.

## Green

- Files: `src/app/modules/combat/components/{combat-gm-panel,combat-player-view,combat-actions}/` (new components), `src/app/modules/combat/helpers/{combat-targeting,combat-skill-summary}.rules.ts` (new), `src/app/modules/combat/business/combat.business.ts`, `src/app/modules/combat/models/combat.ts`, `src/app/modules/combat/helpers/{combat.rules,combat-view.rules}.ts`, `src/app/modules/tools/business/sandbox-combat.business.ts`, `src/app/modules/tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.ts`, `src/app/modules/tools/tools.routes.ts`, `src/app/modules/table/pages/table-page/table-page.component.{ts,html}`, `public/i18n/{en,fr}.json`
- Change: GM panel (start form, turn order with cdk drag reorder, active row, pending Apply/Edit/Dismiss, manual damage/heal/status, undo/next turn, end dialog) and player view (strip, "Your turn", own skills/items/counters, roll, waiting for the GM, typed initiative) share `app-combat-actions` (counters, skill targeting, items). `CombatBusiness` gained read-side members (`$encounter`, `$characters`, `$npcs`, `$skills`, `$initiativeMode`, `skillSummary`, `availability`, `itemsOf`, `rewards`, `loadSkills`, `describeError`). Protocol additions: `skillName` on pending/log skill entries, `initiativeMode` and per-combatant `characterId` in `CombatView` (a player needs them to name a roll, know typed mode, find their own combatant). Sandbox tool page provides an in-memory `SandboxCombatBusiness` as `CombatBusiness`; route `tools/combat`; GM panel in the GM table scene panel, player view in the player side card.
- Suite: 189 files / 1551 tests pass (baseline 186 / 1524, plus the 27 new tests); tsc clean; `ng build` OK (only the existing budget warnings).
- Open questions: the Tools menu entry is NOT added: `menu.service.spec.ts` and `nav-bar.component.spec.ts` pin the exact tool lists, so adding `nav.combat` (icon `pi pi-shield`, `/tools/combat`, in `nav-bar.component.ts` TOOLS and `menu.service.ts`) fails 2 existing specs; decide whether those two specs get updated, then add the entry plus the `nav.combat` key in EN/FR. Browser check (both languages, mobile width, bottom bar for own skills on mobile) not done; mobile bottom-bar layout is not implemented yet.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - .scratch/npcs-skills-combat/issues/14-combat-ui.md:37 — Green "Open questions" is stale: the Tools entry and the two pinned specs are now done, and the mobile bottom bar exists in `combat-player-view.component.ts` (media query). Update it; the browser check (EN/FR, mobile width) is still pending.
  - combat-gm-panel.component.ts:269, combat-player-view.component.ts:253, combat-actions.component.ts:~315, combat-sandbox-tool-page.component.ts — the same try/catch + error toast is repeated four times; move it to a small helper or a business method.
  - combat-gm-panel.component.html:288 — the status field is a native `<input pInputText>`; allowed (pInputText is the rules' text control), just noting `$any($event.target)`.
  - sandbox-combat.business.ts — re-implements much of `CombatBusiness` (change/apply/useItem); acceptable stand-in, but any new business member must be mirrored (the `CombatTable` type enforces it at compile time).
  - combat.business.ts `$characters`/`$skills` return `[]` on a player device until loaded; fine, but `loadSkills` swallows errors silently in the player view.
- Checked: spec items covered, protocol additions (`skillName`, `initiativeMode`, `characterId`) expose nothing beyond what the view already shows; no secrets; tsc clean; full suite 189 files / 1551 tests pass.

## Answer

Built the GM combat panel (`combat-gm-panel`), the player view (`combat-player-view`) and their shared actions block (`combat-actions`: counters, skill targeting, items), plus `combat-targeting.rules.ts` and `combat-skill-summary.rules.ts`. The GM panel sits in the GM table's scene panel and the player view in the player's side card. The combat sandbox is at `tools/combat` (Tools menu entry "Combat"), on an in-memory `SandboxCombatBusiness` provided as `CombatBusiness`. List mode only.

Decisions: protocol additions `skillName` on pending/log entries, `initiativeMode` and per-combatant `characterId` in `CombatView` (the player needs them; they expose nothing the view didn't already show). The two specs pinning the Tools list gained one line each for the new entry. On mobile (≤960px) the player's own actions are a fixed bottom bar on the table; `CombatPlayerViewComponent.docked` is off in the sandbox so the bar doesn't cover the GM panel there. The Green block's "Open questions" above are stale: the Tools entry and the bottom bar were done afterwards.

Checked: 27 new tests; full suite 189 files / 1551 tests (baseline 186 / 1524); `ng build` clean; review verdict ship. Browser, on `/tools/combat`: FR desktop (start, next turn, player uses a skill → roll shown and "waiting for the GM" → GM applies, life 10 → 6), EN at 375px (translated, no horizontal scroll, bottom-bar overlap found and fixed through green, rechecked), no console errors. The two-device room flow stays covered by the fake-network tests, not the browser (one browser shares one profile).

Left: using a skill doesn't tick an action counter (skills carry no action type), added to `20-combat-protocol-followups.md`. Review "Consider" lines (repeated try/catch + toast in four places, silent `loadSkills` errors) not done.
