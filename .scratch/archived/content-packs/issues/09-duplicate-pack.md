# Duplicate a pack

Status: resolved
Type: task
Blocked by: none

Spec: `../../archived/content-packs/spec.md` (Pack creator). User request 2026-11-13: "ajoute l'option pour dupliquer un pack".

## Decisions (orchestrator, 2026-11-13)

- **"Dupliquer / Duplicate"** on every pack card of the Packs page whose files are available: Base (always), an official pack once downloaded, a pack added from a link, a pack created on this device. Not offered on an official pack that isn't downloaded.
- It creates a **new draft** holding a copy of the pack (details, every word list, every sprite with its image and materials) and opens it in the pack creator.
- The copy gets a **new id**: `<id>-copie` in French, `<id>-copy` in English (the current language), then `-2`, `-3`… until it is free among official packs, installed packs and other drafts. Its names get " (copie)" / " (copy)". Version, author, license and links are kept (the license usually requires the credit to stay).
- Base's files are read from the app (`packs/base/…` through `PackService`), stored packs' files from `PackStorageService`, as `draftFromInstalled` does.
- **"Modifier comme brouillon / Edit as a draft"** stays only on packs created on this device (it keeps the id, so installing replaces the pack). On packs added from a link it goes away: a copy can't be installed under a link pack's id anyway, so Duplicate replaces it there.

- **Packs page redesign** (user request 2026-11-13, with a screenshot: "modernise l'interface de liste de pack, ça manque de padding"). Layout only, no behaviour change:
  - Page container like the other tools pages: `max-width` (~72rem), centred (`margin-inline: auto`), page padding, `gap` between blocks.
  - Header: title, then the intro in muted text (`--p-text-muted-color`) on its own line, then the actions row ("Ajouter un pack", "Créer un pack"), with breathing room above and below.
  - Sections with a heading: "Packs officiels / Official packs" and "Packs ajoutés ou créés / Added or created packs" (link and local packs); a section is hidden when empty.
  - Cards in a responsive grid (`repeat(auto-fill, minmax(20rem, 1fr))`, `gap` ~1rem), as `p-card` like the world cards, inner padding ~1.25rem, equal heights. Card header: name and the state tag (Toujours actif, Téléchargé, Créé sur cet appareil) on one line; the description in muted text; the details (Auteur, Licence, Sprites, Langues, Version, Source…) as a two-column grid with muted labels and spacing between rows; a footer separated by a top border holding the actions (toggle, Détails, Dupliquer, Modifier comme brouillon, Mettre à jour, Supprimer de l'appareil), wrapping on narrow screens, secondary/text buttons except the main one.
  - Mobile (375 px): one column, no horizontal scroll.
  - Keep every `data-test` hook and label the existing specs use.

## Baseline

Test Files 229 passed, Tests 1906 passed.

## Seams

1. **`PackCreatorBusiness.duplicate(packId)` over fake-indexeddb and a faked `PackService`**: duplicating Base, a downloaded official pack, a link pack and a local pack each gives a draft with every word list and sprite (images and materials) copied, the new id and names; the id skips taken ones (`-copy-2`); an official pack that isn't downloaded and an unknown id are refused; the draft builds a valid pack (`buildPack` + `validatePack`). Misses the page.
2. **Packs page** (the redesign is checked in the browser, not by tests): Duplicate on the Base card and on link, local and downloaded official cards, not on an official card that isn't downloaded; clicking it opens `/tools/pack-creator/<draftId>`; Edit as a draft only on local cards. Misses layout (browser check).

## Red

- Test files: `src/app/core/business/pack-creator.business.spec.ts`, `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.creator.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/business/pack-creator.business.spec.ts` and `npx ng test --watch=false --include src/app/modules/tools/pages/packs-tool-page/packs-tool-page.creator.spec.ts`
- Failing: 12 tests (business spec does not compile until `PackCreatorBusiness.duplicate` exists, so its 8 fail as a file)
  - business: link pack copy (id, names, details kept, lists, sprites, valid pack) — `duplicate` missing
  - business: French gives `neon-copie` and "(copie)" — `duplicate` missing
  - business: `-copy`, `-copy-2`, `-copy-3` — `duplicate` missing
  - business: id taken by an installed pack skipped — `duplicate` missing
  - business: local pack copy with its sprites — `duplicate` missing
  - business: downloaded official pack copy — `duplicate` missing
  - business: Base copy (all lists, 101 sprites, masked materials) — `duplicate` missing
  - business: refuses undownloaded official and unknown id — `duplicate` missing
  - page: link card has Duplicate, opens `/tools/pack-creator/<draftId>`, no Edit as a draft — no Duplicate button, Edit still there
  - page: Base card Duplicate — no button
  - page: official card Duplicate once downloaded — no button
  - page: local card has Edit as a draft and Duplicate — no Duplicate button
- Notes: business spec setup now also provides `provideTestTranslations()` (new code reads the active language; French test uses `TranslocoService.setActiveLang('fr')`). The old "Edit as a draft on a link card" page test was replaced; `packs-tool-page.unofficial.spec.ts` has no such assertion. Base word lists come from the fake as `{ url }`, so the Base test checks lists by that literal.

## Green

- Files: src/app/core/business/pack-creator.business.ts, src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `PackCreatorBusiness.duplicate(packId)` copies Base (files via `PackService`) or a stored pack (storage) into a new draft, id `-copy`/`-copie` then `-2`… free among official, installed and draft ids; names suffixed. Packs page: Duplicate on every available card, Edit as a draft only on local packs; page redesigned (centred container, muted intro, two titled sections, `p-card` grid with footer actions). New keys `packs.duplicate`, `packs.officialTitle`; `unofficialTitle` reworded.
- Suite (after review fixes): Test Files 225 passed, 4 failed; Tests 1863 passed, 53 failed. Cause: `PackCreatorBusiness` now injects `LanguageBusiness` (needs Transloco), which these specs do not provide. Failing: `src/app/core/business/pack-creator-colorizer.business.spec.ts`, `src/app/modules/sprite/business/sprite-colorizer.business.spec.ts`, `src/app/modules/sprite/business/sprite-colorizer-draft.business.spec.ts`, `src/app/modules/sprite/business/sprite-colorizer-draft.colored.spec.ts`. The two Red files pass. tsc clean, build OK.
- Review fixes: language through `LanguageBusiness.$language()`, copy words named once (`COPY_WORDS`), `setMaterials` reflow reverted, Base files fetched 4 at a time with `runLimited`, Duplicate button `[loading]` while it runs.
- Open questions: test side needs `provideTestTranslations()` in the 4 specs above.

## Review (re-check)

- Verdict: ship
- Must fix: none
- Consider: pack-creator.business.ts `copySprites` — `runLimited` rejects on the first failure but the other workers keep fetching until they drain; harmless, and the draft is not saved on error.

## Answer

- `PackCreatorBusiness.duplicate(packId)`: copies Base (files through `PackService`), a downloaded official pack, a link pack or a local pack into a new draft; id `<id>-copie` / `<id>-copy` (current language through `LanguageBusiness`), then `-2`, `-3`… free among official, installed and draft ids; names suffixed " (copie)" / " (copy)"; version, author, license and links kept. Sprite files fetched 4 at a time (`runLimited`, order kept). An official pack that isn't downloaded and an unknown id are refused.
- Packs page: "Dupliquer / Duplicate" on every card whose files are available (spinner and disabled while it runs); "Modifier comme brouillon / Edit as a draft" only on packs created on this device.
- Packs page redesign (user request with a screenshot: "ça manque de padding"): centred container with padding, muted intro, actions row, sections "Packs officiels" and "Packs ajoutés ou créés" (hidden when empty), `p-card` grid with the name and state tag on one line, muted description, two-column details grid, footer actions above a separator.
- Review fixes (approved by the user): `LanguageBusiness` instead of a lazy `TranslocoService` lookup (the orchestrator added `provideTestTranslations()` to the four specs that then needed it), and the capped fetch with a busy button.
- Checked in the browser: FR desktop, the redesigned page with the Base card; Dupliquer on Base opens a draft `base-copie` "Base (copie)", a second time `base-copie-2`; the button shows a spinner while working; duplicating Base takes 0.15 s once the page is compiled (the first try after a dev-server restart took ~5 s of compilation). EN at 375 px: one column, no horizontal scroll. Suite: 1916 tests (baseline 1906), two clean runs; build clean. Review: ship after the fixes.
- Left for later: when one sprite fetch fails, `runLimited` rejects at once but the other fetches drain (harmless, nothing is saved). Test drafts "Base (copie)" and "Base (copie)" `-2` remain in the browser pane's storage.
