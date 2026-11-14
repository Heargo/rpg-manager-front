# Unofficial packs from a link or GitHub repository

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (Unofficial packs)

- Pure helper resolving a link to a manifest URL: `github.com/<owner>/<repo>[/tree/<ref>/<path>]` → `raw.githubusercontent.com/...`, or a direct HTTPS `pack.json`; relative file URLs resolved against it.
- "Add a pack" dialog: fetch the manifest, show name, author, license, source, counts per generator and sprite kind, size and the third-party warning; install downloads and validates every file (word-list validators, PNG decode and limits, colorizer config import), stores it, or lists errors and installs nothing.
- Update (shows old and new version, replaces on confirm) and Remove on the Packs page.
- Data only: nothing from a pack is executed or rendered as HTML.
- From the K03 review, fix before installing more packs: `PackBusiness` caches the per-pack object URL map before filling it (cache a `Promise<Map>`, revoke after it settles), shares no in-flight `enable(id)` promise, and fetches every file in parallel without a cap.

## Decisions (orchestrator, 2026-11-13)

- **Pure `resolvePackLink(link)`** (`core/packs/pack-link.ts`) returns `{ ok: true, manifestUrl, source }` or `{ ok: false, error }` (an i18n key):
  - `https://github.com/<owner>/<repo>` → `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/pack.json`;
  - `.../tree/<ref>/<path…>` → `.../<owner>/<repo>/<ref>/<path…>/pack.json` (`<ref>` is one path segment; no path → repo root);
  - `.../blob/<ref>/<path…>/pack.json` → the same file on raw;
  - any other `https://…/pack.json` (or `.json`) as is;
  - `http:`, other schemes, `github.com` links that aren't a repo, and blank input are refused. A trailing slash, `.git` and surrounding spaces are tolerated.
- **`validatePack`**: `licenseUrl` and `homepage` must be `https:` URLs (so no `javascript:` link can be rendered). All pack texts are shown through interpolation only, never `innerHTML`.
- **Limits** (spec): manifest ≤ 64 KB, each file ≤ 1 MB, pack ≤ 20 MB, PNG ≤ 256 × 256 (decoded through `ImageProcessingService`, the existing mocked boundary). Word lists go through their existing validators per generator; `masked` materials through the colorizer's `importConfig` against the sprite size.
- **Two steps in `PackBusiness`**: `prepare(link)` resolves the link, fetches and validates the manifest, downloads every file (at most 4 at a time), validates each, and returns a preview `{ manifest, source, size, counts: { generators per language, sprites per kind } }` or rejects with every error (file name + reason). Nothing is stored. `install(prepared)` stores it in one transaction with `source: { kind: 'unofficial', link, manifestUrl }`, enabled. An id equal to an official pack's (Base included) is refused; an id already installed from another link is refused; the same link replaces it (update).
- **Update**: `checkUpdate(id)` = `prepare(storedLink)` and returns the old and new `version`; installing it replaces the pack (files of the old one deleted). **Remove** reuses K03's.
- **K03 review fixes**: the per-pack object URL map is cached as a `Promise<Map>` and revoked after it settles; concurrent `enable(id)` share one in-flight promise; official downloads also use the cap of 4.
- **Packs page**: an "Ajouter un pack / Add a pack" button opens a `p-dialog`: a `p-inputtext` for the link and a "Vérifier / Check" button; then the preview (name, author, license link, source link, version, size, counts per generator and language, sprites per kind), the warning "Contenu non vérifié par les auteurs de l'application / Content not checked by the app's authors", and "Installer / Install"; errors as a list. Installed unofficial packs get their own section under the official ones: card with source link, version, toggle, "Mettre à jour / Update" (dialog with old → new version and Confirm) and Remove.
- The generators' Pack select (K04) and the Credits page (K03) pick up enabled unofficial packs with no change.

## Baseline

Test Files 213 passed, Tests 1783 passed.

## Seams

1. **Pure `resolvePackLink`** plus `validatePack`'s https-only links: every mapping and refusal above. Misses fetching.
2. **`PackBusiness` over a faked `PackService`, faked `ImageProcessingService` and fake-indexeddb**: `prepare` returns the preview and stores nothing; invalid manifest, bad word list, oversized or undecodable PNG, bad materials each reject with a named error and store nothing; `install` stores and enables it (its sprites and word lists then served); official id clash and other-link clash refused; `checkUpdate` + install replaces with the new version; at most 4 fetches in flight; two concurrent `sprites()` both get full URLs; double `enable` downloads once. Misses the dialog.
3. **Packs page component**: Add a pack flow (link → Check → preview with warning → Install → unofficial card appears), errors listed and nothing installed, Update dialog shows old and new versions. Misses layout (browser check).

## Red

- Test files: `src/app/core/packs/pack-link.spec.ts`, `src/app/core/packs/pack.spec.ts` (new `validatePack links` block), `src/app/core/business/pack-unofficial.business.spec.ts`, `src/app/core/business/pack-concurrency.business.spec.ts`, `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.unofficial.spec.ts`; fixture `src/testing/unofficial-pack.ts` (new).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file.
- Shapes the tests assume (green must match): `ImageProcessingService.dimensions(blob): Promise<{width,height}>` (faked in tests); `resolvePackLink` in `core/packs/pack-link.ts` (`source` = trimmed link without trailing slash/`.git`); `PackBusiness.prepare(link)` -> `{ manifest, source, size, counts: { generators: { <lang>: <number of word lists> }, sprites: { <kind>: n } } }`, rejects with an Error whose `message` (and optional `errors: string[]`) names every failing file path and reason, refuses official ids and ids from another link in `prepare`; `install(prepared)`; `checkUpdate(id)` -> `{ oldVersion, newVersion, prepared }`; `StoredPack.source` = `'official' | { kind: 'unofficial', link, manifestUrl }`. Page selectors: `unofficial-pack-card` (+ `data-pack`), `input[data-test="pack-link"]`, `pack-preview`, `pack-errors` (`li` per error), `pack-update`; English labels "Add a pack", "Check", "Install", "Update", "Confirm", "Remove from device", "Content not checked by the app's authors" (add to i18n en and fr).
- Failing:
  - pack-link.spec.ts (7 tests) — `./pack-link` does not exist (compile error).
  - pack.spec.ts: refuses a licenseUrl / homepage that is not an https URL (2) — `validatePack` accepts `javascript:`/`http:` links.
  - pack-unofficial.business.spec.ts (all 28 tests: prepare x19, install x4, update x2 and the rest) — `prepare`, `install`, `checkUpdate` do not exist on `PackBusiness` (compile error; the file cannot run until they exist).
  - pack-concurrency.business.spec.ts: two concurrent sprites() calls both get full object URLs — second call gets `imageUrl: ''` (map cached before filled).
  - pack-concurrency.business.spec.ts: two concurrent enable() calls download once — manifest fetched twice.
  - pack-concurrency.business.spec.ts: an official download fetches at most 4 files at a time — 13 in flight.
  - packs-tool-page.unofficial.spec.ts (6 tests: no unofficial pack and Add a pack button; Check shows preview and warning, stores nothing; Install adds the unofficial card; errors listed per file and no Install; unusable link error; Update dialog old and new versions then Confirm) — `prepare`/`install` missing (compile error); with those stubbed they fail on the missing "Add a pack" button and dialogs.

## Green

- Files: src/app/core/packs/pack-link.ts, src/app/core/packs/pack.ts, src/app/core/helpers/pool.ts, src/app/core/generators/pack-word-lists.ts, src/app/core/business/pack.business.ts, src/app/core/business/word-list.business.ts, src/app/core/services/pack-storage.service.ts, src/app/core/services/image-processing.service.ts, src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `resolvePackLink`, https-only `licenseUrl`/`homepage`, `ImageProcessingService.dimensions`, `PackBusiness.prepare/install/checkUpdate` (limits, per-generator validators, materials via `importConfig`, clash checks, `PackError` with `errors[]`), `StoredPack.source` union. K03 fixes: `Promise<Map>` object URLs revoked after settling, shared in-flight `enable`, 4-fetch cap (`runLimited`) for official and unofficial downloads. Packs page: Add a pack dialog, preview with warning, errors list, unofficial section, Update dialog. Skill/class word-list checks moved to `generators/pack-word-lists.ts`.
- Suite: 216/217 files, 1827/1828 tests (baseline 213/1783, plus 45 new red tests). One failure: `pack-unofficial.business.spec.ts` "fetches the manifest at the resolved URL and the files next to it". `npx tsc -p tsconfig.spec.json --noEmit` is clean, `ng build` has no error, no test file is modified.
- Open questions: that test seems wrong. It serves the manifest at a raw.githubusercontent.com URL but the fixture's JSON files (items, npcs, materials) only exist under `https://example.com/packs/neon/`, so the word lists 404 there and `prepare` rightly rejects. The test awaits `prepare` without a catch, yet "rejects a file that cannot be fetched" requires a rejection for a missing JSON. Fix the test (give the world files at that root) or drop the await.

## Review

- Verdict: fix first
- Must fix: src/app/core/business/pack.business.ts `install` (~l.530) — `storage.remove(id)` then `storage.install(...)` are two transactions; if the second fails (quota, closed DB) an update destroys the installed pack, and the ticket asks for one transaction — make `PackStorageService.install` replace the old files inside its own transaction (delete the id's range first) and drop the separate `remove`; add a test where install fails and the old pack survives.
- Consider: pack.business.ts `checkClash` — `registryEntries().catch(() => [])` skips the official-id refusal when the registry cannot load; fail closed (reject) instead.
- Consider: pack.business.ts `prepare` — the 1 MB / 64 KB limits are checked after the full download and JSON length is measured in characters; PNG dimensions are checked after decode (decompression bomb); acceptable for a client-only app, but check `Content-Length`/blob size early where possible.
- Consider: `prepare` — `root` is cut at the last `/` of the manifest URL, so a link with a query string containing `/` breaks; use `new URL(path, manifestUrl)`.
- Consider: pack.business.ts `prepare` — one long method (limits, checks, counts); split into fetch-image / fetch-json / counts helpers.
- Safe: https-only links (resolver and validatePack), no innerHTML or bypassSecurity, official/Base ids refused, `prepare` stores nothing, Promise<Map> URLs revoked after settling, shared `enable`, 4-fetch cap via `runLimited`, i18n in both files.

## Answer

- `resolvePackLink` (GitHub repo, `/tree/<ref>/<path>`, `/blob/…/pack.json` → `raw.githubusercontent.com`; any `https://…json` as is; `http:`, other schemes and non-repo GitHub links refused). `validatePack` requires `https:` for `licenseUrl` and `homepage`; pack texts are rendered by interpolation only.
- `PackBusiness.prepare(link)` downloads (at most 4 fetches at a time) and validates every file (manifest ≤ 64 KB, files ≤ 1 MB, pack ≤ 20 MB, PNG ≤ 256 × 256 via `ImageProcessingService.dimensions`, word lists through their validators, `masked` materials through `importConfig`), refuses official ids and ids installed from another link, and stores nothing; `install(prepared)` stores and enables it; `checkUpdate(id)` returns old and new versions. `StoredPack.source` is `'official' | { kind: 'unofficial', link, manifestUrl }`.
- K03 review fixes: object URLs cached as a `Promise<Map>` and revoked after it settles, one shared in-flight `enable(id)`, the 4-fetch cap for official downloads too.
- Packs page: "Ajouter un pack" dialog (link → Vérifier → preview with the "content not checked" warning → Installer, or a list of errors per file), an unofficial section with Update (old → new version, Confirm) and Remove.
- Review fixes (approved by the user): an update replaces the pack in one IndexedDB transaction (new `pack-update-atomic.business.spec.ts`: a failed write keeps the old pack); `checkClash` fails closed when the registry can't load; file URLs use `new URL(path, manifestUrl)`.
- Orchestrator fixes: one red test served the pack files at a different root than the manifest (fixed in the test); the K04 flaky `pack.business.spec.ts` came from packs stored by other spec files leaking through the shared fake IndexedDB, now a fresh `IDBFactory` per test (4 clean full runs).
- Checked in the browser: FR desktop, "Ajouter un pack" opens the dialog; an `http:` link shows "Le lien doit commencer par https://." with no request sent. EN at 375 px: the dialog fits, no horizontal scroll. No console error. No real pack repository exists, so installing, updating and removing are covered by tests only. Suite: 218 files, 1829 tests (baseline 213 / 1783); build clean. Review: ship after the fixes.
- Left for later: size limits are checked after download (not from Content-Length); `prepare` is one long method; an async IndexedDB error during install is not covered by a test.
