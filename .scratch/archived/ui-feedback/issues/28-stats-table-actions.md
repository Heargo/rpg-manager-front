# Stats table: no Base column, no free input; + to spend, − for the GM, details in a tooltip

Status: resolved
Type: task
Blocked by: 27

User request (2026-11-08): « pour le tableau des stats, supprime la colonne base et supprime l'input libre, garde que le + pour ajouter des stats (et un − si c'est l'hôte). Détaille tout dans un tooltip de la valeur ».

## Decisions (user, 2026-11-08)

- **The − (host/GM only)** removes one level from the attribute and gives the stat point back to the character (it undoes a spend). Its max drops by the formula delta, and current drops by the same delta, clamped to [0, max]. The level never goes below 0.
- **No current-value adjustment** in the UI any more (the GM's free input is gone). Current changes only through the rules (consumables, levelling). The `set-current` action may stay in the rules, but no UI calls it.

## Direction

- **Columns:** Attribut (with the bonus tag from U27), Niveau, Valeur (`current / max` as text), and actions.
- **Actions:**
  - **+** when the user can play and the character has stat points (unchanged: `spend-stat-point`, with the offline lock);
  - **−** for the GM only, when the level is above 0: a new GM-only action `refund-stat-point` (in `GAME_MASTER_ACTIONS`, so the host refuses it from players), with a translated aria-label.
- **Tooltip on the value** (`pTooltip`, multi-line), listing:
  - the base value;
  - the level;
  - the formula (preset name, or the custom expression);
  - the formula result;
  - the cap, if any;
  - the equipment bonus;
  - the max;
  - the current value.

  FR and EN.

## Tests

- **Rules:** `refund-stat-point` lowers the level by 1, gives +1 stat point, and lowers max and current by the delta; it's refused at level 0; it's GM-only (refused for a player on the wire).
- **Sheet:**
  - no Base header and no current input;
  - + for a player with points;
  - − for the GM only;
  - the value has a tooltip containing the base and the formula.

Checked in the browser at 1440 and 375 px, with no horizontal scroll.

## Green

- Files: src/app/modules/character/helpers/character-actions.rules.ts, components/character-sheet/character-sheet.component.{ts,html,scss}, public/i18n/{en,fr}.json; tests written first: helpers/character-actions.rules.spec.ts, helpers/offline-actions.rules.spec.ts, business/character-actions.spec.ts, components/character-sheet/character-sheet.component.spec.ts
- Change: new GM-only `refund-stat-point` (type, kind list, GAME_MASTER_ACTIONS, parser, reducer; level -1, +1 stat point, current shifted by the max delta and clamped; refused at level 0 or unknown attribute; the host and PLAYER_KINDS pick it up from the lists, so never offline). Sheet: Base column and GM current input removed; value is `current / max` with a multi-line tooltip (base, level, formula, result, cap if any, bonus, max, current); + for players with points, - for the GM at level > 0. `set-current` stays in the rules, no UI calls it. FR/EN strings added (refundFrom, tip.*, errors.levelZero); unused currentOf removed.
- Failing before implementation (the specs did not compile: unknown kind `refund-stat-point`, so the whole suite failed): rules spec "parses actions from the wire" (extended), 'refund-stat-point' x3 (lowers level and gives point back, keeps current in [0,max], refused at level 0/unknown); offline spec "never allows the game master actions offline" (extended); wire spec "refuses a player ... game master's actions" (extended) and "lets the game master refund a spent point"; sheet specs "no Base column and no free current input", "minus button to the GM only", "plus button to a player with points", "value tooltip with base, level, formula, ...".
- Existing tests changed: none deleted; none relied on the removed input or Base column (the sheet spec's `render` helper gained an optional `character` override, and three existing tests were extended as listed). 
- Suite: 94 files, 769 tests pass (baseline 761 + 8 new); tsc clean; ng build OK; no pre-existing test file regressions. Browser check at 1440/375 px not done.
- Open questions: none

## Answer

- **Rules:**
  - a new GM-only `refund-stat-point` (in `CHARACTER_ACTION_KINDS` and `GAME_MASTER_ACTIONS`): level −1, +1 stat point, current shifted by the max delta and clamped to [0, max];
  - refused at level 0 or on an unknown attribute (`character.errors.levelZero`);
  - the host refuses it from players, and it's never playable offline.
- **Sheet:**
  - columns Attribut (with the bonus tag), Niveau, Valeur (`current / max` as text), and actions;
  - the Base column and the GM's current input are removed; `set-current` stays in the rules, unused by the UI;
  - `+` for a player with points, `−` for the GM at level above 0;
  - a multi-line `pTooltip` on the value: base, level, formula, result, cap (when set), bonus, max, current.
- **Tests:** written first (3 rules, 1 wire, plus 3 extended, and 4 sheet). Suite 94 files, 769 tests; build OK.
- **Checked in the browser** (sandbox, where you're the GM):
  - spending a point on Vie gives level 1, "15 / 15", and the − appears;
  - the tooltip shows "Base : 10 / Niveau : 1 / Formule : Linéaire raide (5) / Résultat de la formule : 15 / Bonus : 0 / Maximum : 15 / Actuel : 15";
  - the − gives back level 0, "10 / 10", and the stat points 5;
  - no horizontal scroll at 1440 or 375 px, no console error.
