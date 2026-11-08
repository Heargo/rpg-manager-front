# Landing, tools, credits, contact, privacy pages

Status: resolved
Type: task

Spec rows 1 and 12. Landing with pitch + screenshot, footer links; tools page as `p-card` link grid (Watabou, Azgaar, Squoosh); credits/contact/privacy as static pages. Replaces the Angular starter on `/`.

**Note (from L11):** the external tools page already exists (`/tools/links`, Tools menu). Link to it from the landing page instead of making another one.

## Baseline

`npm test`: 81 test files, 519 tests, all passed (2026-11-07, `develop` at 05a039e).

## Decisions (user, 2026-11-07)

- **Contact form, as on heargo.dev** (`/home/hugo/dev/heargo.dev/src/components/ContactForm.vue`):
  - name, email and message are POSTed to Web3Forms (`https://api.web3forms.com/submit`) with an `access_key`;
  - here it is submitted with `fetch`/HttpClient (no redirect away from the app), with a success or error message;
  - **the key is read at build time from an environment variable** (`CONTACT_KEY`), set locally in a gitignored `.env` and in the host's build environment, and never committed (`.env*` added to `.gitignore`);
  - with no key at build, the page shows a neutral "contact form unavailable" note instead of the form.
- **Screenshot:** the orchestrator captures one of the app in the browser and saves it as `public/images/landing-screenshot.webp` (the landing uses that path; the file is added in the browser step).
- **Privacy page:** must say what leaves the device:
  - STUN sees an IP;
  - the signalling mailbox holds connection codes for at most 30 minutes;
  - the relay (if used) carries encrypted traffic;
  - Web3Forms receives contact messages;
  - everything else stays in the browser (localStorage, IndexedDB).
- The external tools page already exists (`/tools/links`): link to it from the landing, don't rebuild it.

## Seams

Confirmed with the user (2026-11-07):

1. **Landing page** (`TEST_PROVIDERS`): pitch, screenshot, calls to action to `/play` and `/tools/links`, and a footer with Credits, Contact and Privacy links. Misses layout.
2. **Static pages** (credits, contact, privacy) are routed and render, and every key of their text is present in both `en.json` and `fr.json`. Misses wording quality.
3. **Contact form** (`TEST_PROVIDERS`, mocked HTTP): it POSTs name, email, message and the key to Web3Forms; shows success or error; required fields are validated; with no key, the form is replaced by the unavailable note. Misses the real Web3Forms service.

## Red

- Test files: `src/app/modules/home/home-page/home-page.component.spec.ts`, `src/app/modules/home/pages/static-pages.spec.ts`, `src/app/modules/home/pages/contact-page.component.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (one per file)
- Contracts the green must follow:
  - `CONTACT_KEY`: `InjectionToken<string>` exported from `src/app/core/constants/contact-key.ts` (`''` when no build key); routes `/credits`, `/contact`, `/privacy-policy` in `app.routes`; i18n top-level sections `home`, `credits`, `contact`, `privacy` with identical keys in en/fr.
  - `data-test` hooks. Landing: `pitch`, `screenshot` (img, src `images/landing-screenshot.webp`, with alt), `cta-play` (`/play`), `cta-tools` (`/tools/links`), `footer-credits`, `footer-contact`, `footer-privacy`. Contact: `contact-name`, `contact-email`, `contact-message`, `contact-submit`, `contact-success`, `contact-error`, `contact-unavailable`. Each static page has an `h1`; credits mention Watabou; privacy mentions STUN, "30 minutes", Web3Forms, IndexedDB (en), and STUN, "30 minutes", Web3Forms (fr).
  - Contact POSTs a JSON body `{ name, email, message, access_key }` to `https://api.web3forms.com/submit` via HttpClient.
- Failing: 19 tests (5 landing, 8 static, 6 contact)
  - landing: replaces the Angular starter — still shows "Hello, World"
  - landing: shows a translated pitch — no `pitch` hook
  - landing: shows the app screenshot — no `screenshot` hook
  - landing: calls to action — no `cta-*` links
  - landing: footer links — no `footer-*` links
  - static: credits renders title and Watabou — `/credits` not routed (redirects to `''`)
  - static: contact page renders a title — `/contact` not routed
  - static: privacy policy (en) — `/privacy-policy` not routed
  - static: privacy policy (fr) — `/privacy-policy` not routed
  - static: same keys en/fr for `home`, `credits`, `contact`, `privacy` (4 tests) — sections missing from both JSON files
  - contact (6 tests: POST, success, error, empty form, invalid email, no key) — whole file fails to compile: `core/constants/contact-key` does not exist

## Green

- Files: `src/app/modules/home/{home.routes.ts,home-page/*,pages/{credits,contact,privacy}-page.component.ts,business/contact.business.ts,services/contact.service.ts,services/contact.service.spec.ts}`, `src/app/core/constants/contact-key.ts`, `src/app/app.routes.ts`, `public/i18n/{en,fr}.json`, `scripts/ng-with-env.mjs`, `package.json`, `.env.example`, `README.md`, `src/testing/test-providers.ts`
- Change: Landing and static pages are lazy routes; contact form via `ContactBusiness` -> `ContactService` (a 2xx with `success: false` now errors; new service spec). Review fixes: privacy text names Google STUN, the retry-only Open Relay via the Netlify function, Netlify hosting and "unavailable after 30 minutes, then purged" (new `hosting` section, FR/EN); `ng-with-env.mjs` uses `||`, runs ng through `process.execPath` and the ng bin, and warns on an empty key; README notes the key is public in the bundle; credits add Angular CDK, OpenNG Icons, tslib.
- Suite: 85 files, 540 tests all passed (baseline 81/519). tsc clean; build OK, initial 964.53 kB, budget unchanged; no test file in unstaged diff.
- Open questions: `src/testing/test-providers.ts` now uses `provideRouter([])` (its catch-all `**` shadowed the specs' routes); all other specs pass.

## Review (re-check)

- Verdict: ship
- Must fix: none. Privacy text now names Google STUN, the retry-only Open Relay via the Netlify function, Netlify hosting and "unavailable after 30 minutes, then purged" (EN and FR).
- Consider: none. `||`, execPath runner, empty-key warning, README public-key line, `success:false` as error and the three credits are all in place.

## Answer

Built:

- The landing on `/` replaces the Angular starter. It has the pitch, the screenshot (`public/images/landing-screenshot.webp`, 580×480, English character sheet), the calls to action "Start playing" (`/play`) and "Discover the tools" (`/tools/links`), and footer links to Credits, Contact and Privacy.
- `/credits`, `/contact` and `/privacy-policy`:
  - all are lazy routes (`routesHome`), with real FR and EN texts;
  - the credits list the libraries in `package.json` with their licences, the external tools and the legacy app;
  - the privacy page names Google STUN, the signalling mailbox (unavailable after 30 minutes, then purged), the retry-only Open Relay TURN through our Netlify Function, Netlify hosting, Web3Forms, and local storage.
- Contact form, as on heargo.dev:
  - `ContactBusiness` → `ContactService` POSTs `{name, email, message, access_key}` to Web3Forms;
  - a 2xx with `success:false` counts as an error;
  - required fields and the email are validated, and double submits are guarded.
- The key comes from `CONTACT_KEY` at build time:
  - `scripts/ng-with-env.mjs` (used by `npm start` and `npm run build`) reads the environment or the gitignored `.env`, passes it as a `define`, and warns when it's empty;
  - with no key, the page shows "contact form unavailable";
  - `.env.example` and a README note; `.env*` added to `.gitignore`;
  - the key is public in the bundle by design.

Checked:

- Suite: 85 files, 540 tests (baseline 81 / 519). The build is OK, and the initial bundle went down to 964.53 kB because the landing is now lazy.
- Browser:
  - the landing in French, with the screenshot loaded and its 5 links;
  - the contact page without a key shows the unavailable note;
  - the credits list jsQR and Watabou;
  - the privacy page in English at mobile width.
  - No console error, no horizontal scroll.
- Not checked: a real Web3Forms submission, which needs the user's key.

`src/testing/test-providers.ts` now uses `provideRouter([])`: its catch-all route shadowed the routes in the specs.
