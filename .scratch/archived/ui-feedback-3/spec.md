# Spec: UI feedback round 3 (2026-11-12)

The user's feedback after round 2 (`archived/ui-feedback-2/`). One commit per ticket.

## Bugs and layout

- **Landing**: the footer is visible without scrolling. The pitch section must fill the viewport *below the nav bar*, so the footer starts below the fold at every width (desktop and mobile).
- **Item catalogue**: the price range slider is too small and its min/max values are too close together. The slider takes the full width of its filter cell (at least ~16rem), min and max shown at each end of the slider, clearly apart.
- **World rules**: "Max level" and "Stat points per level" sit on one line (two columns); the two skill-points fields too. They stack on mobile.
- **Close the world** button: uses the app's bordeaux red (theme primary / the red used elsewhere), not the flashy `danger` red.

## Catalogue lists as cards

The skill and class catalogues (list mode from F08) look flat. Each row becomes a card (surface background, border, radius, light shadow, spacing between cards) so the list has relief. Same content and actions as today; mobile friendly.

## Tools menu (decided)

- **In a world** (room open): the Tools submenu hides the **character sheet** and the **world rules** sandboxes (the world has the real ones).
- **Not in a world**: the Tools submenu hides **world rules** (the sandbox sheet stays).

## Empty image picker

Everywhere an image can be chosen (items, NPC portrait, classes, skills, table images…), the empty state is ugly: a default HTML file button and a broken image icon. Empty state: a placeholder tile (Optimus UI style, image icon `pi-image`, dashed border) and an Optimus UI button (« Choisir une image » / "Choose an image"); the native file input stays hidden. No `<img>` without a source.

## Sheet preview (Tools)

In the Tools character sheet (sandbox), the default character has the **Mage** class (from the default classes, N09). The Skills tab gets a box to **grant skill points**, same look as the "give experience" box.

## Wording

- Credits, AI section (FR):
  « L'IA a été utilisée pour le code, la documentation, le logo et les icônes SVG personnalisées. Je serais ravi de collaborer avec des artistes pour retirer le slop et donner plus de vie aux interfaces. Note : ce projet existe depuis avant Claude, et la direction artistique et la palette de couleurs sont voulues, ce n'est pas une copie de la DA d'Anthropic. »
  EN: "AI was used for the code, the documentation, the logo and the custom SVG icons. I would be glad to work with artists to remove the slop and give the interfaces more life. Note: this project predates Claude; its art direction and colour palette are deliberate, not a copy of Anthropic's."
- **Rang de compétence → niveau de compétence** in every FR label (EN "rank" → "skill level").

## Rank becomes skill level in the code (decided)

For consistency the code follows the wording (no backward compatibility, dev data is replaced):
- formula variable `rank` → `skillLevel` (`level` stays the character level);
- skill fields `maxRank` → `maxLevel`, learned skills / class `requires` `rank` → `level`, and the matching helpers, i18n keys, default skills and classes, generators, AI prompts and JSON shapes (`rankOf` → `levelOf`, `setSkillRank` → `setSkillLevel`, …).

## Skill editor and formula presets (decided)

- **Readable form**: grouped sections (identity, cost and levels, roll and success, effects), helper text under each field, and a **Variables** help panel listing every variable a formula can use (`roll`, `rank`, `level`, caster attributes by name, target attributes), with examples, and what each formula is for (success must be ≥ 0 / true; an effect amount is a number).
- **Presets**: success formulas and effect amount formulas can be picked from presets (a select next to the formula field fills it). A few built-in presets ship (e.g. success: "roll + rank ≥ 10", "beats target's defence"; effects: "flat + per level", "scales with an attribute", "dice-based"). Users create, edit and delete their own presets (name, kind `success` | `effect`, formula, description), validated with the same formula parser. Built-ins are read-only (they can be duplicated). User presets are stored on the device (not per world), with the app's local storage layer.
- **Generic over attributes** (decided): since presets are shared by every world, a preset never names a world attribute. It uses placeholders `{A}`, `{B}`… for caster attributes and `{target.A}`… for the target's. Picking a preset in the editor asks which world attribute each placeholder stands for (a select per placeholder, from the world's attributes), then fills the field with the real names in the parser's syntax. Fixed variables (`roll`, `skillLevel`, `level`) are written as is. A preset is validated by substituting a dummy attribute for each placeholder and running the formula parser. "Save as preset" from the editor turns the world attribute names of the current formula back into placeholders.
