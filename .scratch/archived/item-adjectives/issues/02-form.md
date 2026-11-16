# Pack creator: kind adjectives, tint fits, common words

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (Decision 5).

- Kind row: collapsed "Adjectifs" and "Suffixes" per rarity (adjective forms m / f / mp / fp, optional tint).
- Tint row: "Convient à" `p-multiselect` of known kinds (`id — first noun` labels), editing the manifest `fits`.
- Items section: collapsed "Adjectifs et suffixes communs" per rarity (top-level lists).
- Pure draft edits for each (`setKindWords`, `setTintFits`, `setCommonWords`), pruning empty lists. Optimus UI only, FR and EN strings.

## Baseline

Test Files 268 passed, Tests 2487 passed.

## Seams

1. **`pack-draft-edits.ts` (pure)**: `setKindWords(draft, id, { adjectives?, suffixes? })`, `setTintFits(draft, id, kinds)`, `setCommonWords(draft, { adjectives?, suffixes? })`, pruning empty lists; neutral draft ignores word edits but keeps `fits`.
2. **Editors through `draft` input / `changed` output**: kinds editor adds a kind adjective (m/f/mp/fp, optional tint) and a suffix for a rarity; tints editor sets "Convient à" kinds; a new common-words editor adds a top-level adjective and suffix. Data-test hooks as the existing editors.

## Red

- Test files: `src/app/core/packs/pack-draft-edits.words.spec.ts` (new), `src/app/modules/tools/components/pack-draft/common-words-editor/common-words-editor.component.spec.ts` (new), `.../kinds-editor/kinds-editor.component.spec.ts` and `.../tints-editor/tints-editor.component.spec.ts` (appended)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file
- Hooks the green must provide (word rows per rarity `common|uncommon|rare|mythic|legendary`, `<r>` = rarity): kinds editor `toggle-words` (hidden on neutral draft), `kind-new-adjective-<r>-m|f|mp|fp|tint`, `add-kind-adjective-<r>`, `kind-new-suffix-<r>`, `add-kind-suffix-<r>`; tints editor `tint-fits` (a `p-multiselect`, `options` items with `label` "id — first noun", `onChange` event with `{ value: kindIds }`, shown on neutral drafts, row text shows the chosen label); new `CommonWordsEditorComponent` (`common-words-editor/common-words-editor.component.ts`, same `draft`/`issues`/`changed` API) with `toggle-common-words` (absent on neutral draft; fields hidden until toggled), `common-new-adjective-<r>-m|f|mp|fp`, `add-common-adjective-<r>`, `common-new-suffix-<r>`, `add-common-suffix-<r>`. Edits write to `generators.items` (`kinds.<id>.adjectives|suffixes`, top-level `adjectives|suffixes`) and `tints.<id>.fits`.
- Failing: 19 tests (plus 1 neutral-draft kinds test that passes already, as a guard)
  - pack-draft-edits.words.spec.ts (9: setKindWords x3, setTintFits x3, setCommonWords x3) — `setKindWords`, `setTintFits`, `setCommonWords` not exported (compile error)
  - common-words-editor spec (4: adds adjective, adds suffix, collapsed until toggled, hides on neutral) — component module missing
  - kinds-editor spec (3: adds kind adjective with forms + tint, adds kind suffix, hidden until toggled) — no `toggle-words`
  - tints-editor spec (3: sets fits, offers kinds as "id — first noun", keeps fits on neutral) — no `tint-fits` multiselect

## Green

- Files: src/app/core/packs/pack-draft-edits.ts, src/app/modules/tools/components/pack-draft/words.ts (new), .../common-words-editor/common-words-editor.component.ts (new), .../kinds-editor/kinds-editor.component.ts, .../tints-editor/tints-editor.component.ts, src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: added setKindWords, setTintFits, setCommonWords (+ kindWordsOf, commonWordsOf readers) to the pure edits; kinds editor gets a collapsed per-rarity adjectives/suffixes block; tints editor gets a "Convient à" p-multiselect (options "id — first noun", from the draft's kinds plus known kinds); new CommonWordsEditorComponent wired in a collapsed p-panel of the Items section; EN + FR strings.
- Suite: 2505 passed, 2 failed (baseline 2487 passed; 19 new tests, 17 now green).
- Open questions: the 2 "ignores the edit on a neutral draft" tests in pack-draft-edits.words.spec.ts (setKindWords, setCommonWords) cannot pass: the helper `draft(over, language: string | undefined = 'en')` turns an explicit `undefined` into 'en', so the draft is not neutral and the edit is correctly applied. Fix the helper (e.g. `...rest` like testing/pack-draft-editor draftOf); the code already returns neutral drafts unchanged.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - pack-draft-page.component.ts:~249 — the common-words editor sits in a collapsed `p-panel` and also has its own `toggle-common-words` button, so the user opens it twice (both carry the same title) — keep the toggle for the spec hooks, but drop the panel or start it expanded.
  - pack-draft-edits.ts setTintFits — `as never` cast hides the tint type — type the spread result properly.
  - kinds-editor / common-words-editor — add/remove adjective and suffix logic is duplicated across the two components (same signals, same list rebuild) — extract a small shared helper in `words.ts` if a third caller appears.
  - kinds-editor — the optional tint of a kind adjective is a free text input — a `p-select` of known tints would avoid typos (the ticket does not require it).

## Answer

- Pure edits `setKindWords`, `setTintFits`, `setCommonWords`, with readers and pruning.
- Kinds editor: collapsed adjectives and suffixes per rarity (m/f/mp/fp, optional tint).
- Tints editor: "Convient à" / "Fits kinds" `p-multiselect` with "id — first noun" labels; it is kept on neutral drafts.
- New `CommonWordsEditorComponent` in the Items section, with its own toggle.
- Orchestrator:
  - fixed two red-test issues: the rarity `epic` → `mythic`, and the local `draft()` helper whose default swallowed `undefined`;
  - after review, the double toggle was removed;
  - updated `create-pack.md` (FR/EN) for kind words, `fits` and common words.
- Checked:
  - suite 270 files / 2507 tests pass (baseline 268 / 2487);
  - build and docs build OK;
  - browser (FR): a tint row shows "Convient à", and picking "sword — Épée" works; common words panel present; no console error; test draft deleted.
  - The dev server had to be restarted: it was serving a stale bundle.
