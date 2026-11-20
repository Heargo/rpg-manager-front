# Pack fixed content: format, validation and import rules

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Decisions 7–9). User request 2026-11-15, triaged 2026-11-17. Split in three: this ticket (pure), `07-pack-content-import.md` (catalogues, GM dialog), `08-base-starter-content.md` (Base ships the starter content).

## Behaviours

- **Format.** `domains.items|skills|classes.content` is an optional path to a JSON list of entries in the pack's language (an item, a skill, a class, the same shapes as the world's catalogues, each with a pack-local `id`). The pack also gets an optional top-level `attributes` list: `{ id, name, max?, formula? }`, the attributes its content uses.
- **Validation.** `validatePack` (and the content file's own validator) reject: `content` on a neutral pack, a content file that isn't a list of valid entries, duplicate entry ids in a domain, a modifier on an attribute the pack doesn't declare, a class skill reference that isn't one of the pack's skills, malformed `attributes`.
- **Import rules (pure).** Given a pack's content, the world's current catalogue entries, the world's attributes and an attribute mapping (`packAttrId → worldAttrId | 'add' | 'skip'`), compute the import:
  - ids become `<packId>:<entryId>`, class skill references are rewritten the same way;
  - importing classes brings the pack skills they reference;
  - a copy the GM has not edited since the last import is updated; an edited copy is left alone (how "edited" is known is the agent's choice, e.g. a hash of the imported entry kept on the copy, recorded in the ticket);
  - modifiers are remapped by the mapping, dropped on `'skip'`; `'add'` lists the attributes to create;
  - attributes the world lacks and that aren't in the mapping are reported as needing a choice (that's what 07's dialog asks).
- Pack files: the content files are loaded with the pack (official, unofficial, from a link), like `texts`.

## Out of scope

- The catalogue actions, activation hook and the GM's attribute dialog (07).
- Base's content and removing `starter-classes.ts` (08).
- Pack creator editors for the lists (later ticket if wanted).
- NPCs as fixed content.

## Baseline

Test Files 289 passed, Tests 2840 passed (after `b48fa97`).

## Seams

1. **`validatePack` and a content-file validator (`src/app/core/packs/pack.ts` or a sibling `pack-content.ts`, pure)**: format and every rejection rule (neutral pack, bad list, duplicate ids, undeclared attribute, unknown class skill, bad `attributes`). Misses loading and import.
2. **Import planner (exported pure function in `src/app/core/packs/pack-content.ts`)**: prefixed ids and rewritten skill refs, classes bring their skills, untouched vs edited copies, attribute mapping (remap / skip / add) and the attributes still needing a choice. Misses where the result is stored (07).
3. **Pack loading (`PackBusiness` / `pack-files.ts`, the existing pack loading tests' fakes)**: an official, unofficial or linked pack's content files are fetched and kept with the pack like `texts`, and a broken content file fails the pack. Misses the catalogues.

## Red

- Test files: `src/app/core/packs/pack-content.format.spec.ts`, `src/app/core/packs/pack-content.import.spec.ts`, `src/app/core/business/pack-content.business.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/packs/pack-content.format.spec.ts` (same with the other two paths), piped through `tail -30`
- Interfaces the tests assume (new file `src/app/core/packs/pack-content.ts`, `Pack.attributes`, `domains.<d>.content`):
  - `validatePackContent(domain, json, { attributeIds, skillIds }) -> { ok: true, value: entries[] } | { ok: false, errors: string[] }`. Modifiers (`items.modifiers`, `classes.bonuses`) name pack attribute ids; class `tree[].skillId` and `requires[].skillId` name pack skill ids. Errors name the entry id and the offending value.
  - `planPackImport({ packId, content: { items?, skills?, classes? }, attributes, world: { items, skills, classes, attributes }, mapping, domains })` -> `{ items, skills, classes }` (the full entries to write, ids `<packId>:<id>`; untouched-and-unchanged or edited ones are not listed), `kept: string[]` (ids of edited copies left alone), `addAttributes: PackAttribute[]`, `needsChoice: PackAttribute[]` (used by the imported entries only, absent from the world by name and from the mapping). Catalogue modifiers are by attribute NAME, so a remapped modifier carries the world attribute's name; a world attribute with the same name as a pack one is used without asking. The "edited" marker (e.g. a hash on the copy) is the agent's choice: tests only re-feed written entries to the planner.
  - `PackBusiness.content(domain, packId)` returns the raw stored/served content list (like `wordList`); content files are fetched in `download` and `prepare` and stored like texts; `prepare` validates them with the cross-file context (declared attributes, pack skills) and fails with `PackError` lines prefixed by the file path.
- Failing: 38 tests
  - `pack-content.format.spec.ts` (15) — module `./pack-content` does not exist (build fails on the missing import), and `validatePack` rejects `domains.<d>.content` as an unknown field and ignores `attributes`: accepts content paths and attributes, accepts none, content on a neutral pack, non-relative content path, attributes not a list, malformed attribute (name, id, duplicate, max), `validatePackContent` accept/empty/not a list/invalid entry/no id/duplicate ids/undeclared item attribute/undeclared class bonus attribute/unknown class skill/unknown requirement skill
  - `pack-content.import.spec.ts` (14) — module `./pack-content` / `planPackImport` does not exist: prefixed ids, rewritten skill refs, chosen domains only, classes bring only their referenced skills, re-import updates an untouched copy, leaves an edited copy (kept), per-copy independence, same-name attribute auto-used, needsChoice, map by id, skip drops modifier, add lists the attribute, class bonuses remapped, unused attribute not asked
  - `pack-content.business.spec.ts` (9) — manifest rejected with `unknown field "content"` and no `content()` method: official download keeps content files, `content()` from stored files, `content()` rejects when the pack has none, unofficial prepare/install keeps them, missing content file fails the pack, not-a-list file fails, undeclared modifier attribute fails, class on unknown skill fails, duplicate ids fail

## Green

- Files: src/app/core/packs/pack-content.ts (new), src/app/core/packs/pack.ts, src/app/core/business/pack.business.ts
- Change: `validatePack` accepts `domains.items|skills|classes.content` and `attributes`; `validatePackContent` reuses the catalogue parsers (item/skill/class) plus the undeclared-attribute, unknown-skill and duplicate-id checks; `planPackImport` is pure. "Edited" is known by a `packHash` field (FNV-1a of the entry sans mark, stable key order) written on each imported copy: a copy whose hash no longer matches is kept. A copy with no mark counts as edited. `PackBusiness` fetches content files in `download` and `prepare`, validates them in `prepare` with the cross-file context (errors prefixed by path), and exposes `content(domain, packId)`.
- Suite: 292 files / 2879 tests pass (baseline 289 / 2840); tsc and ng build clean; no test file in the unstaged diff.
- Open questions: none (07 must keep `packHash` on written copies and strip nothing from it; entries lacking the mark are treated as GM-made and never overwritten).

## Answer

- `src/app/core/packs/pack-content.ts` (new): `validatePackContent` (reuses the catalogue parsers, plus undeclared attribute, unknown skill and duplicate id checks) and the pure `planPackImport` (ids `<packId>:<entryId>`, rewritten skill refs, classes bring their skills, attribute mapping remap/skip/add, `needsChoice`, `kept`).
- `pack.ts`: `validatePack` accepts `domains.items|skills|classes.content` (relative path, not on a neutral pack) and the top-level `attributes` list.
- `PackBusiness`: `download` and `prepare` fetch the content files; `prepare` validates them against the declared attributes and the pack's skills (errors prefixed by file path); `content(domain, packId)` reads a pack's list.
- Decision: an imported copy carries `packHash` (FNV-1a of the entry, stable key order). A copy whose hash no longer matches is kept on re-import; a copy without the mark counts as the GM's own. Ticket 07 must write the mark.
- Checked: suite 292 files / 2879 tests (baseline 289 / 2840), `ng build` clean, review verdict ship. No UI, so no browser check.
- Review notes left for later: typed entries instead of `any` in `pack-content.ts`, split `validatePackContent` per domain, a shared content loader for 07.
