# Documentation: using and creating packs

Status: resolved
Type: task
Blocked by: 04, 05, 07, 08

Spec: `../spec.md` (User documentation)

- User page "Packs" in the Starlight docs (FR and EN): turning packs on, the pack select, adding an unofficial pack and its risk, with screenshots (Playwright script).
- Author page "Create a pack": manifest reference, folder layout, sprite kinds, limits, a minimal example repository, building one with the pack creator (export to zip, push to GitHub), testing with "Add a pack".

## Answer

- Two new doc pages in French and English (4 pages), in the sidebar under "Plus / More" after Tools:
  - **Packs de contenu / Content packs** (`packs.md`): the Base pack, the three sprite kinds, official packs downloaded on demand and offline, adding a pack from a GitHub or https link (Check, preview, Install, errors), the caution about unchecked content, Update and Remove, credits, and the Pack select next to the seed (Random from the seed, Base fallback, skills and classes).
  - **Créer un pack / Create a pack** (`create-pack.md`): the pack creator tab by tab, the colorizer link (K08), Install and Export, Edit as a draft, publishing on GitHub (repository, folder link, new versions), and a format reference: a minimal repository layout, a full `pack.json`, a field table, sprite types, slots and kinds, path rules and limits.
- The Tools page (FR and EN) now points to the packs page from the sprite library paragraph.
- `user-docs/screenshots/packs.shot.ts` takes 7 screenshots per language: the Packs page, the Base details, the Add a pack preview (a demo pack served through Playwright's request interception at a fake GitHub raw address, so no network is needed), the Pack select, and the creator's Details, Word lists and Publish tabs.
- App fixes found while taking the screenshots: the preview said "1 listes de mots / 1 word lists" (now "Listes de mots : 1 / Word lists: 1"), and the French "Modifier dans le colorizer" now reads "Modifier dans le coloriseur" like the rest of the French docs.
- Checked: `npm run docs:build` completes (the 404 and sitemap warnings are older); the four pages are built; each of the 7 screenshots is used once per language and every image loads; every internal `/docs` link on the new pages resolves. In the browser: the FR Packs page with its 4 images and the caution box, the EN Create a pack page with its 3 images, table and code blocks, no horizontal scroll at 375 px. App suite: 1906 tests pass; `table-npcs.business.spec.ts` failed once in five full runs and passed alone three times (unrelated, intermittent).
