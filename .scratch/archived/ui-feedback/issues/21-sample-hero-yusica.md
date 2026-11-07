# Sample hero: Yusica, with a portrait by Yuumei

Status: resolved
Type: task

User request (2026-11-08): name the example hero "Yusica" and use a portrait by Yuumei (yuumeiart.com).

## Licence (checked 2026-11-08)

Yuumei's FAQ (https://www.yuumeiart.com/faq): her art may be posted on your own site "as long as you credit me as the original artist, and provide a link to my website"; no selling or profiting. The app is free and non-commercial, so the use is allowed with the credit and link. Her watermark stays on the image. (A WLOP piece was considered first and dropped: no licence for reuse.)

## Direction

- **Image:** `public/images/sample-hero.webp` (600 px wide, from the user's file, watermark kept).
- **Sandbox character** (sheet tool and sandbox world): named "Yusica" in both languages (a proper name, not translated), with the bundled image as its portrait. Today portraits are stored images (`portraitId`); add an optional bundled portrait URL path for the sandbox character only, used by the card, so `app-stored-image` (or the card) shows `images/sample-hero.webp` when the character has no stored portrait but a sample portrait. Players' characters are unchanged.
- **Credits page:** a new "Illustrations" section with "Sample hero portrait: art by Yuumei", linked to https://www.yuumeiart.com/, noting it's used with credit as her FAQ allows. FR and EN.
- **Tests:** the sandbox character is named Yusica and has the sample portrait; the card shows the bundled image when given; the credits list Yuumei with the link.

## Green

- Files: src/app/modules/world/models/world.ts, src/app/core/components/stored-image/stored-image.component.ts, src/app/modules/character/components/character-card/character-card.component.html, src/app/modules/tools/business/sandbox-character.business.ts, src/app/modules/home/pages/credits-page.component.ts, public/i18n/en.json, public/i18n/fr.json; tests: sandbox-character.business.spec.ts, character-card.component.spec.ts, static-pages.spec.ts
- Change: `Character.samplePortrait` (optional bundled path); the sandbox character is named "Yusica" with `images/sample-hero.webp` (the unused `tools.sheet.sampleName` key is removed). `app-stored-image` gets a `fallbackSrc` input, used by the card when no stored portrait exists. Credits page has an "Illustrations" section crediting Yuumei, linked to https://www.yuumeiart.com/ (EN/FR).
- Tests failing before the implementation (once the type field existed; before that they did not compile): "starts with a sample character carrying the default items" (now Yusica + sample portrait), "shows the bundled sample portrait when the character has one" (card), "credits Yuumei with a link to her site, in both languages" (static pages).
- Suite: 747/747 pass (baseline 744 + 3 failing new/updated); tsc clean; build OK. The only unstaged test files are the three above, edited by this ticket.
- Open questions: none

## Answer

- **Portrait:** `public/images/sample-hero.webp` (600 × 780, Yuumei watermark kept). `Character.samplePortrait` (optional, sandbox only) is shown by the card through the new `fallbackSrc` of `app-stored-image` when there's no stored portrait.
- **Name:** the sandbox character is "Yusica" in both languages (the `tools.sheet.sampleName` key is removed).
- **Credits:** an "Illustrations" section: "Sample hero portrait: art by Yuumei", linked to https://www.yuumeiart.com/, used with credit as her FAQ allows (EN and FR).
- **Fix by the orchestrator:** the new credits keys had landed under `home` instead of `credits`, so the page showed raw keys. They were moved; the static-page spec didn't catch it (Consider: assert that no raw `credits.` key is rendered).
- **Checked:**
  - Suite green, build OK.
  - Browser at 1440 and 375 px: the portrait covers the card, the overlay is readable, no horizontal scroll.
  - Browser `/credits`: the French text and the Yuumei link render.
