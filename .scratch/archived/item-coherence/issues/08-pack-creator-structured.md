# Pack creator: structured kinds, tints and params

Status: resolved
Type: task
Blocked by: 01, 03

Spec: `../spec.md` (Decisions 4, 5, 11, 12, 13).

- Details: language optional ("Neutral: images, kinds and tints only").
- "Kinds" section: one row per kind (id with autocomplete from installed packs, parent, type for roots, slot), and for a language pack its nouns (text + gender), descriptions and name templates per rarity. A "preview" button draws 3 items of that kind with the draft plus the installed Base.
- "Tints" section: id (autocomplete), gradient editor (the colorizer's), and for a language pack its adjectives, suffixes and descriptions per rarity.
- "Params" section: name (autocomplete), list of phrases.
- "Templates" section (language pack): name templates per rarity, collapsed by default ("only needed for a Base").
- Sprites: a kinds multi-select (known kinds + the draft's) replaces type and slot.
- Validation errors and warnings (01, 02, 03) shown next to the field. An info line lists the draft's kinds with no sprite in the installed packs (not blocking).
- Sections are grouped by domain (Items for now, built so another domain adds its own section); Tints and Params are shared, outside the domains. NPCs, skills and classes keep today's JSON text areas until they move.
- Raw JSON stays under an "Advanced" panel (import/export of the word list).
- Optimus UI controls only (`p-*`), red theme.

## Decisions (orchestrator, 2026-11-14)

- **Storage stays as today**: `PackDraft.kinds` / `tints` (manifest side) and `generators.items` / `common` (language side, JSON objects). The structured form edits those objects; the "Advanced" panel shows them as JSON (import, export, copy Base). No second model.
- **Pure draft edits** in `src/app/core/packs/pack-draft-edits.ts` (one function per action, each returns a new draft): `setKind(draft, id, { parent?, type?, slot? })`, `renameKind`, `removeKind` (also removes its texts and sprite references), `setKindTexts(draft, id, { nouns?, descriptions?, names? })`, `setTint(draft, id, gradient)`, `setTintTexts(draft, id, { adjectives?, suffixes?, descriptions? })`, `removeTint`, `setParam(draft, name, entries)`, `removeParam`, `setTemplates(draft, rarity, list)`. A neutral draft (no language) ignores text edits. Empty lists/objects are pruned so the built files stay clean.
- **Business** (`PackCreatorBusiness` or a new `pack-draft-form.business.ts`): `knownKeys()` → kind ids (with the first noun in the app language as a hint), tint ids, param names from installed packs plus the draft; `coverage(draft)` → draft kinds whose chain has no sprite in the draft or installed packs; `preview(draft, kind, n = 3)` → `n` items drawn with `generateItem` from a vocabulary built from the draft plus the Base of the draft's language; `issues(draft)` → validation errors and warnings mapped to their field (kind id, tint id, param name, rarity).
- **Page**: the "Lists" tab becomes: Items (Kinds, Tints, Templates collapsed "only needed for a Base"), Shared (Params), then NPCs / Skills / Classes with today's JSON text areas, then Advanced (items.json and common.json as JSON). Split into standalone child components under `modules/tools/components/pack-draft/` (`kinds-editor`, `tints-editor`, `params-editor`), each with `draft` input and `changed` output; the page stays the container.
- Kind row: id (`p-autocomplete` on known kinds, free text allowed, kebab-case check), parent (`p-autocomplete`), type (`p-select`, only when no parent), slot (`p-select`, equipment chains only), nouns (text + gender + plural, chips-like list), descriptions (textarea list), names per rarity (collapsed), "Preview" button showing 3 drawn items. Tint row: id, gradient as 3 colour stops (`p-colorpicker` for shadow / mid / light, positions 0 / 0.5 / 1) with a swatch, adjectives (m / f / mp / fp) and suffixes per rarity, descriptions. Param row: name (autocomplete), entries (list). All Optimus UI `p-*`.
- Kind option labels everywhere (creator sprites, colorizer) become `id — first noun` through one shared helper, replacing the duplicated `itemKindOptions` code.
- Neutral draft: text sections hidden, Kinds shows only id/parent/type/slot, Tints only the gradient.
- Coverage info line under Kinds: "No sprite yet for: staff, mace" (not blocking).

## Baseline

Test Files 259 passed, Tests 2413 passed (after `c0a5755`).

## Seams

1. **`pack-draft-edits.ts` (pure) + `buildPack`**: each edit, pruning, rename/remove cascades, neutral draft ignoring texts, the built manifest/files valid with `validatePack` / `validateItemWordList` / `validateCommonTexts`.
2. **Draft form business (faked `PackService`, installed Base)**: `knownKeys`, `coverage`, `preview` (3 items of the kind, deterministic), `issues` mapped to fields.
3. **Child editor components (`kinds-editor`, `tints-editor`, `params-editor`) through `draft` input / `changed` output (`TEST_PROVIDERS`)**: adding a kind with a noun, a tint with a gradient and an adjective, a param with entries emits the expected draft; neutral draft hides texts; an issue shows next to its row.

## Red

- Test files: `src/app/core/packs/pack-draft-edits.spec.ts` (19), `src/app/core/business/pack-draft-form.business.spec.ts` (15), `src/app/modules/tools/components/pack-draft/{kinds,tints,params}-editor/*.component.spec.ts` (6, 5, 5); helper `src/testing/pack-draft-editor.ts`.
- Run: `npx ng test --watch=false --include <file>`.
- Failing: 44 tests, all on missing modules (`pack-draft-edits`, `PackDraftFormBusiness`, the three editor components).
- Contract: texts in `generators.items` (`{ version: 2, kinds, tints, templates }`), params in `common` (`{ version: 1, params }`), pruned when empty; `setKind` with explicit `undefined` clears a field; rename/remove cascade to children, texts and sprite kinds; neutral draft ignores text edits. Editors: `draft` + `issues` inputs, `changed` output, data-test hooks `add-kind`, `kind-row-<id>`, `kind-id`, `kind-parent`, `kind-new-noun`, `add-noun`, `add-tint`, `tint-row-<id>`, `tint-id`, `tint-color-shadow`, `tint-color-light`, `tint-adjective-common`, `add-param`, `param-row-<name>`, `param-name`, `param-new-entry`, `add-entry`, `issue`, `remove-*`. New tint: default 3-stop gradient (0, 0.5, 1).

## Green

- Files: `src/app/core/packs/pack-draft-edits.ts`, `src/app/core/packs/kind-label.ts`, `src/app/core/business/pack-draft-form.business.ts`, `src/app/modules/tools/components/pack-draft/{kinds-editor,tints-editor,params-editor,templates-editor}/*.component.ts`, `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`, `src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component.ts`, `src/app/core/business/pack-creator.business.ts` (dropped `baseItemKinds`), `public/i18n/{en,fr}.json`.
- Change: pure draft edits (plus rename/readers), `PackDraftFormBusiness` (knownKeys, coverage, preview, issues), three editors plus a templates editor, wired into the Lists tab (Items: Kinds, Tints, Templates collapsed; Shared: Params; NPCs/Skills/Classes JSON; Advanced panel with items.json and common.json). The coverage line sits under Kinds and each row has a Preview button. Kind labels `id — first noun` go through `kindOptions` in the colorizer and the draft page. The Advanced panel is before the NPC/Skill/Class textareas in the DOM and last on screen (CSS `order`), because the existing page spec expects `wordlist-items` first.
- Suite: 3 failing of 2462 (baseline 2413 all passing, +49 new). `npx tsc -p tsconfig.spec.json --noEmit` clean, `ng build` OK (budget warnings only), no test file in the unstaged diff.
- Open questions: the 3 failures are the neutral-draft tests (kinds, tints, params editors). `draftOf({}, undefined)` in `src/testing/pack-draft-editor.ts` has the default parameter `language = 'en'`, so passing `undefined` still gives an English draft and the texts are (rightly) shown. The helper should build the neutral draft with `details.language` really undefined (for example `arguments.length > 1`, or `null` coalesced). I checked the three assertions with a draft whose language is really undefined (temporary spec, removed) and they pass.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `src/app/core/business/pack-draft-form.business.ts:150-180` — `issues()` maps validator messages to fields by regex on message text; fragile if validator wording changes. Have validators return structured paths.
  - `pack-draft-form.business.ts` `load()` — one-line wrapper over `packs.load()`; inline it.
  - `pack-draft-page.component.ts` (~line 700) — long unformatted lines (`known` signal, `itemKindOptions`); run Prettier. The `common.json` block (text, errors, import/copy/clear) duplicates the generator JSON template; the CSS `order` trick for DOM vs screen order is a workaround for the old page spec, so update that spec later and drop it.
  - Page `edited()` re-stringifies items/common on every keystroke in the structured editors; fine for now.
  - Full-suite note: `pack-draft-page.lifecycle.spec.ts` prints one unhandled rejection ("expected '' to be 'Edited'"). It also happens on a clean HEAD worktree, so it is not from this change.
- Checked: ticket requirements covered (edits, business, 3 editors plus templates, Advanced panel, kind labels via `kindOptions`, i18n in both files); the helper `draftOf` change is correct (`rest.length`); the focused specs (89 tests) pass; no secrets; no invite-code change; layering is respected (components inject business only); editors use `pInputText`/`pTextarea`, block control flow, signal inputs/outputs.

## Answer

- Pure draft edits (`core/packs/pack-draft-edits.ts`: kinds, kind texts, tints, tint texts, params, templates, rename/remove cascades, pruning, neutral drafts ignore texts) and `PackDraftFormBusiness` (`knownKeys`, `coverage`, `preview`, `issues`).
- Lists tab: Items (Catégories / Kinds, Teintes / Tints, name templates collapsed), Shared (Paramètres / Params), NPCs / Skills / Classes JSON, Advanced JSON for items.json and common.json. Standalone editors under `modules/tools/components/pack-draft/` (kinds, tints, params, templates). Kind labels `id — first noun` through one `kindOptions` helper (creator and colorizer), also in the autocomplete suggestions.
- Orchestrator: fixed the `draftOf` test helper (its default swallowed an explicit `undefined` language); after the browser check, green reworded the Lists intro, spaced the preview rarity tag, and ran Prettier.
- Checked: suite 264 files / 2462 tests pass (baseline 259 / 2413). Build OK. Browser (FR): added a "sabre" category with parent "sword" and the noun "Sabre", the coverage line said "no sprite yet for sabre", Preview drew 3 sabres with coherent descriptions; mobile width has no horizontal scroll; no console error. Test drafts deleted afterwards.
- Left: validator messages are shown raw in English next to the fields (as before); `issues()` maps messages to fields by regex (structured paths would be sturdier); the Advanced panel uses CSS `order` to satisfy an older page spec.
