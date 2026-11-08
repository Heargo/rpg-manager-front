# Only bar attributes have a current value; the others are their max

Status: resolved
Type: bug
Blocked by: 07, 28

User report (2026-11-08): « certaines stats comme la vie ou la mana ont des max et des valeurs différentes, et d'autres comme l'agilité, le max = la valeur (car ce n'est pas une barre de vie). Il faut corriger ça. »

This replaces the U07 rule "every attribute has current ≤ max": a current value separate from the max now exists only for the world's **bar attributes** (`barAttributes.life` and `.mana`).

## Rules

- **`attributeStats`:** for a non-bar attribute, `current` is always its `max` (formula result, capped, plus the equipment bonus), whatever is stored. Bar attributes keep today's behaviour: current is stored, clamped to [0, max], and moves with level-ups, spends and refunds by the max delta.
- **Consumables (`use`):** add to a bar attribute's current, capped at max as today. A modifier on a non-bar attribute has no lasting effect (current is its max), and the item is still used. Don't change item generation.
- **`set-current`:** refused for a non-bar attribute (`character.errors.notABar`).
- **Stored data:** characters keep a `current` field for every attribute (no model change needed), but it is ignored for non-bar attributes. No backward compatibility concerns.

## UI

- **Stats table, Valeur column:**
  - bar attributes show `current / max`;
  - non-bar attributes show only the value (the max).
- **Tooltip:** omits the "Actuel" line for non-bar attributes.
- **Card:** the life and mana bars on the card are unchanged.

## Tests

- **Rules:** a non-bar attribute's current equals its max, even after a spend, a refund, equipping gear, or with a stale stored current. Bar attributes still have current below max after a hit and rise by the delta.
- **Sheet:** Agility shows "1" (no "/"), Life shows "10 / 10"; the tooltip for Agility has no "Actuel".

## Green

- Files: src/app/modules/character/helpers/{character-stats,character-actions.rules,offline-actions.rules}.ts, business/{character,offline,player-copy-host}.business.ts, components/character-sheet/character-sheet.component.{ts,html}, public/i18n/{en,fr}.json (`character.errors.notABar`); specs: character-stats, character-actions.rules, offline-actions.rules, character-actions (business), character-sheet.component.
- Change: `attributeStats(attributes, character, barAttributes)` sets `isBar` and forces `current = max` for non-bars. `LevelRules` carries `barAttributes` (world and sandbox pass the whole world; `applyOffline` and `replayQueue` take it as a last argument). `set-current` is refused with `notABar`; `use` skips non-bar modifiers (item still consumed). Sheet shows `current / max` for bars and the max alone otherwise; the tooltip drops the Current line for non-bars.
- Red (new tests, failed before the implementation; at first as type errors, since the new signature did not exist): stats "flags bar attributes", "gives a non-bar attribute its max whatever is stored", "adds the equipment bonus to a non-bar current", "treats every attribute as a non-bar when the world has no bars"; rules "a non-bar current equals its max after a spend, a refund and equipping gear", "a bar attribute stays below max...", "refuses set-current on a non-bar attribute", "uses a consumable on a non-bar attribute without lasting effect"; sheet "shows only the value for a non-bar attribute..." and "leaves the current line out of the tooltip...".
- Existing tests changed: stats "adds points and equipped modifiers" (expects `isBar: true`); stats "caps the current value" (non-bar Strength with stored -4 is now its max 2, not 0); rules "raises max and current by the same delta" (Wit is declared a bar in the spec's rules, it was a non-bar); rules refund "keeps current within [0, max]" (now on Life, a bar; Strength can no longer hold a lower current); business character-actions spec (the test world now declares life and mana bars, otherwise set-current and use on them are refused). Other calls only got the new `barAttributes` argument.
- Suite: 94 files, 779 tests pass (baseline 769 + 10 new). `tsc` clean, build OK, no unrelated test file touched.
- Open questions: none (prettier left untouched files alone; several of them were already unformatted).

## Answer

- **`attributeStats(attributes, character, barAttributes)`:** sets `isBar`, and forces `current = max` for non-bar attributes. `LevelRules` carries `barAttributes`, so the host and the sandbox pass the world; `applyOffline` and `replayQueue` take it as a last argument.
- **Actions:**
  - `set-current` on a non-bar is refused (`character.errors.notABar`, EN and FR);
  - `use` skips modifiers on non-bars (the item is still consumed).
- **Sheet:** bars show `current / max`, other attributes only their value; the tooltip has no "Actuel" line for non-bars.
- **Tests:** 10 new, written first (4 stats, 4 rules, 2 sheet). Existing tests changed to the new rule: the stats "caps the current value" test (a non-bar is now its max), the rules delta test (Wit declared a bar), the refund clamp test (uses Life), and the business test world (declares its life and mana bars). Suite 94 files, 779 tests; build OK.
- **Checked in the browser** (Yusica): Vie "10 / 10", Mana "5 / 5", Force/Agilité/Intelligence "1"; spending a point on Agilité gives "2". The tooltip without "Actuel" is covered by the sheet spec; the browser hover didn't open it at the computed position.
