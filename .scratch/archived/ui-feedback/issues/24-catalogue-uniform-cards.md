# Uniform card sizes in the item catalogue

Status: resolved
Type: task

User request (2026-11-08): "dans le catalogue d'objet, uniformise la taille des cards" (the message was cut off after "pour").

## Answer

- **Catalogue grid:** `grid-auto-rows: 1fr`, so every row is as tall as the tallest card; each entry's `app-item-card` grows to fill its cell.
- **Item card:** fills its host (`p-card`, body and content are flex columns); the price is pushed to the bottom (`margin-top: auto`); the description is clamped to 3 lines so one long text can't inflate every card.
- **Checked:**
  - Suite green.
  - Browser at 1280 px: all 20 sample cards are 246 px tall, with prices aligned.
  - Browser at 375 px: all 223 px, no horizontal scroll.
