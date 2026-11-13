# Character details: icon tabs, all visible

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- The character details tabs (stats, equipment, inventory, skills, notes…) show icons instead of text, with a tooltip and an aria-label, and all fit without horizontal scroll from 320 px wide.

## Baseline

Test Files 130 passed, Tests 1119 passed.

## Seams

1. **Character details component (where the tabs live; `TEST_PROVIDERS`)**: each tab shows an icon, has an aria-label and tooltip with the translated name (EN/FR), and no visible text label; every tab is still reachable and shows its panel. Misses: fit at 320 px (browser check at mobile width).

## Red

- Test files: `src/app/modules/character/components/character-sheet/character-sheet-tabs.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/character/components/character-sheet/character-sheet-tabs.spec.ts`
- Failing: 6 tests
  - shows four tabs, each with an icon and no text label — tabs have no `i.pi` icon and still show text
  - labels each tab with its translated name (EN) — no `aria-label` on `p-tab`
  - gives each tab a tooltip with its translated name (EN) — no `pTooltip` on the tabs
  - translates the aria-labels and tooltips in French — no aria-label/tooltip
  - still opens the equipment panel from its icon tab — `p-tab[aria-label="Equipment"]` does not exist yet
  - still opens the skills panel from its icon tab — `p-tab[aria-label="Skills"]` does not exist yet
- Note for green: `character-sheet.component.spec.ts` (equipment helper) and `character-sheet-skills.spec.ts` find tabs by `textContent` ("Equipment", "Skills"); they will break once text labels go and must switch to `p-tab[aria-label=...]`. Tab tooltip is read via `Tooltip.getOption('tooltipLabel')`, so the tooltip must be a plain translated string on `pTooltip`. Fit at 320 px is a browser check.

## Green

- Files: src/app/modules/character/components/character-sheet/character-sheet.component.html, character-sheet.component.scss; tab-finding helpers only in character-sheet.component.spec.ts and character-sheet-skills.spec.ts
- Change: the four tabs are icon-only (chart-bar, shield, briefcase, bolt) with aria-label and pTooltip from the existing translated tab keys; badges kept. SCSS gives tabs compact padding and equal flex width for 320 px (browser check still needed). The two older specs now find tabs with `p-tab[aria-label=...]`, no assertion changes.
- Suite: 131 files / 1125 tests pass (baseline 130 / 1119); tsc clean; ng build OK.
- Open questions: none

## Answer

Icon-only tabs (chart-bar, shield, briefcase, bolt) with aria-label and tooltip; badges kept. Browser at 320 px: the four tabs fit, no horizontal scroll. Also in this commit: the nav Close the world button keeps only its icon under 640 px (it wrapped on two lines). Seen but not in scope: at 320 px the stats table + buttons and the reward inputs are cramped.
