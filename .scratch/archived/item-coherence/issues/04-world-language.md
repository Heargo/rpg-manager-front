# The world has a language

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Decision 7, Assumed: world language, other-language packs in the rules).

- `World` gets `language` (`en` | `fr`). New world: the app language. A stored world without it reads as the app language. The sandbox world follows the app language.
- The wizard's Rules step and the rules page show a language select (Optimus UI `p-select`) above the packs.
- In the packs list, a pack in another language than the world's is tagged "images, kinds and tints only". A neutral pack is tagged "images".
- The world language is what the generators will read (05); nothing else changes here.

## Decisions (orchestrator, 2026-11-14)

- `World.language: PackLanguage` (required on the stored model), `WorldDraft.language?` / rules update `language?` like `packs`. `WorldLibraryBusiness.create` defaults it to the app language; a stored world without it reads as the app language (like `packs`). Export/import keeps it.
- The language select lives in `RuleFields` next to the packs (it already edits `packs` through the draft model), so the wizard Rules step, the world rules page and the Tools rules page all get it. Optimus UI `p-select`, options "Français" / "English".
- Pack tags in the packs list: a pack whose `language` differs from the selected world language gets "images, kinds and tints only" (i18n `world.packs.otherLanguage`); a neutral pack gets "images" (`world.packs.neutral`); the language tag of a neutral pack is hidden (it already is in rule fields).
- Sandbox world: `language` follows the app language unless the Tools rules page changes it (same lifetime as its packs).
- `ActivePacksBusiness` also exposes the world language (`$worldLanguage`, `null` without a world), set by `WorldSessionBusiness` and the sandbox like the packs. Nothing reads it yet (IC05).

## Baseline

Test Files 252 passed, Tests 2332 passed (after `50abb6a`).

## Seams

1. **`WorldLibraryBusiness` + `WorldSessionBusiness` (fake-indexeddb, as the world specs do)**: create defaults to the app language, an explicit language is kept, a stored world without it reads as the app language, saveRules changes it, `ActivePacksBusiness.$worldLanguage` follows open / saveRules / close. Misses the UI.
2. **`RuleFields` component (inputs/outputs, `TEST_PROVIDERS`)**: the language select shows the draft language and emits the change; packs in another language and neutral packs get their tag. Misses storage.

## Green

- Files: src/app/modules/world/models/world.ts, helpers/world.factory.ts, helpers/world-rules.rules.ts, business/world-library.business.ts, business/world-session.business.ts, business/sandbox-world.business.ts, components/rule-fields/rule-fields.component.{ts,html}, src/app/core/business/active-packs.business.ts, src/app/core/business/pack.business.ts, public/i18n/{en,fr}.json
- Change: `World.language` (+ draft/rules `language?`); library create defaults to and get reads the app language; `ActivePacksBusiness.set(packs, language)` exposes `$worldLanguage`, set by session and sandbox (published at construction too); RuleFields gets a `p-select` language field and `pack-note` tags (`world.packs.otherLanguage` / `world.packs.neutral`), EN and FR strings added.
- Suite: 253 files / 2345 tests pass (baseline 252 / 2332 plus the new specs); tsc and ng build clean; no test file in unstaged diff.
- Open questions: none

## Review

- Verdict: fix first
- Must fix:
  - src/app/modules/world/pages/world-new-page/world-new-page.component.ts:187,395 — the wizard keeps `packs` in its own signal and builds the draft from it; `language` is never stored or passed, so the select in the Rules step is lost (world gets the app language) — add a `language` signal, include it in the draft, restore it from a draft. Add a spec at this seam.
  - src/app/modules/world/pages/world-rules-page/world-rules-page.component.ts:97,160 — the draft is built from `world` fields and the saved rules are rebuilt field by field; `language` is neither seeded (select shows the app language, not the world's) nor saved (`language: fields.language ?? world!.language`) — add both. Add a spec.
  - Same check for the Tools rules page (sandbox saveRules/draft mapping); the ticket promises all three screens.
  - Seam 2 passes only because RuleFields is tested alone; the end-to-end requirement (select above packs changes the world language) is not covered.
- Consider:
  - world-library.business.ts:39,45 — long lines and duplicated `packLanguageOf(this.language.$language())`; extract a local const.
  - world.factory.ts:67 — `?? 'en'` fallback duplicates the library default; fine, but note it.
  - active-packs.business.ts:18 — `language` defaults to `null`, so a caller forgetting it silently clears the language; make it required.
  - rule-fields.component.ts:197 — `languageOptions` labels are hard-coded endonyms (acceptable).

### Green, review fixes

- Files: world-new-page.component.ts (language signal, in draft, restored), world-rules-page.component.ts (seed and save language), active-packs.business.ts (language arg required), world-session.business.ts, world-library.business.ts (local `appLanguage`); new specs world-new-page.language.spec.ts, sandbox-rules.business.spec.ts, a language test added to world-rules-page.component.spec.ts.
- Suite: 255 files / 2348 tests pass; tsc and ng build clean.

## Answer

- `World.language` (draft and rules too): new worlds take the app language, a stored world without it reads as the app language, export/import keeps it. `ActivePacksBusiness.$worldLanguage` follows the session and the sandbox (`set(packs, language)`, language required).
- RuleFields has a "Langue du monde" `p-select` and pack notes ("images, catégories et teintes uniquement" / "images"); wired in the wizard (restored from a draft), the world rules page (seeded and saved) and the Tools rules page (sandbox).
- Review fix-first (wizard and rules page didn't carry the language) fixed with specs. Orchestrator: French word for kinds is "catégories" ("genres" read as grammatical gender); use it in later tickets.
- Checked: suite 255 files / 2348 tests pass (baseline 252 / 2332). Build OK. Browser (FR): Tools rules page shows the select and the note on Base (English), no console error.
- Left: a restored wizard draft without language keeps the previous language.
