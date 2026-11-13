# Official packs: registry and lazy loading

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (Official packs, Packs page)

- Registry `public/packs/index.json`; official pack files are excluded from the service worker precache (`ngsw-config.json`) and fetched only when the user turns the pack on, then stored on the device (IndexedDB) for offline use.
- Tools > Packs page: official packs with on/off, size, downloaded state, "Remove from device"; details view with license and content.
- Credits page lists installed packs' authors and licenses.
- No official pack besides Base yet (decided): prove the lazy path with a test fixture pack; the page lists Base alone.

## Decisions (orchestrator, 2026-11-13)

- **Registry** `public/packs/index.json`: `{ "format": 1, "packs": [ { id, name {en,fr}, description {en,fr}, author, license, licenseUrl, size (bytes), sprites (count), languages, builtIn? } ] }`, validated by a pure `validateRegistry`. Today it lists Base alone (`builtIn: true`). It is prefetched with the app (ngsw `app` group); other `/packs/<id>/**` files are never precached (the lazy assets group may still cache what the browser fetches, that's fine).
- **Storage** (IndexedDB, device-wide, new stores in `app-database.ts`, version bump): `packs` (keyPath `id`: the validated manifest, `source` = `official`, `enabled`, `installedAt`, `size`) and `packFiles` (key `<packId>/<path>`: a Blob for images, parsed JSON for JSON files). Base is never stored: it stays served from `public/packs/base/` and is always on.
- **Turning an official pack on**: if not downloaded, fetch its manifest from `packs/<id>/pack.json`, validate it, fetch every listed file, then store everything in one go and mark it enabled; a failure stores nothing and reports a readable error. If already downloaded, just mark it enabled (no network). **Off** keeps the files. **Remove from device** deletes the pack and its files.
- **`PackBusiness` becomes multi-pack**: `registry()`, `$installed` (Base + stored packs), `enable(id)`, `disable(id)`, `remove(id)`. `sprites()` returns the sprites of every enabled pack (Base first, then registry order); a stored pack's file URLs are object URLs made from its Blobs (created once per pack, revoked on disable/remove). `wordList(generator, lang, packId)` reads the stored JSON for a stored pack and fixes the K01 note (it no longer reads Base's list for another id). Everything works offline once downloaded.
- **Packs page** at `tools/packs` (lazy route, entry in the Tools menu next to the sprite colorizer, `pi pi-box` or `pi pi-th-large`): one card per registry pack with name, description, author, license, size, sprite count, languages and a state: Base shows "Toujours actif / Always on"; others show a `p-toggleswitch` (on/off), a "Téléchargé / Downloaded" tag when stored, a "Supprimer de l'appareil / Remove from device" button (with `p-confirmDialog`) when stored, and a spinner while downloading. "Détails / Details" opens a `p-dialog` with the description, license link, sprite thumbnails grouped by kind (reuse K02 badges) and, per language, which generators the pack provides. Errors show as toasts. Optimus UI controls only.
- **Credits page**: a "Packs" section listing every installed non-Base pack (name, author, license with link); the existing Fantasy items credit stays for Base.

## Baseline

Test Files 203 passed, Tests 1732 passed.

## Seams

1. **`PackBusiness` over a faked `PackService` and fake-indexeddb**, with a registry listing Base and a fixture official pack (`extra`, one grayscale sprite, one FR items list): enabling downloads, validates and stores it; its sprites then come out with object URLs and its word list through `wordList(..., 'extra')`; a fresh `PackBusiness` (new injector, same DB) lists it without any network call; disable removes it from `sprites()` without deleting files; remove deletes them; a failed file fetch or invalid manifest stores nothing and rejects with the errors; Base cannot be disabled or removed. Plus pure `validateRegistry`. Misses the page.
2. **Packs page component** (`TEST_PROVIDERS`, real `PackBusiness` over the faked service and fake-indexeddb): renders one card per registry pack with its state; toggling on calls through and shows the Downloaded tag; Remove (confirmed) clears it; Base shows Always on and no toggle. Misses layout (browser check).
3. **Credits page component**: lists installed non-Base packs with author and license link, nothing extra when only Base is installed.

## Red

- Test files: `src/app/core/packs/pack-registry.spec.ts`, `src/app/core/business/pack-official.business.spec.ts`, `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.spec.ts`, `src/app/modules/home/pages/credits-packs.spec.ts`. Fixture: `src/testing/extra-pack.ts` (new); `base-pack.ts` and `kinds-pack.ts` now also fake `loadRegistry` and `loadBlob`.
- Run: `npx ng test --watch=false --include src/app/core/packs/pack-registry.spec.ts --include src/app/core/business/pack-official.business.spec.ts --include src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.spec.ts --include src/app/modules/home/pages/credits-packs.spec.ts 2>&1 | tail -30`
- Failing: all 4 files fail to compile (missing symbols), so every test is red:
  - pack-registry (4): accepts a registry / rejects non-objects / lists entry problems / rejects duplicate ids — `./pack-registry` with `validateRegistry` (result `{ok, value:{format, packs}} | {ok:false, errors}`) doesn't exist.
  - pack-official.business (13): registry listing, Base-only start, enable downloads and stores, sprites with object URLs after Base, stored word list offline, fresh business offline, re-enable without network, disable keeps files and revokes URLs, remove deletes, failed fetch stores nothing, invalid manifest stores nothing, Base not disable/removable, unknown id rejected — `PackBusiness.registry/$installed/enable/disable/remove` missing.
  - packs-tool-page (7): routed at `tools/packs`, cards, Base always on, other pack off, toggle on downloads, confirmed remove, error toast — `PacksToolPageComponent` and the route are missing.
  - credits-packs (2): lists installed non-Base pack with author and license link, nothing extra for Base only — `PackBusiness.enable` missing; page needs a `[data-test="packs"]` section.
- Interface contract the tests assume (not in the ticket, green must follow or tell):
  - `PackService` gains `loadRegistry(): Promise<unknown>` (registry file) and `loadBlob(url): Promise<Blob>`; extra files are fetched as `packs/<id>/<path>` (images by `loadBlob`, JSON by `loadJson`), manifest by `loadManifest(id)`. Persistence goes through a real storage service over fake-indexeddb.
  - `registry()` returns the entries; `$installed()` is a signal of `{ id, enabled, ... }` (Base first), filled once the business has loaded (`sprites()`, `registry()` or `enable()` loads it).
  - Page DOM: `[data-test="pack-card"][data-pack="<id>"]`, `p-toggleswitch` with its inner `input`, text "Always on", "Downloaded", button "Remove from device"; remove goes through `ConfirmationService.confirm` (`accept`), errors through `MessageService.add({severity:'error'})`. Component class `PacksToolPageComponent` at `modules/tools/pages/packs-tool-page/packs-tool-page.component.ts`.
  - Existing `pack.business.spec.ts` fakes lack `loadRegistry`; green must either keep Base-only `sprites()`/`wordList()` working without the registry or update that spec's fake.

## Green

- Files: `src/app/core/packs/pack-registry.ts`, `src/app/core/services/pack-storage.service.ts`, `src/app/core/services/pack.service.ts`, `src/app/core/business/pack.business.ts`, `src/app/core/helpers/app-database.ts` (v6: `packs`, `packFiles`), `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts`, `src/app/modules/tools/tools.routes.ts`, `src/app/modules/home/pages/credits-page.component.ts`, `public/packs/index.json`, `ngsw-config.json`, `public/i18n/{en,fr}.json`, `tsconfig.app.json`
- Change: `validateRegistry` + `public/packs/index.json` (Base, builtIn), prefetched by the ngsw `app` group. `PackBusiness` is multi-pack (`registry/$installed/load/enable/disable/remove`), downloads manifest + files into IndexedDB in one transaction (images stored as bytes, JSON as parsed), object URLs created once per pack and revoked on disable/remove. Base `sprites()`/`wordList()` need neither registry nor storage (both failures are swallowed), so `pack.business.spec.ts` is untouched. Packs page at `tools/packs` (cards, `p-toggleswitch`, Downloaded tag, confirmed remove, details `p-dialog`, error toasts), Credits "Packs" section, FR/EN strings. `tsconfig.app.json` now excludes `src/testing/**` because the frozen `extra-pack.ts` uses `vi` and broke `ng build`.
- Suite: 207 files / 1758 tests pass (baseline 203 / 1732); tsc spec clean; `ng build` no error; no test file in unstaged diff.
- Open questions: the Tools menu entry is NOT added: the frozen `nav-bar.component.spec.ts` asserts the exact Tools submenu (`Sprite colorizer, Item generator, ...`), so adding `{label:'nav.packs' (already in i18n), icon:'pi pi-th-large', routerLink:'/tools/packs'}` after SPRITE_COLORIZER in `nav-bar.component.ts` fails 3 tests until that spec is updated; the page is reachable by URL only until then.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/core/business/pack.business.ts `objectUrls` — the URL map is cached before it is filled, across awaits. A second concurrent `sprites()` call gets a half-filled map (`imageUrl: ''`), and a `disable`/`remove` during the fill revokes an incomplete map and leaves URLs created afterwards leaked. Cache a `Promise<Map>` per pack instead, and revoke after it settles.
  - pack.business.ts `enable` — a concurrent double `enable(id)` (two clicks, or the page plus another caller) downloads twice. The page disables the toggle while busy, so only the business is exposed. Share the in-flight promise per id.
  - pack.business.ts `download` — all files are fetched in parallel with no cap and each is buffered in memory. Fine for small packs, so revisit when a real pack lands.
  - pack.business.ts `installedBase` — repeats the Base fallback fields (`'Base'`, empty strings). Minor primitive obsession.
  - credits-page.component.ts — it lists downloaded packs that are switched off. That matches "installed", but confirm it is wanted.
  - ngsw-config.json — the lazy `assets` group still caches `/packs/extra/*.png` once fetched. The ticket allows this, but it duplicates the IndexedDB copy.

Checked:
- DB v6 is guarded by `contains`, so the upgrade is safe, and `openAppDatabase` is the only opener.
- Base `sprites()` and `wordList()` swallow registry and storage failures, so Base works without the registry.
- Object URLs are revoked on disable and remove.
- The failed-download path stores nothing, because `install` runs in a single transaction after all fetches.
- Nav entry, route, strings and the `tsconfig.app.json` exclusion are sound.
- No secrets or personal data in the diff, and nothing touches invite codes.

## Answer

- `validateRegistry` and `public/packs/index.json` (Base alone, `builtIn`), prefetched by the ngsw `app` group. IndexedDB v6 adds `packs` and `packFiles` (through `PackStorageService`).
- `PackBusiness` is multi-pack: `registry()`, `$installed`, `load()`, `enable(id)` (download manifest + every file, validate, store in one transaction; no network when already stored), `disable(id)` (keeps files, revokes object URLs), `remove(id)`. `sprites()` returns every enabled pack's sprites (stored packs through object URLs) and `wordList(..., packId)` reads the stored JSON. Base keeps working without the registry or storage.
- Packs page at `tools/packs`, in the Tools menu as "Packs de contenu / Content packs" (added by the orchestrator, with the nav-bar spec's expected labels updated): one card per pack, `p-toggleswitch`, Downloaded tag, confirmed Remove, details `p-dialog` (license link, word lists per language, sprites by kind), error toasts. Credits page lists installed non-Base packs.
- `tsconfig.app.json` excludes `src/testing/**` (a fixture uses `vi`). The Base author now reads "RPG Manager (sprites: Florian Sciberras)": the word lists are not his (orchestrator fix found in the browser check).
- Checked in the browser: FR desktop Packs page shows the Base card (Toujours actif, licence link, 101 sprites, both languages) and its details dialog; EN at 375 px, no horizontal scroll. The dev server had to be restarted after the tsconfig change. No official pack besides Base exists, so enabling, downloading and removing are covered by tests only. Suite: 207 files, 1758 tests (baseline 203 / 1732); build clean. Review: ship.
- Review notes for K05 (which installs more packs and will hit them): the per-pack object URL map is cached before it is filled, so a concurrent `sprites()` can get `imageUrl: ''` and a disable during the fill can leak URLs (cache a `Promise<Map>`); a double `enable(id)` downloads twice (share the in-flight promise); downloads fetch every file in parallel without a cap. Credits list switched-off downloaded packs too (they are installed).
