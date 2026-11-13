# User documentation: Starlight site, theme, /docs

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (User documentation)

- Starlight project in `user-docs/` (its own package or a workspace; it doesn't change the Angular build), FR (default) and EN, `base: '/docs'`.
- Sidebar by functional module (the list in the spec), one stub page per module per language.
- Theme close to the app: palette (bordeaux primary, surfaces, dark mode) from the app's tokens through Starlight's CSS custom properties, the app's fonts, logo and favicon.
- npm scripts at the root: `docs:dev`, `docs:build`.
- Netlify: the build also builds the doc into `dist/.../docs`; `public/_redirects` serves `/docs/*` before the SPA catch-all; `ngsw-config.json` navigation URLs exclude `/docs`. A "Help" link in the footer and the nav bar.

## Baseline

Test Files 200 passed, Tests 1691 passed.

## Seams

1. **Pure helper `core/helpers/docs-url.ts`** `docsUrl(lang)`: French at `/docs/`, English at `/docs/en/`.
2. **Components (`TEST_PROVIDERS`)**: the footer has a 4th link `footer-help` to the doc in a new tab; the avatar menu has Help (in and out of a world) to the doc in the app language, in a new tab. Misses: the Starlight site itself, the build and the service worker (checked on the production build in the browser).

## Answer

- **Starlight** project in `user-docs/` (own `package.json` and lockfile, so Astro's Vite stays apart from Angular's): `@astrojs/starlight` 0.42.7 and `astro` 7.4.4, pinned (both over two weeks old). French at the root, English under `/en/`, `base: '/docs'`, built into `dist/panel/browser/docs`. Sidebar in four groups (Get started; Prepare a game: worlds, items, NPCs, classes and skills; Play: host and join, table, characters, combat, dice; More: tools, credits and privacy) with one stub page per module and language (a one-paragraph intro and a "to be filled in, with screenshots" note) for H09/H10, a splash home page, built-in search.
- **Theme** (`src/styles/theme.css`): the app's bordeaux primary as accent, the paper surface scale for grays and backgrounds in light and dark, notes in paper tones, the Recursive font, the app's logo as logo and favicon.
- **Scripts**: `npm run docs:dev` (http://localhost:4321/docs/), `npm run docs:build`; `npm run build` (Netlify's build command) now builds the app then the doc, installing the doc's packages first. Also a `docs` entry in `.claude/launch.json`.
- **Hosting**: `public/_redirects` sends unknown `/docs/*` paths to the doc's 404 before the app's catch-all; `ngsw-config.json` gets `navigationUrls` that leave `/docs` alone, otherwise the service worker would answer `/docs/` with the app.
- **Help links**: "Aide / Help" in the avatar menu (after Profile, in and out of a world) and in the footer, opening the doc in the app language in a new tab (leaving the app in the same tab would close a hosted room). README updated.
- Not done: the sitemap is skipped (Starlight needs the site's domain in `site`, unknown here). Under `npm start` the app's Help link opens the app's own 404 (the Angular dev server has no `/docs`); use `npm run docs:dev` or a production build.

Checked in the browser on the production build (`front-prod`): `/docs/` home in the app's colours and font; an English module page with sidebar, active page and pager in the app's colours; with the app's service worker active and in control, `/docs/items/` serves the doc, not the app; the footer Help link is `/docs/` (FR) and the avatar menu's Help is `/docs/en/` (EN), both in a new tab; dark mode and 375 px without horizontal scroll. `npm run docs:dev` serves the English home. Suite: 201 files, 1696 tests (5 new); build clean.
