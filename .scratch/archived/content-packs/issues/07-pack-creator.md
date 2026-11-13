# Pack creator

Status: resolved
Type: task
Blocked by: 02, 05

Spec: `../spec.md` (Pack creator)

- "Create a pack" button on the Packs page opens the creator; drafts are saved on the device (several, deletable).
- Details form (id derived from the name, EN/FR name and description, version, author, license, URLs) with Optimus UI controls.
- Generators: per language and generator, import a JSON word list or copy Base's, edit as JSON with the existing validators' errors live.
- Sprites: from a PNG upload or a saved sprite set (`masked`, materials included); id, labels, type, slot, kind; limits checked on add. (The colorizer's current sprite and "Edit in the colorizer" moved to K08, split 2026-11-13.)
- Outputs: "Install on this device" (same validation as "Add a pack"), "Export" as a `.zip` in the documented layout (small zip library, e.g. `fflate`), and "Edit as a new draft" for installed non-official packs.
- Seams likely: a pure `buildPack(draft)` → manifest + files (validated with `validatePack`), the creator business over faked storage, the page's inputs/outputs.

## Decisions (orchestrator, 2026-11-13)

- **Pages**: "Créer un pack / Create a pack" on the Packs page opens `tools/pack-creator` (drafts list: name, updated date, Open, Delete with `p-confirmDialog`, "Nouveau brouillon / New draft"). A draft opens at `tools/pack-creator/:draftId`, a page with tabs (`p-tabs`): Détails, Listes de mots, Sprites, Publier. Lazy routes. Optimus UI controls only, FR and EN i18n.
- **Draft model** `PackDraft { id, updatedAt, details: { id, name {en,fr}, description {en,fr}, version, author, license, licenseUrl, homepage? }, generators: { en?: { items?, npcs?, skills?, classes? }, fr?: … } (raw JSON values), sprites: DraftSprite[] }`, `DraftSprite { id, en, fr, type, slot, kind, image: Blob, materials?: string }`. New IndexedDB store `packDrafts` (DB version bump). Changes autosave (debounced ~500 ms) so the author can leave and come back.
- **Pack id**: derived from the English name (or French when empty) by a pure `slugifyPackId` (lowercase, accents removed, non-alphanumerics → `-`, trimmed); editable; the field warns when the id is an official pack's or already installed from a link.
- **Word lists**: per language and generator, a `p-textarea` with the JSON, errors from the existing validators (`generators/pack-word-lists.ts` and `validateWordList`) shown live under it; "Importer un fichier / Import a file" (`p-fileupload` basic mode, `.json`), "Copier la liste de Base / Copy Base's list" (through `PackBusiness.wordList`), "Vider / Clear". An empty slot is left out of the pack.
- **Sprites**: "Ajouter une image PNG" (upload: ≤ 1 MB, decodable, ≤ 256 × 256 through `ImageProcessingService.dimensions`; kind `grayscale` or `colored` since an upload has no materials yet) and "Depuis mes sprites / From my sprites" (a saved sprite set → `masked` with its config, its image from the library or the images store; its tags prefill type and slot). Per sprite: id (unique in the draft), EN/FR labels, type and slot selects, kind select (`masked` only offered when it has materials), Remove.
- **Building**: pure `buildPack(draft)` → `{ manifest, files: Map<path, Blob | unknown> }` with `format: 1`, layout `generators/<lang>/<generator>.json`, `sprites/<id>.png`, `sprites/<id>.json`. The per-file checks of K05's `prepare` move into a shared function used by both, so "a draft that exports is a pack that installs".
- **Install on this device**: validates like "Add a pack" (errors listed per file, nothing stored on failure) and stores the pack with `source: { kind: 'local' }`, enabled; the Packs page shows it in the unofficial section as "Créé sur cet appareil / Created on this device". Installing again from the same draft id replaces it (one transaction, K05). Official ids and ids installed from a link are refused.
- **Export**: a `.zip` built with `fflate` (`zipSync`, added as a direct dependency; it is already in the lock file) named `<id>-<version>.zip`, downloaded like the other file downloads in the app. Same validation first; errors block the export.
- **Edit as a new draft**: on an unofficial or local pack card, "Modifier comme brouillon / Edit as a draft" copies its manifest and files into a new draft and opens it. Official packs don't get the button.

## Baseline

Test Files 218 passed, Tests 1829 passed.

## Seams

1. **Pure `buildPack(draft)` and `slugifyPackId(name)`**: manifest fields and file layout, empty slots left out, the result passes `validatePack`; slug rules. Misses storage and validation of files.
2. **`PackCreatorBusiness` over fake-indexeddb, a faked `ImageProcessingService` and a faked `PackService`**: draft create/list/update/delete; add a PNG (limits refused with a reason); add from a sprite set (masked, config copied, tags prefilled); copy Base's list; install (stored as local, enabled, then served by `PackBusiness.sprites()` / `wordList`), invalid file → errors and nothing stored; export → zip bytes that unzip (with `fflate`) to `pack.json` plus the files; `draftFromInstalled(id)` copies an unofficial or local pack, refuses an official one. Misses the pages.
3. **Creator pages (drafts list and draft editor) and the Packs page buttons**: Create a pack opens the list, New draft opens the editor, a name fills the id, invalid JSON shows its error live, Install and Export call through and show errors; an unofficial card has "Edit as a draft". Misses layout (browser check).

## Green

- Files: `src/app/core/packs/pack-draft.ts`, `src/app/core/packs/pack-files.ts`, `src/app/core/business/pack-creator.business.ts`, `src/app/core/services/pack-draft-storage.service.ts`, `src/app/core/helpers/download.ts`, `src/app/modules/tools/pages/pack-creator-page/pack-creator-page.component.ts`, `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`; edited `pack.business.ts`, `pack-storage.service.ts` (`PackSource` + `{ kind: 'local' }`), `image.business.ts` (`blob`), `app-database.ts` (v7, `packDrafts`), `tools.routes.ts`, `app.config.ts` (`withComponentInputBinding`), `packs-tool-page.component.ts`, `public/i18n/en.json` and `fr.json`, `package.json` and lock (`fflate` ^0.8.3, the lock's version, now a direct dependency).
- Change: `buildPack`/`slugifyPackId` are pure; the per-file checks of `prepare` moved into `pack-files.ts` and are shared with the creator's build, so a draft that exports is a pack that installs. `PackBusiness.installLocal`/`checkLocalId`/`readFile` store local packs (source `{ kind: 'local' }`). `PackCreatorBusiness` handles drafts (with a `$drafts` signal), addPng, addFromSpriteSet, copyBaseList, install, exportZip (fflate), draftFromInstalled. Two lazy pages (drafts list with a keyed `p-confirmdialog`, editor with four `p-tabs` and 500 ms autosave) and the Packs page buttons ("Create a pack", "Edit as a draft", local packs shown as "Created on this device").
- Suite: 223 files and 1877 tests pass (baseline 218 and 1829); tsc and `ng build` clean (budget warnings only).
- Open questions: the red specs for the Packs page, drafts list and Install settle on unawaited async checks, so the components wrap their async work in `PendingTasks` (`whenStable` waits for it); nothing is wrong with the tests. No browser check done.

## Review

- Verdict: fix first
- Must fix:
  - src/app/core/business/pack-creator.business.ts:3,35,64 — a core business injects `SpriteSetStorageService`, another feature's service (docs/rules.md: "a business never injects another feature's service: it goes through that feature's business"; core also now imports from `modules/sprite`) — go through a sprite-set business (add one or use the existing one) and have the draft page take its `SpriteSet` type from there.
  - src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts:556 — `onDestroy` always calls `flush()`, which saves the draft and bumps `updatedAt` even when nothing changed (just opening a draft reorders the list; a draft deleted elsewhere is recreated) — flush only when `saveTimer` is set or a change is dirty.
  - Same file :545 — the `draftId` effect reloads without flushing the pending save of the previous draft (route reuse to another id loses edits) — flush before `load`, or key the page by id.
- Consider:
  - pack-draft-page.component.ts:866 and packs-tool-page.component.ts:788 — `PendingTasks` is sound (it is Angular's public API for this and the task is always released in `finally`), but it is duplicated `track` code and also keeps SSR/`whenStable` unstable in production for a long install; extract a small helper, or keep it only where the tests need it.
  - Checked and fine: per-file checks (`checkImageFile/JsonFile/MaterialsFile/listChecker`) are shared by `prepare` and `PackCreatorBusiness.build`; `installLocal` checks the id (official or link-installed refused, local replaced) then one `storage.install` transaction; v7 upgrade is guarded by `contains`; `withComponentInputBinding` affects only `draftId` (no routed component has an input named like a route param; the combat `characterId` inputs are child components); native `<input>`/`<textarea>` carry `pInputText`/`pTextarea`; no `innerHTML` and no secrets; fflate is now a direct dependency (lock `dev` flag removed); the debounce timer is cleared on flush.
  - pack-creator.business.ts:`build` reads `file.arrayBuffer()` for every blob before checking size; check size first to avoid loading oversize files.
  - Not run: tests and browser check.

## Green (review fixes)

- Files: `modules/sprite/business/sprite-set.business.ts` (new), `core/business/pack-creator.business.ts`, `pack-draft-page.component.ts`, new `pack-draft-page.lifecycle.spec.ts`.
- Change: the creator goes through `SpriteSetBusiness`; the editor flushes only when dirty, and flushes the previous draft before loading another id; Details form stacks under 600 px with `min-width: 0` and full-width fields (sprite rows wrap).
- Suite: 224 files, 1879 tests pass; ng build clean.

## Review (re-check)

- Verdict: ship
- Must fix: none (SpriteSetBusiness replaces the cross-feature service injection; flush writes only when dirty, on destroy and before a draft switch; lifecycle spec covers both; mobile CSS under 600 px stacks the form).
- Consider: none new; earlier Consider items (shared `track` helper, size check before `arrayBuffer`) stand.

## Answer

- Split on 2026-11-13 with the user's agreement: the colorizer parts went to K08.
- Pure `slugifyPackId` and `buildPack(draft)` (`core/packs/pack-draft.ts`); the per-file checks of K05's `prepare` moved to `core/packs/pack-files.ts` and are shared by the creator's install and export.
- `PackCreatorBusiness`: drafts in a new `packDrafts` store (DB v7), `addPng` (1 MB, decodable, 256 × 256), `addFromSpriteSet` (through a new `SpriteSetBusiness`), `copyBaseList`, `install` (`source: { kind: 'local' }`, one transaction, official and link-installed ids refused), `exportZip` (`fflate`, now a direct dependency, `<id>-<version>.zip`), `draftFromInstalled` (unofficial and local only).
- Pages: `tools/pack-creator` (drafts list, New draft, Open, Delete with confirm) and `tools/pack-creator/:draftId` (tabs Details, Word lists, Sprites, Publish; 500 ms autosave; live JSON errors; Install and Export with per-file errors). Packs page: "Créer un pack", and on unofficial and local cards "Modifier comme brouillon"; local packs read "Créé sur cet appareil". `withComponentInputBinding()` added to the router config (only the new `draftId` input uses it).
- Review fixes (approved by the user): core no longer injects a sprite service; the editor saves only when a change is pending (new `pack-draft-page.lifecycle.spec.ts`), and flushes before loading another draft; the Details form stacks labels under 600 px.
- Checked in the browser: FR desktop, Packs page → Créer un pack → Nouveau brouillon opens the editor; "Épées du Nord" gives the id `epees-du-nord`; invalid JSON shows "Ce texte n'est pas du JSON valide."; the draft survives a reload. EN at 375 px: the four tabs fit with no horizontal scroll after the fix. Adding sprites, Install, Export and Edit as a draft are covered by tests only. Suite: 224 files, 1879 tests (baseline 218 / 1829); build clean. Review: ship after the fixes.
- Left for later: the `track` helper (PendingTasks) is duplicated in two pages; `build` reads every blob before checking its size. A test draft "Épées du Nord" remains in the browser pane's local storage.
