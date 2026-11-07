# Character card: full-bleed portrait with a minimal overlay

Status: resolved
Type: task
Blocked by: 09

User feedback (2026-11-08): "card is better but i want the image to be the full cover of the card, then minimalist overlay on top of it. right now it's covering too much of the card."

## Direction

- **Portrait:** the image covers the whole card (5:7, `object-fit: cover`), edge to edge inside the thin frame.
- **No portrait:** a full-card fallback, a large initial on a soft paper or primary gradient, so the card never looks empty.
- **Minimal overlay on top:**
  - **Top:** a slim band with the name (h2) and a small level chip, over a short dark-to-transparent scrim for contrast.
  - **Bottom:** a compact scrim block with money (coins), the stat points badge, then thin life and mana bars (small "10 / 10" labels) and a thin XP bar ("xp / next"). Small type, no boxed sections.
- **Readability:** overlay text is white or light, readable on any image thanks to the scrims (WCAG AA contrast on the scrim colour).
- **Hooks:** the existing card spec hooks (`card-name`, `character-level`, `card-portrait`, `card-stat-points`, `xp-progress`, `xp-text`, `card-bars`) stay and the card spec stays green; the accessible name (`aria-labelledby`) stays.
- **Checked** in the browser with and without a portrait, at 1280 and 375 px.

## Green

- Files: src/app/modules/character/components/character-card/character-card.component.html, character-card.component.scss
- Change: portrait is now absolutely positioned over the whole 5:7 card (object-fit cover; fallback is a large initial on a gradient). Name and level chip sit in a top band over a dark-to-transparent scrim; money, stat points, thin life/mana bars and the thin XP bar sit in a compact bottom scrim block with small white text. All spec hooks and aria-labelledby kept; spec unchanged.
- Suite: character components specs 4 files / 32 tests pass; tsc -p tsconfig.app.json clean.
- Open questions: browser check (with/without portrait, 1280 and 375 px) not done; the fallback gradient uses `--p-primary-100` with a fallback var, to verify visually.

## Answer

- **Portrait:** it fills the whole 5:7 card (`app-stored-image` absolute, inset 0, with its own `object-fit: cover` on the img). With no portrait, a large initial on a soft gradient fills the card.
- **Overlay:**
  - top: the name and level chip on a dark-to-transparent scrim;
  - bottom: a compact scrim block with money, the stat points badge, thin life and mana bars, and a thin XP bar, in small light text.
- **Hooks:** all card spec hooks and `aria-labelledby` are kept, and the spec is unchanged (character component specs 4 files, 32 tests).
- **Checked in the browser:** the fallback at 1280 and 375 px (no horizontal scroll, no console error). A real portrait wasn't available on the sample hero, so the cover behaviour was checked from the stored-image styles.
