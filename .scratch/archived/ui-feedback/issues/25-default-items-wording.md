# "Default items" option: say it fills the catalogue, not the characters

Status: resolved
Type: task

User request (2026-11-08): « Commencer avec des objets par défaut » must add the items to the catalogue, not to the character; say so more clearly, and fix the code if it doesn't.

## Answer

- **Code:** already correct.
  - `WorldLibraryBusiness.create(draft, { starterItems: true })` puts the generated items in `world.items` (the catalogue), covered by `world-library.business.spec.ts` (more than 15 items, unique ids, persisted).
  - `createCharacter` starts every character with `inventory: []`, covered by `character.rules.spec.ts`.
- **Wording, FR and EN:**
  - the label is now « Remplir le catalogue avec des objets par défaut » / "Fill the catalogue with default items";
  - the hint says the ~20 items are added to the world's catalogue, that characters start with an empty bag, and that the GM gives them items from the catalogue.
- **Checked:** suite green; the wizard's Rules step in the browser shows the new label and hint.
