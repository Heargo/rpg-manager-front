# Full-width footer, shared by the landing and the static pages

Status: resolved
Type: task
Blocked by: 10

User feedback (2026-11-07): "the footer should take all width, and modernize the credit, contact and policy pages (they should have the footer too)".

## Direction

- **Shared footer component** (`app-site-footer` in `modules/home/components/`), used by the landing, `/credits`, `/contact` and `/privacy-policy`:
  - **Width:** spans the full viewport width (edge to edge, with its own background band and top border), with its content aligned to the page's content width inside.
  - **Content:** keeps the quiet style from U10: the app name and logo mark on the left; Credits, Contact and Privacy links on the right; and a muted line such as "No account, no server: your data stays in your browser."
  - **Placement:** on each of the four pages it sits at the bottom of the page (the page fills at least the viewport).
- **Static pages, same visual language as the new landing:**
  - a page header with a title and a one-line lead;
  - a readable content column (about 44rem);
  - sections as cards or clearly separated blocks with h2 headings;
  - **Credits:** libraries as a tidy grid or list of cards (name, licence badge as `p-tag`, link), plus groups for tools and for the legacy app;
  - **Privacy:** each section with an icon and a short title, and the "what stays on your device" section first and highlighted;
  - **Contact:** the form in a card with a short intro beside or above it; on success, a clear confirmation state.
- Existing hooks and tests stay green: the landing `footer-*` and `content` hooks, the static-page h1 tests, the keyword tests and the contact form hooks.
- New test: each of the four pages renders `app-site-footer` with the 3 links.
- Checked in the browser at 1280 px and 375 px.

## Green

- Files: src/app/modules/home/components/site-footer/site-footer.component.ts (new), src/app/modules/home/pages/static-page.scss (new), home-page/home-page.component.{html,scss,ts}, pages/{credits,privacy,contact}-page.component.ts, pages/static-pages.spec.ts (new footer test only), public/i18n/{en,fr}.json (home.footerTagline, home.footerNav)
- Change: shared full-width `app-site-footer` (logo + name, 3 links with the `footer-*` hooks, tagline) placed at the bottom of the landing and of the three static pages (min-height viewport layout). Static pages restyled: header with h1 + lead, 44rem column, cards; credits as a grid of cards with `p-tag` licence; privacy sections with icons and the "local" one highlighted; contact form in a card.
- Suite: home specs 4 files / 30 tests pass (incl. the new footer test); `tsc -p tsconfig.app.json` clean. Full suite, ng build and browser check at 1280/375 px not run.
- Open questions: the contact success state is the existing p-message with a check icon (no larger confirmation panel).

## Answer

- **`app-site-footer`** (`home/components/site-footer/`):
  - full width: its host cancels the global body margin, so it reaches both edges and the bottom with no horizontal scroll;
  - the logo mark and name on the left, the 3 links on the right, and the tagline "No account, no server: your data stays in your browser";
  - used by the landing, `/credits`, `/contact` and `/privacy-policy`, where it sits at the bottom of the page.
- **Static pages** share `pages/static-page.scss`: a page header with an h1 and a lead, a 44rem column, and card sections.
  - **Credits:** a grid of library cards with `p-tag` licence badges, then cards for the tools and the legacy app.
  - **Privacy:** an icon per section, with "what stays on your device" first and highlighted.
  - **Contact:** the form, or with no key a clear info message, inside a card.
- **Checked:**
  - Home specs 4 files, 30 tests; full suite 88 files, 580 tests; build OK.
  - Browser at 1280 px: footer x 0 to 1280 at the bottom, the contact "unavailable" message readable. At 375 px: credits and footer stack, with no horizontal scroll.
  - The dev server had to be restarted: it was serving a stale build after the parallel work's transient errors.
- **Note:** the two i18n keys (`home.footerTagline`, `home.footerNav`) landed in the U05 commit, because both tickets edited the same files in parallel.
