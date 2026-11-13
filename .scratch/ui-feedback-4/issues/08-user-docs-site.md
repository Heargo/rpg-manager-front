# User documentation: Starlight site, theme, /docs

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (User documentation)

- Starlight project in `user-docs/` (its own package or a workspace; it doesn't change the Angular build), FR (default) and EN, `base: '/docs'`.
- Sidebar by functional module (the list in the spec), one stub page per module per language.
- Theme close to the app: palette (bordeaux primary, surfaces, dark mode) from the app's tokens through Starlight's CSS custom properties, the app's fonts, logo and favicon.
- npm scripts at the root: `docs:dev`, `docs:build`.
- Netlify: the build also builds the doc into `dist/.../docs`; `public/_redirects` serves `/docs/*` before the SPA catch-all; `ngsw-config.json` navigation URLs exclude `/docs`. A "Help" link in the footer and the nav bar.
