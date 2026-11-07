# Modernize the landing content section; footer at the bottom

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Landing and brand). User feedback (2026-11-07), with the before screenshot `refs/landing-content-before.png`: "this section is ugly, modernize it (also the footer should be stuck at the bottom of the page)".

## Problems in the current section

- The pitch is a plain grey paragraph with no heading; the buttons are stacked and left-aligned under it, so the column looks unfinished.
- The screenshot is cut at the bottom and floats, with no frame.
- The footer links are default blue underlined links, and the footer sits mid-screen with empty space below.

## Direction (decided by the orchestrator; the user reviews it in the browser)

- **Section heading and lead:** a short heading ("Your table, in the browser" / "Votre table, dans le navigateur") above the pitch, in the app's type scale. The pitch is set as a lead paragraph with comfortable line length and the app's text colour, not muted grey.
- **Actions:** "Start playing" (primary) and "Discover the tools" (secondary) sit side by side, and wrap on mobile.
- **Screenshot:** shown in a framed "app window" card with rounded corners, a soft shadow and a slight tilt or overlap. It is not cropped mid-tile: it fades out at the bottom.
- **Highlights:** a row of three feature cards below, each with an icon, a title and one line:
  - build your world (attributes, items, characters);
  - play together, peer to peer, with no account or server;
  - tools that work without a game (dice, item generator, sheet).
  On mobile they stack.
- **Footer:**
  - stuck at the bottom of the page: the content section plus footer fill at least the viewport below the hero, so on tall screens the footer sits at the bottom edge, not mid-screen;
  - quiet styling: muted small links with no default blue, underline on hover, a thin top border, and the app name or logo on the left.
- Uses the app's colour tokens; works in dark mode and at 375 px with no horizontal scroll.

## Tests

The existing landing tests and hooks (`pitch`, `screenshot`, `cta-play`, `cta-tools`, `footer-*`, `hero`, `content`, `scroll-arrow`) must stay green. The new highlights get a `data-test="highlights"` test with 3 items. The look is checked in the browser at 1280 and 375 px, in light and dark mode.

## Green

- Files: src/app/modules/home/home-page/home-page.component.{html,ts,scss,spec.ts}, public/i18n/en.json, public/i18n/fr.json
- Change: Added an h2 heading and lead pitch, a framed tilted "app window" screenshot that fades out at the bottom, a three-card `highlights` list (pi-box, pi-wifi, pi-wrench; new `home.*` strings in EN/FR), and a quiet footer with the app name. `.content` now fills the viewport below the hero and the footer uses `margin-top: auto`. One new spec for the highlights; all hooks unchanged.
- Suite: landing spec 10/10 pass; `ng build` clean. `tsc` on the spec config only reports errors from the other agent's in-progress money specs (coin-display, coin-input, money.rules); none in home. Full suite not run because of that parallel work.
- Open questions: look not checked in the browser (1280/375, light/dark).

## Answer

- Content section: an h2 heading ("Your table, in the browser"), the pitch as a lead paragraph, the two calls to action side by side (wrapping on mobile), the screenshot in a tilted "app window" frame that fades out at the bottom, and three highlight cards (build your world, play together, tools without a game).
- Footer: quiet muted links with an underline on hover, a thin top border and the app name on the left. `.content` fills the viewport below the hero, so the footer sits at the bottom edge (bottom 776 px of an 800 px viewport).
- Checked:
  - Landing spec 10/10, `ng build` OK.
  - Browser at 1280 px and at 375 px (cards stack, no horizontal scroll).
- Dark mode: forcing the `.dark` class shows `--p-content-background` staying light while the text turns white. That is app-wide, not this page: nothing in the app ever sets `.dark`, so dark mode is unreachable today. Noted as a follow-up.
