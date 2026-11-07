# Spec: UI feedback round 1 (2026-11-07)

The user's feedback after the first full pass of the roadmap. Screenshots are the references below; the legacy app is `/home/hugo/dev/rpg-manager-frontend-legacy`.

## Bugs

- 3D dice roller: `ERROR TypeError: can't access property "forEach", frame is undefined` (Firefox wording); the animation is broken.
- New world wizard, Attributes step: the base value inputs overlap the preview card (delete icons sit under it).
- Game table: too much space between the nav bar and the table.

## Landing and brand

- Landing hero like the legacy one: the logo and "RPG Manager" centred in the full viewport height, with a scroll-down arrow; the pitch, screenshot and calls to action below.
- Favicon = the main logo (the nav bar's mark).

## Money (decided: legacy fantasy coins)

Legacy `GetFantasyCoinsFormat`: 1 gold = 100 silver = 10 000 copper. Gold is shown only when not zero, silver when gold or silver is not zero, copper always; each amount with a coin icon. Here money is stored as an integer number of copper (no floats). Prices, selling, starting money and the item generator use it.

## Character sheet

- **Character card**: format inspired by a trading card (title band, portrait area, a framed text box, a stats strip at the bottom), not its artistic direction. It holds the name, money and stat points (and level once it exists). Details (stats, equipment, inventory) sit in a separate section beside the card; on mobile, below it.
- **Equipment slots**: an empty slot shows a silhouette of its kind (head, earring, necklace, ring, chest, hands, legs, feet, weapon 1, weapon 2) instead of "-". Own SVGs, line style matching the logo.

## Attributes (decided 2026-11-07)

- Each attribute has a **level** (raised with stat points), a **max** value and a **current** value.
- `max = formula(level) + equipment bonuses`; current goes down and up in play (damage, potions), capped at max. Item generation and checks use max; bars show current / max. Levelling an attribute raises max and current by the same amount.
- The formula is chosen per attribute in the world: **Linear** (base + level × step), **Steep linear** (bigger step), **Diminishing** (each level gives less), **Percent** (base × (1 + level × 10 %)), or **Custom**.
- **Custom** is a safe math expression, parsed by an own parser (never `eval`), validated live with a preview: numbers, `+ - * / ^`, parentheses, `min max floor round sqrt`, and the variables `level`, `base`, `playerLevel`, and other attributes' levels by name.

## Experience and character level (decided 2026-11-07)

- Characters have **experience points** and a **level**. The XP needed per level comes from a curve chosen in the world: premade options plus a Custom expression (same parser, variable `level`).
- `playerLevel` in attribute formulas is this level.
- Open (settle at seams): who grants XP (assumed: the GM, like stat points), and how many stat points a level-up grants (assumed: a world setting).

## References

`refs/`: the legacy landing, the wizard overlap and the table spacing screenshots. The card reference the user gave was a trading card scan; it is not stored (third-party artwork): only its format matters (title band with the name, a large portrait window, a framed text box, a stats strip at the bottom, a thin outer frame).
