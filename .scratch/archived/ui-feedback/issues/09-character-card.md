# Character card and details layout

Status: resolved
Type: task
Blocked by: 07, 08

Spec: `../spec.md` (Character sheet).

Card-shaped character summary (name, money, stat points, level) with the details section beside it (below on mobile). Used on the sheet page and the sheet tool.

## Baseline

`npm test`: 91 test files, 679 tests, all passed (2026-11-08, `develop` at 7eefaa7).

## Design (user, 2026-11-08)

- **Card**, portrait ratio, trading-card format (not its art), using the app's tokens:
  - a title band with the name and the level badge;
  - a portrait window (portrait or initial fallback);
  - a framed text box with money (`app-coin-display`), stat points (badge) and the XP bar ("xp / next");
  - a bottom strip with the bar attributes (life and mana, current / max);
  - a thin outer frame, with a rarity-like accent colour from the theme.
- **Details** (the existing Stats, Equipment and Inventory tabs, with GM controls) sit beside the card on desktop and below it on mobile.
- Used by the sheet page and the sheet tool.

## Seams

Confirmed with the user (2026-11-08):

1. **`app-character-card`** (`TEST_PROVIDERS`): shows the name, level, money, stat points, XP progress and bars; it has no GM controls (those stay in the details).
2. **Sheet layout** (component test): the card and the details both render; existing sheet tests stay green. The layout is checked in the browser at 1280 and 375 px.

## Red

- Test files: `src/app/modules/character/components/character-card/character-card.component.spec.ts` (new), `src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts` (one test added)
- Run: `npx ng test --watch=false --include src/app/modules/character/components/character-card/character-card.component.spec.ts` and `... --include src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts`
- Contract: `CharacterCardComponent` (`app-character-card`, file `character-card.component.ts`) with inputs `character` and `world`; testids `card-name`, `character-level`, `card-portrait`, `card-stat-points`, `xp-progress` (p-progressbar), `xp-text`, `card-bars`; no buttons or GM inputs. Sheet wraps the tabs in `[data-testid="character-details"]`, the card outside it. Bars expected "6 / 10" and "4 / 5".
- Failing: 8 tests
  - card spec (7: name and level, initial fallback, money, stat points, XP progress and text, life and mana bars, no GM controls) — whole file fails to compile, `./character-card.component` does not exist
  - sheet spec: renders the character card beside the details, not inside them — no `app-character-card` in the sheet
- The other 19 sheet tests still pass.

## Green

- Files: `src/app/modules/character/components/character-card/character-card.component.{ts,html,scss}` (new); `src/app/modules/character/components/character-sheet/character-sheet.component.{ts,html,scss}`
- Change: new `app-character-card` (5:7 card with a thin primary-colour frame, a title band with name and level, a portrait window with an initial fallback, a text box with money, stat points and XP, and a life/mana strip). The sheet renders it in a sticky 18rem left column and wraps the tabs in `[data-testid="character-details"]`. Below 52rem it stacks, centred, max 20rem. The duplicated header (name, money, stat points, XP, bars) is gone from the details; "played by" stays there. The sheet page and the sheet tool both use `app-character-sheet`, so both get the card. No new i18n keys (existing ones reused).
- Suite: card spec 7/7 and sheet spec 20/20 pass. `ng build` is clean. The full `npm test` and `tsc -p tsconfig.spec.json` fail only on the parallel agent's red specs (`formula.spec.ts`, `level.rules.spec.ts`: missing `checkAttributeFormula`, `previewMax`, `checkLevelCurve`). With those and the world-draft/export specs excluded: 88 files, 609 tests, all pass. No test file in the unstaged diff. Not checked in the browser at 1280 and 375 px.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - character-card.component.html:3 — the sheet lost its only `<h1>` (name); the card uses `<h2>`, so the page may have no h1 — keep h2 only if the host page supplies an h1, otherwise make the card name a heading level the host can set.
  - character-card.component.html:12 — portrait alt is the name, and the initial fallback is plain text with no aria; fine, but the `<article>` has no accessible name (`aria-labelledby` on the name would help).
  - character-card.component.html:35 and .ts — the bars/XP logic moved cleanly, but the sheet spec only checks the card is present; GM controls (`grant-xp`, `grant-points`) are unchanged inside `character-details`, and "played by" is kept there for GM and player. Nothing from the old header is missing (name, level, money, stat points, XP, bars all in the card).
  - character-sheet.component.ts — `StoredImageComponent` and `BadgeModule` are still used (item dialog, tab badges); no dead imports left.
  - The card is not shown dimmed or labelled for screen readers as "character card"; low priority.

## Answer

- **`app-character-card`** (`character/components/character-card/`), a 5:7 card with a thin primary frame:
  - a title band with the name (h2, which names the card for screen readers) and the level tag;
  - a portrait window, with the portrait image or a large initial;
  - a text box with money (`app-coin-display`), stat points (badge) and the XP bar "xp / next";
  - a strip with the life and mana bars.

  It has no GM controls.
- **Sheet:** the card sits in a sticky 18rem left column with the tabs (`character-details`) to its right; below 52rem it stacks on top, centred, max 20rem. The duplicated header (name, money, stat points, XP, bars) is removed from the details; "played by" and the GM controls stay there. The sheet page and the sheet tool both get it.
- **Checked:**
  - card spec 7/7, sheet spec 20/20, character component specs green;
  - browser at 1280 px: the card in the left column beside the tabs;
  - browser at 375 px: the card on top, no horizontal scroll, no console error.
- **Left as Consider:** the page's h1, since the card uses an h2 (both host pages have their own h1).
