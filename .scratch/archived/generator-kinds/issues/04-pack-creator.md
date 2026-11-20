# Pack creator: NPC, skill and class kinds

Status: resolved
Type: task
Blocked by: 01, 02, 03

Spec: `../spec.md` (Decision 6).

- The pack creator gets structured sections for NPCs, Skills and Classes like Items: kinds (id, parent with autocompletion, the domain's fields: roles and person / type and effect / favoured skill kinds) and, for a pack with a language, the texts per kind (nouns, descriptions, adjectives, suffixes, names, collapsed) and the top-level lists (given names, epithets, templates…).
- Preview of a few draws per domain, like Items.
- Raw JSON import/export carries the new fields; the draft validates with the same checks as an installed pack.

## Baseline

Test Files 283 passed, Tests 2750 passed (after `68c8f1f`).

## Seams

1. **Pack draft model and edits (`pack-draft.ts` / `pack-draft-edits.ts`, pure)**: a draft holds NPC, skill and class kinds and their v2 texts; `draftToPack` writes `domains.npcs|skills|classes.kinds` and the three v2 files; edits add/rename/remove a kind and its texts, set the domain fields; the built pack passes `validatePack` and the v2 validators. Misses the form.
2. **`PackDraftFormBusiness` / pack creator business**: the structured sections' state and the preview draws (a few NPC names, skills, classes from the draft pooled with the active packs, like the Items preview). Misses the DOM.
3. **Pack creator page (component with `TEST_PROVIDERS`)**: the NPC, Skills and Classes sections render their kinds, edit the domain fields (roles and person / type and effect / favoured skill kinds multiselect) and the texts per kind, and raw JSON import/export round-trips them.

Follow IC08/IA02 (archived `item-coherence/issues/08-*.md`, `item-adjectives/issues/02-form.md`) for the Items section's structure, and GK01–03 for the domains.

## Red

- Test files: `src/app/core/packs/pack-draft-domains.spec.ts`, `src/app/core/business/pack-draft-form.domains.business.spec.ts`, `src/app/modules/tools/components/pack-draft/domain-kinds-editor/domain-kinds-editor.component.spec.ts`, `.../domain-texts-editor/domain-texts-editor.component.spec.ts`, `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.domains.spec.ts`. Helpers (edited): `src/testing/pack-draft-domains.ts` (new: the three domain fixtures), `src/testing/pack-draft-editor.ts` (`renderEditor` takes a 4th `inputs` argument and the Base npcs/skills/classes files).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file (all five are parameterised over npcs / skills / classes).
- Failing: 85 tests (each parameterised test counts three times). The full suite cannot build until the two new editor components exist (missing-module compile errors); the existing specs are untouched and still pass on their own. Existing page/draft specs keep the raw `wordlist-npcs|skills|classes` textareas and the `buildPack` outputs, so they should stay green; if green moves them, migrate them.
  - pack-draft-domains.spec.ts (25): builds kinds + texts into manifest/file and validates; kinds only / texts only; `setDomainKind` create/change/clear; `setDomainKindTexts` set/replace/prune; `setDomainTexts` set/prune; neutral draft ignores texts but keeps kinds; `renameDomainKind` follows parents + texts; `removeDomainKind` leaves other domains alone (x3 = 24), plus renaming a skill kind follows classes' `skills` (1) — `setDomainKind`, `renameDomainKind`, `removeDomainKind`, `setDomainKindTexts`, `setDomainTexts` not exported, and `npcKinds|skillKinds|classKinds` not written by `buildPack`.
  - pack-draft-form.domains.business.spec.ts (18, x3): `knownKeys` `domainKinds[domain]` (base + draft kinds with first noun), `previewDomain(draft, domain, kind, count = 3)` returns `{ name, description }[]` (3 named with the noun; count; deterministic; unknown kind gives []), `issues` maps a kind error to `{ domain, kind }` and is empty for a sound draft; old-format list is an error with `domain`. Fail: methods missing / `DraftIssue.domain` and domain validators not wired.
  - domain-kinds-editor.component.spec.ts (21, x3): add kind with parent + noun into `<domain>Kinds`; rows for the domain only; own-field control emits (`kind-roles` / `kind-effect` / `kind-skills`, p-multiselect or p-select `onChange { value }`); neutral draft hides texts and keeps id/parent/own field; issue shown only for its domain; remove kind with texts; preview shows 3 `preview-entry` containing the noun after `preview-kind`. Fail: component module missing.
  - domain-texts-editor.component.spec.ts (15, x3): add an entry to each top-level list (`top-new-<list>` + `add-top-<list>`), show and remove (`top-<list>`, `remove-top-<list>-0`), hidden on a neutral draft. Fail: component module missing.
  - pack-draft-page.domains.spec.ts (6, x3): the Word lists tab has a `domain-<d>` section with `kind-row-<id>`; the raw `wordlist-<d>` textarea exports the kinds texts and importing JSON updates the section. Fail: no `domain-<d>` section.
- Contract for green: `PackDraft` gets optional `npcKinds`, `skillKinds`, `classKinds`; both new components take `draft`, `issues`, `domain` inputs and a `changed` output; domain texts live in `draft.generators[domain]` as `{ version: 2, … }`; edits are `setDomainKind(draft, domain, id, patch)` (undefined clears), `renameDomainKind`, `removeDomainKind`, `setDomainKindTexts(draft, domain, id, { nouns, descriptions, adjectives, names })`, `setDomainTexts(draft, domain, top)`.

## Green

- Files: `src/app/core/packs/pack-draft.ts`, `pack-draft-edits.ts`; `src/app/core/business/pack-draft-form.business.ts`, `pack-creator.business.ts`; `src/app/core/generators/skill-generator.ts`, `class-generator.ts` and `src/app/modules/npc/helpers/npc-editor.rules.ts` (text drawers exported); new `src/app/modules/tools/components/pack-draft/domain-kinds-editor/domain-kinds-editor.component.ts` and `domain-texts-editor/domain-texts-editor.component.ts`; `pack-draft-page.component.ts` (a `domain-<d>` section per domain, raw JSON follows structured edits for every generator); `kinds-editor.component.ts` (ignores domain-tagged issues); `public/i18n/en.json`, `fr.json` (`packs.creator.domain.*`, `listsIntro`).
- Change: draft has `npcKinds|skillKinds|classKinds`, `buildPack` writes them into `domains.<d>.kinds`; edits `setDomainKind`, `renameDomainKind` (follows parents, texts, classes' `skills`), `removeDomainKind`, `setDomainKindTexts`, `setDomainTexts` plus readers. `PackDraftFormBusiness` gets `knownKeys().domainKinds`, `previewDomain`, and `issues` tags NPC/skill/class messages with `domain` and validates the three language files. Two editor components (p-multiselect roles / favoured skills, p-select person / type / effect) mounted per domain in the Word lists tab; drafts made from an installed pack carry its domain kinds.
- Suite: 287/288 files, 2832/2835 tests pass (baseline 283 files / 2750 tests, all green; +85 new tests, 82 of them green). `tsc -p tsconfig.spec.json` clean, `ng build` clean (only the existing budget warnings), no unstaged test file.
- Open questions: the 3 failures are `domain-kinds-editor.component.spec.ts` "hides the texts of a neutral draft…" (x3). The spec's `withFolk = (language: string | undefined = 'en')` turns the `undefined` into `'en'`, so the draft is not neutral and it asserts `kind-new-noun` is null on an English draft, which contradicts the first test. Fix the spec (e.g. `(...rest) => draftOf(..., rest.length ? rest[0] : 'en')`); the component already hides texts for `details.language === undefined`.

## Review

- Verdict: fix first
- Must fix: `domain-kinds-editor.component.ts` (texts block) + `pack-draft-edits.ts:~560` (`DomainKindTexts`, `setDomainKindTexts`, `domainKindTextsOf`) — per-kind `suffixes` (valid in the skills and classes word lists, `skill-word-list.ts:71`) cannot be edited in the structured form, though the ticket lists suffixes among the per-kind texts and Items has them (kinds-editor `add-kind-suffix-*`) — add the field to the edits and an add/remove control for skills and classes, with a red test, or record the ticket's reduction explicitly. (`collapsed` is not in any v2 domain schema, so nothing to build.)
- Consider:
  - `pack-draft-form.business.ts:1` — core business imports `drawNpcTexts` from `modules/npc/helpers/npc-editor.rules`; core depending on a feature module inverts the layering. Move the NPC text drawer to `core/generators/` (like `skillTexts`/`classTexts`).
  - `pack-creator.business.ts:34-40, 216-222, 312-316` — unrelated Prettier reformatting hunks add noise to the diff; revert them.
  - `domain-kinds-editor.component.ts` — nouns/adjectives/descriptions/names/preview/add-noun code duplicates the Items `kinds-editor` (shotgun surgery risk); extract shared pieces later.
  - `pack-draft-form.business.ts` `issues()` calls `knownKeys(draft)` inside the domain loop, up to three times; hoist it.
  - Checked and fine: Optimus controls only (p-multiselect, p-select, pInputText, pTextarea, p-checkbox), signals/`input()`/`output()`, block control flow, all `packs.creator.domain.*` keys in en and fr, and the three domain sections reuse one component, so they match each other and Items. The orchestrator's spec fix is reasonable. No secrets, no invite-code changes.

## Answer

- The Word lists tab has an NPC, Skills and Classes section (one shared `domain-kinds-editor` and `domain-texts-editor`): kinds with parent and the domain fields (roles and person / type and effect / favoured skill kinds), texts per kind (nouns, descriptions, adjectives, suffixes for skills and classes, names), the top-level lists, a preview of a few draws per kind. Raw JSON follows the structured edits. Draft edits `setDomainKind`, `renameDomainKind` (follows parents, texts and classes' favoured skills), `removeDomainKind`, `setDomainKindTexts`, `setDomainTexts`.
- The first green landed in the user's commit `25abdc2`; this commit adds the review fixes: per-kind suffixes, the NPC text drawer moved to `core/generators/npc-texts.ts` (layering), `knownKeys` computed once. A red-spec bug (`withFolk(undefined)` defaulting to English) was fixed by the orchestrator.
- Checked: suite 289 files / 2840 tests, `ng build` clean; browser: the three sections render in the creator with no console error.
- Not done (review Consider): the domain kinds editor duplicates parts of the Items kinds editor; extract shared pieces later.
