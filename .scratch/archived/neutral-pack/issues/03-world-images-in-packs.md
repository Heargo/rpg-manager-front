# World images as a pack asset

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (World images)

- Pack manifest gains world images (assumed `worldImages: [{ id, label, image, tags }]`), validated like sprites; neutral packs may carry them.
- The world wizard and world rules image picker show the active packs' world images (thumbnails, choose one); the world stores a reference or a copy (to decide: a copy works offline and for joined players).
- The pack creator gets a place to add them (Sprites tab or its own tab).
- FR/EN, 375 px.

To triage: copy vs reference, and where world images are shown today.

## Triage (orchestrator, 2026-11-17; the user asked to chain tickets without stopping)

- **Copy, not reference**: choosing a pack world image fetches it and stores it in the image store like an upload (the world keeps its `illustrationId`), so it works offline and for joined players and survives the pack being turned off.
- **Where shown today**: a world's illustration (`World.illustrationId`) appears on the world card and the table header; the wizard and the world rules page have the upload picker. Pack world images are offered next to "upload" in both.
- **Format** (assumed): manifest `worldImages: [{ id, label, image, tags?, source? }]`. `image` is a path in the pack (WebP / PNG / JPEG), `label` a plain string used as alt text and tooltip, `tags` short lowercase words (`mountain`, `night`…), `source` an optional https URL to the original artwork (shown in the picker and the credits). Validated like sprites (kebab ids, unique, files present, http(s) source). Neutral packs may carry them.
- **Pack creator**: its own "World images" tab is out of scope here (follow-up); the format, validation, picker and the built-in images are in scope.
- **NP04 (agent part) folded in**: the user provided 9 of the 11 landscapes (`~/Téléchargements/world-image/`, Vecteezy SVGs, already downloaded by the user, so the licence check is theirs). The orchestrator converted them to 1600 px WebP (q80) into `public/packs/base-assets/worlds/`. `vecteezy_ocean-background_273915.svg` clips everything through a missing `#XMLID_230_` (empty `<defs>`), so it was rendered with that clip removed. Not provided: 10551466 (mountain set) and 9155728 (seasonal nature); NP04 stays open for them.

| id | file | tags | source |
| --- | --- | --- | --- |
| `mountains-night` | worlds/mountains-night.webp | mountain, night | https://www.vecteezy.com/vector-art/7095576-mountains-in-the-night-sky-near-the-clouds-vector-flat-illustration-landscape |
| `blue-mountains-fog` | worlds/blue-mountains-fog.webp | mountain, fog, sunset | https://www.vecteezy.com/vector-art/7162595-beautiful-blue-mountain-landscape-silhouette-with-fog-and-sunrise-and-sunset-in-mountains-background-outdoor-and-hiking-concept-sun-in-the-sky-vector-good-for-wallpaper-site-banner-cover-poster |
| `arctic-iceberg-sunset` | worlds/arctic-iceberg-sunset.webp | ice, snow, ocean, sunset | https://www.vecteezy.com/vector-art/11513279-beautiful-sunset-arctic-or-antartic-iceberg-landscape-illustration |
| `desert-mountains` | worlds/desert-mountains.webp | desert, mountain | https://www.vecteezy.com/vector-art/23103479-abstract-flat-desert-mountain-landscape-vector-background-scenery-flat-desert-mountain-landscape-vector-background-earth-tone-scenery-flat-desert-mountain-landscape-vector |
| `green-valley-morning` | worlds/green-valley-morning.webp | plains, forest, mountain, morning | https://www.vecteezy.com/vector-art/12991429-cartoon-nature-landscape-early-morning-background |
| `underwater-wreck` | worlds/underwater-wreck.webp | ocean, underwater | https://www.vecteezy.com/vector-art/273915-ocean-background |
| `pine-mountains-morning` | worlds/pine-mountains-morning.webp | mountain, forest, morning | https://www.vecteezy.com/vector-art/8277964-landscape-of-mountains-and-pine-forests-in-the-morning-or-evening |
| `pine-mountains-winter` | worlds/pine-mountains-winter.webp | mountain, forest, winter | https://www.vecteezy.com/vector-art/8277965-mountain-landscape-with-pines-and-forests-under-winter-skies |
| `forest-mountains-silhouette` | worlds/forest-mountains-silhouette.webp | mountain, forest, river | https://www.vecteezy.com/vector-art/14487928-silhouette-of-nature-landscape-mountains-forest-in-background-blue-and-green-illustration |

Labels: English, readable from the id (e.g. "Mountains at night"). Credits page (FR/EN): "Landscapes from Vecteezy" with each image's own source link (Vecteezy's free licence requires attribution). The `base-assets` manifest's licence text mentions both the sprites (CC BY 4.0, Florian Sciberras) and the landscapes (Vecteezy free licence, attribution).

## Baseline

`npm test`: 316 test files, 3103 tests, all passed (2026-11-17, after NP01).

## Seams

- Pack validation (`validatePack`): `worldImages` accepted with valid entries, rejected for bad ids, duplicates, missing files, non-https sources; `base-assets` valid with the 9 images, each with its source above.
- The world image picker business / component used by the wizard and the world rules (rendered with `TEST_PROVIDERS` or the business directly): lists the active packs' world images; choosing one stores a copy in the image store and sets the world's `illustrationId`; upload still works. Misses 375 px (browser).
- The credits page (rendered): lists every `base-assets` world image with its source link.

## Red

- Test files: `src/app/core/packs/pack.world-images.spec.ts`, `src/app/core/business/pack.world-images.business.spec.ts`, `src/app/modules/world/business/world-library.world-image.spec.ts`, `src/app/modules/home/pages/credits-world-images.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (once per file)
- Seams chosen: `validatePack` accepts `worldImages`; `PackBusiness.worldImages()` returns the active packs' images as `{ id, label, tags, source?, packId, imageUrl }` (imageUrl `packs/<pack>/<image>`); `WorldLibraryBusiness.chooseWorldImage(image): Promise<string>` fetches `imageUrl`, stores a copy via the image store, returns the image id (the wizard sets `imageId` with it); the credits page has a `[data-test="world-images"]` section with each source link. The world rules page has no image picker today (only the wizard does); the picker UI is covered through the business, not a component test.
- Failing: 21 + 2 + 5 (compile error, missing method) + 1 tests
  - pack.world-images.spec.ts (21 of 22; "still accepts a pack without world images" passes as a regression guard):
    - accepts a neutral pack with world images — `worldImages` is an unknown field
    - rejects the id (4 cases), an id used twice, label/image path, non-https source, bad tags, non-list — no `worldImages` validation (unknown-field error only)
    - base-assets valid with 9 images, 9 per-image cases (tags, source, file, `worlds/<id>.webp`), licence mentions Vecteezy — manifest has no `worldImages` yet
  - pack.world-images.business.spec.ts (2) — `PackBusiness.worldImages` does not exist
  - world-library.world-image.spec.ts (5, incl. the upload regression in the same file that fails to compile) — `WorldLibraryBusiness.chooseWorldImage` does not exist
  - credits-world-images.spec.ts (1) — no `[data-test="world-images"]` section with 9 Vecteezy links

## Green

- Files: `src/app/core/packs/pack.ts`, `src/app/core/business/pack.business.ts`, `src/app/modules/world/business/world-library.business.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html,scss}`, `src/app/modules/home/pages/credits-page.component.ts`, `public/packs/base-assets/pack.json`, `public/i18n/{en,fr}.json`, `ngsw-config.json`, `user-docs/src/content/docs/{worlds,create-pack}.md` and `en/{worlds,create-pack}.md`
- Change: `worldImages` in the pack format and `validatePack` (kebab id, unique, label, relative WebP/PNG/JPEG path, lowercase tags, https source); `base-assets` lists the 9 landscapes (licence text in `author` mentions Vecteezy; `license` stays CC-BY-4.0 for the existing tests); `PackBusiness.worldImages()`; `WorldLibraryBusiness.chooseWorldImage()` stores a copy (fixes the blob type from the extension); wizard thumbnail grid (labelled buttons, tooltip, aria-pressed, wraps) next to the upload; credits section with each source link; `worlds/**` in the service worker; docs FR/EN.
- Suite: 320 files, 3133 tests, all pass (baseline 316 files, 3103 tests); tsc clean, ng build no error. Not checked in a browser at 375 px.
- Open questions: the world rules page has no image picker today, none added. Unofficial/downloaded packs: `prepare()` does not download `worldImages` files (sprite limits of 256 px do not fit), so only built-in packs offer images for now; follow-up with the pack creator tab. Credits list the images of the active packs (base-assets by default), not always.

## Review

- Verdict: fix first
- Must fix: `src/app/modules/home/pages/credits-page.component.ts:~182` — credits use `PackBusiness.worldImages()`, which follows `activeIds()` (the open world's packs), so with a world whose pack list omits `base-assets` the bundled Vecteezy images vanish from the credits while still shipping in the app (the licence asks for attribution wherever they ship) — read the `base-assets` manifest directly (or add a business method returning every built-in pack's world images regardless of activation) and add a spec with `$worldPacks` set without `base-assets`.
- Consider:
  - `pack.json:5` — Vecteezy licence text lives in `author`; cleaner: keep `author` as "RPG Manager" plus a new optional manifest field (e.g. `credits: string`) or keep a single `license` string; the specs only pin `license`/`licenseUrl` to CC-BY-4.0, which a new `credits`/`notice` field leaves intact. Acceptable as is for now; per-image `source` already carries the precise attribution.
  - Ticket says `source` is shown in the picker too; the wizard grid shows only label tooltip, no source link.
  - `world-new-page.component.html` — a `<ul>` of buttons with `aria-label`, `aria-pressed`, `:focus-visible` is keyboard-accessible; but it uses native `<button>`/`<img>` rather than an Optimus component (acceptable for an image tile; no Optimus equivalent). `minmax(6rem,1fr)` with `min-width:0` does not overflow at 375 px.
  - `world-library.business.ts` — long one-line `IMAGE_TYPES`/`type` expression; split for readability. `credits-page.component.ts` has unrelated reformatting (import wrap, `spritesPackUrl`).
- Checked OK: the 9 source URLs match the ticket table exactly; validation (kebab id, unique, label, relative WebP/PNG/JPEG path, lowercase tags, https source) is in place; `chooseWorldImage` fetches and stores a copy via `uploadImage`; strings in both FR/EN; `worlds/**` in ngsw; no secrets.

## Red (review round)

- Test files: `pack.world-images.spec.ts` (notice + author), `base-assets-pack.spec.ts` (author "RPG Manager"), `credits-world-images.spec.ts` (credits independent of the world's packs, notice shown), new `src/app/modules/world/pages/world-new-page/world-new-page.world-images.spec.ts` (wizard component: source link per image, `target="_blank"`, `rel` noopener)
- Failing: 10 tests (6 notice/author validation, 1 base-assets author, 2 credits, 1 wizard source link)

## Green (review round)

- Files: `src/app/core/packs/pack.ts`, `src/app/core/business/pack.business.ts`, `src/app/modules/world/business/world-library.business.ts`, `src/app/modules/home/pages/credits-page.component.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.component.{html,scss}`, `public/packs/base-assets/pack.json`, `public/i18n/{en,fr}.json`
- Change: `PackBusiness.builtInCredits()` reads the built-in manifests (notices and world images) regardless of the open world, and the credits page uses it. Optional manifest `notice` is validated and returned; `base-assets` has author "RPG Manager" and a notice crediting the sprites (Florian Sciberras, CC BY 4.0) and the Vecteezy landscapes. The wizard grid has a small source link per image (new tab, noopener, aria-label "Source of {label}", FR/EN) that does not select it. `IMAGE_TYPES` split; unrelated reformatting of `credits-page.component.ts` reverted. The prefix/suffix credit keys are replaced by the notice.
- Suite: 321 files, 3141 tests, all pass; ng build has no error; no test file modified. Not checked at 375 px in a browser.
- Open questions: none

## Review (review round)

- Verdict: ship
- Must fix: none
- Consider: `world-new-page.component.scss:267` — the source link is a 1.5rem (24 px) circle, below the usual 44 px touch target on a phone; acceptable as a secondary action, enlarge if the 375 px browser check finds it hard to tap. Not checked in a browser or by running the suite.
- Checked: `PackBusiness.builtInCredits()` reads the built-in manifests, independent of the open world; `notice` is validated and shown on the credits page; `base-assets` author is "RPG Manager" and its notice keeps the Florian Sciberras CC BY 4.0 credit plus the Vecteezy text (the sprites card on the credits page is unchanged); wizard source links open in a new tab with noopener, labelled FR/EN and sit outside the select button; `IMAGE_TYPES` split and the unrelated reformatting reverted.

## Answer

- Pack format: optional `worldImages: [{ id, label, image, tags?, source? }]` (kebab unique ids, relative WebP/PNG/JPEG paths, lowercase tags, https sources) and an optional `notice` string, both validated.
- `base-assets` ships the 9 user-provided Vecteezy landscapes (1600 px WebP, 724 KB in all) with their exact source links; author "RPG Manager"; notice credits the sprites (Florian Sciberras, CC BY 4.0) and the Vecteezy landscapes. Service worker caches `worlds/**`.
- The world wizard offers the active packs' world images next to upload (3-column grid on a phone, keyboard-selectable, `aria-pressed`, a source link per image in a new tab). Choosing one stores a copy in the image store (same 512 px resize as an upload), so it works offline and for joined players.
- The credits page lists the built-in packs' notices and world images with source links, whatever the open world's packs (`PackBusiness.builtInCredits()`).
- One review round (credits tied to the open world → fixed; licence prose moved from `author` to `notice`; source links in the picker).
- Checked: suite green (321 files); build clean; review ship. Browser at 375 px FR (fresh origin): 9 thumbnails load, choosing one sets the preview, source links open in a new tab, credits list 9 Vecteezy links and the notice; no console error.
- Not done: no picker on the world rules page (none exists today); the pack creator has no World images tab; unofficial packs' world images are not downloaded by `prepare()`; the source link circle is 24 px (small to tap). Two landscapes from NP04's list were not provided.
