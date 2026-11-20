# Create a pack opens a new draft; "My packs" lists the drafts

Status: resolved
Type: task
Blocked by: none

User request (2026-11-18): "le bouton créer un pack doit directement ouvrir un formulaire de création de pack en mode brouillon, et il faut rajouter un bouton « mes packs » qui affiche la liste des brouillons (et en profiter pour améliorer cette liste, l'UI manque de padding etc.)"

## Today

- Packs page (`packs-tool-page`): "Ajouter un pack" and "Créer un pack". "Créer un pack" only navigates to `/tools/pack-creator`, the drafts list; the user then has to press "Nouveau brouillon".
- Drafts page (`pack-creator-page`, `/tools/pack-creator`), titled "Créateur de pack":
  - the title, intro, "Nouveau brouillon" button and list are packed together with no spacing;
  - each row shows only the name and "Modifié le …";
  - Open and a solid red Delete button sit side by side, with no layout for a phone;
  - there is no way back to the Packs page.

## Wanted

### Packs page

- **Créer un pack** creates a draft (`PackCreatorBusiness.createDraft()`) and opens it in the editor (`/tools/pack-creator/<id>`) at once. The button shows its loading state while the draft is created; an error is a toast, as for Duplicate.
- A new **Mes packs** button (secondary, `pi pi-folder`) next to it opens the drafts page (`/tools/pack-creator`). Order: Ajouter un pack, Créer un pack, Mes packs.

### Drafts page, renamed "Mes packs" / "My packs"

- Header:
  - a "Retour aux packs" link to `/tools/packs`, same style as the editor's "Retour aux brouillons";
  - the title "Mes packs" and a one-line intro (the drafts are kept on this device);
  - the primary "Créer un pack" button (same label as on the Packs page);
  - real spacing between these and the list.
- Each draft is a card with comfortable padding:
  - the name (two lines at most, full name in a tooltip, like the PE14 catalogue cards), or "Pack sans titre";
  - a tag with the pack's language, or "Neutre" when it has none;
  - "Modifié le …" in the muted meta style of PE14.
- Clicking the card opens the draft. The actions are "Ouvrir" (secondary) and "Supprimer" (danger, outlined, not solid). Delete keeps its confirmation.
- Desktop: one column of cards, max width as today. At 375 px the actions wrap under the info, with no horizontal scroll.
- The list is sorted by last change, newest first.
- Empty list: a short message and the "Créer un pack" button.

## Out of scope

- The editor page itself, and publishing.

## Check

FR/EN, 375 px and desktop. On the Packs page, Créer un pack lands in a new empty draft and Mes packs opens the list. In the list: open by the card, open by the button, delete with its confirmation, the empty state and the back link.

## Baseline

`develop` at 2649dcd: Test Files 339 passed, Tests 3377 passed (PE16's final run).

## Seams

1. `packs-tool-page` component (inputs/outputs, `TEST_PROVIDERS`, router spied as in `packs-tool-page.creator.spec.ts`): Créer un pack creates a draft and navigates to it, with an error toast on failure; Mes packs navigates to the list. Catches the two buttons; misses real routing.
2. `pack-creator-page` component (`TEST_PROVIDERS`, drafts seeded through `PackCreatorBusiness`): title and back link, cards with name, language tag (or neutral), date, order newest first, card click opens, Open/Delete, the empty state with its create button. Catches the list's content and actions; misses spacing, which the browser check covers.

## Red

- Test files: `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.creator.spec.ts`, `src/app/modules/tools/pages/pack-creator-page/pack-creator-page.component.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (each file)
- Failing: 11 tests (the "Delete asks to confirm without opening the draft" guard and the existing Open/Delete tests already pass). New i18n keys are expected in en/fr: "My packs", "Back to the packs", "Neutral". New hooks: `data-test` `draft-name` (class `line-clamp-2`), `draft-language`, `draft-date`, `drafts-empty` (holding the message and a "Create a pack" button).
  - Packs page: Create a pack creates a draft and opens it — still navigates to the list
  - Packs page: Create a pack shows an error toast on failure — no draft creation, no toast
  - Packs page: My packs opens the drafts list — no such button
  - Packs page: button order Add a pack, Create a pack, My packs — no My packs button
  - Drafts page: titled My packs with a back link to /tools/packs — old title, no link
  - Drafts page: cards with name, language tag, date, Open, Delete — no card hooks or tag
  - Drafts page: untitled draft shows Untitled pack and Neutral tag — no tag
  - Drafts page: newest change first — order not sorted
  - Drafts page: clicking the card opens the draft — no card click handler
  - Drafts page: Create a pack button creates and opens a draft — button is labelled "New draft"
  - Drafts page: empty state with message and Create a pack button — no `drafts-empty` block

## Green

- Files: src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts, src/app/modules/tools/pages/pack-creator-page/pack-creator-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: Packs page "Create a pack" now creates a draft and opens it (loading state, error toast); new "My packs" button (pi-folder) opens the list. Drafts page retitled "My packs" with a back link, sorted newest first, cards with clamped name and tooltip, language/Neutral tag, muted date, card click opens, Open secondary and Delete danger outlined (actions wrap at 375 px), empty state with Create button. New i18n keys: backToPacks, neutral; title and intro reworded; unused creator.newDraft removed.
- Suite: 339 files / 3386 tests pass (baseline 339 / 3377); tsc and ng build clean; no test file in the unstaged diff.
- Open questions: none (spacing and padding are not browser-checked)

## Answer

Packs page:
- "Créer un pack" creates a draft and opens it in the editor, with a loading state and an error toast.
- A new "Mes packs" button (`pi-folder`) opens the drafts list.

Drafts page, renamed "Mes packs":
- back link "Retour aux packs", a one-line intro and the primary "Créer un pack" button, spaced from the list;
- one padded card per draft, newest change first: name clamped to two lines with a tooltip, a language tag or "Neutre", the date in the muted meta style;
- clicking the card opens the draft; "Ouvrir" is secondary and "Supprimer" danger outlined, still confirmed;
- at 375 px the actions wrap under the info;
- the empty state shows a message and the create button;
- the unused `creator.newDraft` key is removed.

Checked:
- Suite 339 files / 3386 tests vs baseline 339 / 3377. Build clean. Review: ship.
- Browser, FR desktop: Créer un pack lands in a new draft (`Modifier un pack`); Mes packs opens the list; layout spaced.
- Browser, EN at 375 px: no horizontal scroll; a card click opens the draft; Delete asks, and Keep leaves the list unchanged.
- No console errors. The empty state is covered by the spec only.

Consider (review):
- the card click is mouse-only (keyboard users have Open);
- the "My packs" button reuses the page title key;
- the two create buttons share duplicated markup.
