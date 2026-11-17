# Drop shared kinds; any phrase can use any kind

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Common v2: shared kinds) — superseded by this ticket.

## Why

User feedback (2026-11-17), after trying PE06: shared kinds make no sense. Every description should be able to use every kind: e.g. an item description with `{townsfolk}` draws from the NPC kind `townsfolk` defined in the NPCs section.

## What

- **Remove shared kinds entirely** (no backward compatibility, project rule): `sharedKinds` in the manifest and the draft, the `shared` fits on domain kinds, the `kinds` part of `common.json`, the helpers (`setSharedKind`, `renameSharedKind`, `removeSharedKind`, `setSharedKindTexts`, `sharedKindTextsOf`, `setKindShared`), the `shared` domain of `app-kinds-tree-table`, the "Shared kinds" multiselect and detail line, the drawn `shared` kept on generated items / NPCs / skills / classes, and the docs about them. A pack still declaring `sharedKinds` or a `common.json` with `kinds` is rejected as an unknown field.
- **`common.json`** keeps `version: 2` and `params` only.
- **The Common tab** goes back to params and `common.json` only; it is hidden for a neutral draft again (as after PE03).
- **Any kind in a phrase**: `{<kind id>}` in a name template, a description or a param of any domain inserts a noun of that kind, drawn from the kind or one of its descendants that has nouns, pooled from the active packs; `{<kind id>:adjective}` inserts one of that kind's adjectives, agreed with the noun. The draw happens once per placeholder id per generated entry, so a name and its description agree.
- **Which kind an id means** (assumed): the entry's own domain first, then items, NPCs, skills, classes. Param names win over kind ids (a param named like a kind stays a param). An id used in a phrase that is neither a param nor a kind of any active pack is a validation warning, as for undefined params today.
- **Base FR/EN**: the starter `material` tree goes; the `material` param comes back (as before PE02), so the weapon descriptions keep `{material}`. Add one example of a cross-domain reference in Base (assumed: an item description using an NPC kind, e.g. a weapon "forged by a {smith}" if Base has such an NPC kind; otherwise pick an existing NPC kind).
- **Kept from PE06**: the shared `app-chip-list` (tints fits, classes favoured skill kinds), the Items tab order, the tree table and drawer.
- **Docs** (create-pack, packs, FR and EN): describe `{kind id}` references instead of shared kinds.

## Decisions taken without the user (to confirm afterwards)

- Resolution order when an id exists in several domains: own domain, then items, NPCs, skills, classes.
- Materials go back to a plain `material` param rather than becoming kinds.
- An unknown placeholder id is a warning, not an error.

## Baseline

`npm test`: 311 test files, 3106 tests, all passed (2026-11-17, after 00fb807).

## Seams

- Pack validation (`validatePack`, `validateCommonTexts`, the phrase validators): `sharedKinds` / `shared` / common `kinds` rejected as unknown; a placeholder that is neither a param nor a kind of the active packs warns; one that names a kind of another domain doesn't.
- The generators (exported item / NPC / skill / class generators with a seeded `RandomSource` over pooled sources): `{kind id}` and `{kind id:adjective}` resolve to a noun / adjective of that kind or a descendant, from any domain, own domain first; drawn once per entry so name and description agree; params win over kind ids; generated entries no longer carry `shared`.
- The pack draft page and `app-kinds-tree-table` (rendered): no Shared kinds multiselect or detail line, Common tab with params only and hidden for a neutral draft, no `shared` domain.

## Red

- Test files:
  - new `src/app/core/generators/cross-domain-kinds.generators.spec.ts`, new `src/app/core/packs/pack.cross-domain-kinds.spec.ts`
  - changed `src/app/core/generators/common-texts.spec.ts`, `src/app/core/generators/word-list.spec.ts`, `src/app/core/business/pack-draft-form.business.spec.ts`, `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tabs.spec.ts`, `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts`
  - deleted (`git rm`) `src/app/core/generators/shared-kinds.generators.spec.ts` (rewritten as the cross-domain generators spec), `src/app/core/packs/pack.shared-kinds.spec.ts` (rewritten as the "rejected / Base" spec), `src/app/core/packs/pack-draft-edits.shared-kinds.spec.ts` (only the removed helpers), `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.shared.spec.ts` (only the `shared` domain and `kind-shared`), `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.common.spec.ts` (Common tab with the tree; hidden-for-neutral now in `pack-draft-page.tabs.spec.ts`)
- Run: `npx ng test --watch=false --include src/app/core/generators/cross-domain-kinds.generators.spec.ts --include src/app/core/packs/pack.cross-domain-kinds.spec.ts --include src/app/core/generators/common-texts.spec.ts --include src/app/core/generators/word-list.spec.ts --include src/app/core/business/pack-draft-form.business.spec.ts --include src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tabs.spec.ts --include src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts 2>&1 | tail -30`
- Full suite after the change: 308 files, 3064 tests, 34 failing (all listed below), the rest passing.
- Assumed seam for the generators (green must follow it): `PooledSource` gets `otherDomains?: { items?, npcs?, skills?, classes? }`, each `{ kinds, texts }` as the pack gives that domain; the own domain stays in `kinds` / `texts`. `{id:adjective}` agrees with the gender/plural of the entry's own noun. The `src/testing/base-*vocabulary.ts` helpers still pass `sharedKinds` / `sharedTexts` (not test files, left for green to switch to `otherDomains` and drop).
- Failing: 34 tests
  - cross-domain-kinds.generators (12), each fails because `{kind id}` of another domain does not resolve (phrase skipped / no noun):
    - item: noun of an NPC kind in a description; descendants with nouns; name and description agree on one noun per placeholder (and no `shared`); deterministic for a seed; `{smith:adjective}` agreed with the entry noun; nouns pooled from every active pack; own domain first; param wins over a kind id; NPCs, then skills, then classes
    - skill / class / NPC: name and description agree on a noun of an item kind (no `shared` on the entry)
  - pack.cross-domain-kinds (8):
    - `sharedKinds` rejected as unknown (currently accepted)
    - `shared` fit on an item kind rejected (currently accepted)
    - base-fr and base-en: no sharedKinds / no `shared` fits (still there)
    - base-fr and base-en: common.json params only with a `material` param (it has `kinds`, no `material`)
    - base-fr and base-en: an item description references an NPC kind id (none does)
  - common-texts (3): `kinds` rejected as unknown (accepted today); Base en and fr common.json carry a `material` param of 5+ entries (missing)
  - word-list (2): Base en and fr items.json have no warning with params + NPC kind ids known (`{material}` is unresolved without the shared tree)
  - pack-draft-form.business (5): no warning for an id that is a kind of another domain, in the draft; no warning for a Base NPC kind id (`{blacksmith}`, `{guard:adjective}`); warns only for the unknown id (`{ghost}`) and not for the draft NPC kind; same for a param of common.json and a draft skill kind; common.json `kinds` is an error (all warn or accept today)
  - pack-draft-page.tabs (2): Common tab has no `app-kinds-tree-table`; a neutral draft has no Common tab (it shows one today)
  - kinds-tree-table.component (2): no `detail-shared` line in the detail; no `kind-shared` multiselect in the form (both present today)

## Green

- Files: `src/app/core/generators/cross-domain-kinds.ts` (new, replaces `shared-kinds.ts`), `src/app/core/business/pack-kind-sources.business.ts` (new), `src/testing/base-other-domains.ts` (new); `phrase.ts`, the four `*-vocabulary.ts` / `*-generator.ts` / `npc-texts.ts`, `common-texts.ts`, `pooled-domain.ts`, `pack-kinds.ts`, `pack.ts`, `pack-draft*.ts`, the four `*-vocabulary.business.ts`, `pack-draft-form.business.ts`, the kinds tree table files, `pack-draft-page.component.ts`, `src/testing/base-*vocabulary.ts`, Base FR/EN `pack.json`, `common.json`, `items.json`, `public/i18n/{en,fr}.json`, `user-docs` create-pack and packs (FR, EN).
- Change: shared kinds removed everywhere. `PooledSource.otherDomains` gives each generator the other domains' kinds and texts (filled by the vocabulary businesses through `PackKindSourcesBusiness`, and by the draft form previews). `{kind id}` / `{kind id:adjective}` resolve lazily, once per id per entry, own domain first, then items, NPCs, skills, classes; params win. Unknown placeholder ids warn unless they are a kind of any domain. `validatePack` now rejects any unknown top-level field (so `sharedKinds`). Common tab back to params only, hidden for a neutral draft. Base: no shared tree or fits, `material` param restored, weapon description references `{blacksmith}`.
- Suite: 308 files, 3064 tests, all passing (baseline 311 / 3106 before the spec rewrite). tsc spec clean, `ng build` no error, no test file in `git diff --name-only`.
- Open questions: none.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `src/app/core/generators/cross-domain-kinds.generators.spec.ts` — the deleted shared spec had "skips a phrase that uses an undrawn root when another exists" and "drops the placeholder"; nothing now covers `refs.usable` skipping a name template or description whose `{kind id}` has no noun (the case behind the Base "no warning" tests). Add one test.
  - `src/app/core/generators/cross-domain-kinds.ts:100-125` — `wordsOf` takes nouns and adjectives from the first domain that has each, so an id's nouns and adjectives can come from two domains; fine for the stated order, but worth a one-line comment or a test.
  - `src/app/core/business/pack-kind-sources.business.ts` — reloads and revalidates every other domain's word list per pack per vocabulary build (4 domains x N packs). Cached by the vocabulary cache today; watch if the cache key ignores other-domain changes.
  - Full run: 308 files, 3064 tests pass; vitest reports 4 unhandled errors from `pack-update-atomic.business.spec.ts` (a DOMException in a test unrelated to this diff; not checked against HEAD).

### Checks asked for

- Deleted specs: shared-kinds generators, pack.shared-kinds, pack-draft-edits.shared-kinds, kinds-tree-table.shared, pack-draft-page.common cover only removed behaviour. The still-valid parts (discard on cancel, delete with descendants, parent cycle, removeKind with descendants, Common tab hidden for neutral) are in the kinds-tree-table component spec, pack-draft-edits.kinds-tree.spec and pack-draft-page.tabs.spec. The only lost still-valid case is the "skip unusable phrase" one above.
- `validatePack` unknown-field rejection: `MANIFEST_FIELDS` equals the `Pack` interface, the docs' field table, both Base manifests and the creator export (`buildPack` emits a `Pack`). No legitimate field is rejected. Old packs with extra or legacy fields now fail (intended, no backward compat).
- Resolution order (own, items, NPCs, skills, classes) and params-win are implemented and tested. `otherDomains` is filled in all four vocabulary businesses and both draft previews.
- No leftover `sharedKinds`, `SharedKind`, `shared-kinds`, `sharedTexts` or shared i18n keys in `src`, `public` or `user-docs` (only the "rejected" tests). Docs updated in FR and EN.
- Safety: nothing found.

## Answer

- Shared kinds are removed everywhere (format, draft, helpers, tree table `shared` domain, Shared kinds field and detail line, `shared` on generated entries, i18n, docs). `validatePack` rejects any unknown manifest field; `common.json` (v2) holds params only and rejects `kinds`. The Common tab is params only again and hidden for a neutral draft.
- Any phrase can use any kind: `{kind id}` / `{kind id:adjective}` resolve from the entry's own domain first, then items, NPCs, skills, classes, pooled from every active pack (`PooledSource.otherDomains`, filled by `PackKindSourcesBusiness` in the four vocabulary businesses and the draft previews), drawn once per id per entry. Params win over kind ids; an id that is neither warns.
- Base FR/EN: `material` param restored (pre-PE02 values); a weapon description uses `{blacksmith}`.
- Specs: five shared-kinds specs deleted by the red step (removed behaviour only, confirmed by review), others rewritten.
- Checked: suite 308 files / 3064 tests green; build clean; review ship. Browser: item generator resolves `{blacksmith}` ("forgeron") and `{material}`; no new console error.
- Decisions taken without the user (see above), to confirm. Left (review Consider): no test for skipping a phrase whose `{kind id}` has no noun; check that the vocabulary cache key covers other domains' lists.
