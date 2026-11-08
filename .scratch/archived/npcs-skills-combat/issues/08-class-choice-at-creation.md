# Class choice at character creation

Status: resolved
Type: task
Blocked by: 07

Spec: `../spec.md` (Class choice at creation, What players receive).

Class step in character creation when the world has classes: players receive the class list (name, description, image, bonuses) without trees. `CreateCharacterRequest.classId` checked by the host, starting items and starting skill points applied. Class name on the card and in the players list.

## Baseline

Test Files 122 passed (122), Tests 1036 passed (1036).

## Seams

Added to scope: a class's `bonuses` (spec: "attribute modifiers, like an item's, always on") don't reach the stats yet. They're added here, now that characters get a class at creation.

1. **Character creation business over the fake peer network (`src/testing/game-device.ts`)**:
   - Players get the class list for creation: name, description, image, bonuses, never the trees.
   - `CreateCharacterRequest.classId` is checked by the host: required when the world has classes, refused when unknown, and none when the world has no classes.
   - The class's starting items go into the inventory, and `startingSkillPoints` are given.
   - Other players see only the class name of a character (players list / summary), not the tree.
   - Misses: rendering.
2. **`attributeStats` (pure)**: a sheet's class bonuses add to its maxima like equipped items, on their own tooltip line, for characters and NPCs. Misses: UI.
3. **Create-character page / class step component inputs/outputs (`TEST_PROVIDERS`)**: when the world has classes it shows a Class step with class cards (image, name, description, bonuses). The choice is required to finish, and the chosen `classId` is in the request. With no classes the step is skipped. The character card shows the class name. Misses: layout (browser check).

## Red

- Test files:
  - `src/app/modules/character/business/class-choice.spec.ts` (new)
  - `src/app/modules/character/helpers/character-stats.spec.ts` (added a describe, and `classBonus: 0` in the existing full-object `toEqual`)
  - `src/app/modules/character/components/character-card/character-card.component.spec.ts` (added a describe)
  - `src/app/modules/character/pages/create-character-page/create-character-page-class.component.spec.ts` (new)
  - `src/app/modules/character/business/skill-points.spec.ts` (its `join` now creates with `classId: 'mage'`, since the world has classes; stays green)
- Run: `npx ng test --watch=false --include 'src/app/modules/character/**/*.spec.ts' 2>&1 | tail -30`
- Interfaces the tests fix (green must follow them):
  - `CharacterBusiness.create(name, portrait?, classId?)` sends `CreateCharacterRequest.classId`.
  - `CharacterBusiness.loadClassChoices(): Promise<{ id, name, description, imageId?, bonuses? }[]>` through a new host route (no tree, no `startingItems`); `[]` when the world has no classes.
  - Host errors: `character.errors.classRequired` (world has classes, none sent), `character.errors.unknownClass`, `character.errors.noClasses` (class sent to a world without classes). The class's `startingItems` (catalogue ids) become inventory entries.
  - The published characters list carries `className` (the class name, never the tree) for each character with a class; the card reads it.
  - `attributeStats(attributes, sheet, bars, skills, classBonuses: ItemModifier[])` and `AttributeStat.classBonus` (included in `max`, own tooltip line).
  - Create page: calls `characters.loadClassChoices()`; one `[data-testid="class-card"]` per class (name, description, bonuses as "Life +2"), click selects; submit disabled until chosen when choices exist; calls `characters.create(name, portrait, classId)`; no cards and `classId` undefined when `[]`.
  - Character card: `[data-testid="card-class"]` shows `className`, absent without a class.
- Failing: 14 tests
  - character-stats > adds points and equipped modifiers... — expects `classBonus: 0` in the stat, missing
  - attributeStats class bonuses > adds the class bonuses to the maxima on their own line — fifth argument ignored, no `classBonus`
  - attributeStats class bonuses > stacks with the equipped items, and a negative bonus lowers the max — same
  - class-choice > gives players the class list for creation — `loadClassChoices` is not a function
  - class-choice > requires a class — create resolves instead of rejecting
  - class-choice > refuses an unknown class — create resolves instead of rejecting
  - class-choice > stores the class, puts its starting items in the inventory... — `classId` not stored
  - class-choice > shows other players only the class name... — `className` undefined
  - class-choice > offers no class and creates a classless character — `loadClassChoices` is not a function
  - class-choice > refuses a class, since the world has none — create resolves instead of rejecting
  - card > shows the class name of the character — no `card-class` element
  - create page > shows a card per class... — no class cards
  - create page > requires a choice to finish... — no class cards to click
  - create page > skips the step when the world has no classes — `create` called with 2 args, not `(name, undefined, undefined)`

## Green

- Files: `src/app/modules/character/{helpers/character-stats.ts,helpers/class-view.rules.ts,helpers/character-actions.rules.ts,helpers/character.rules.ts,models/character-api.ts,services/character.service.ts,business/character.business.ts,business/character-host.business.ts,components/character-card/character-card.component.html,components/character-list/character-list.component.ts,components/character-sheet/character-sheet.component.ts,pages/create-character-page/*}`, `src/app/modules/npc/helpers/npc-visibility.rules.ts`, `src/app/modules/world/models/world.ts`, `public/i18n/{en,fr}.json`
- Change: `attributeStats` takes class bonuses (`classBonus`, in `max`, own tooltip line); `classBonusesOf` helper used by the action rules, `CharacterBusiness.statsOf` (sandbox/GM classes, else the `classBonuses` the host publishes) and `toPublicNpc`. Host: `class/choices` route (no trees), `classId` validated, starting items given, published list carries `className` and `classBonuses`. Create page: class step (cards), card shows `card-class`, players list shows the class name.
- Suite: with `classes` optional in `toPublicNpc` the whole suite passes (124 files, 1050 tests, baseline 1036 + 14 new); `ng build` clean. As delivered (`classes` required) the suite does not compile, see below.
- Open questions: `src/app/modules/npc/helpers/npc-visibility.rules.spec.ts` builds worlds without `classes` for `toPublicNpc` (lines 48, 54, 60, 66, 76, 89); orchestrator must add `classes: []` there (tsc and `npm test` fail until then). The staged specs call `attributeStats(attrs, sheet, bars)` with 3 args, so `skills` and `classBonuses` keep a `= []` default (forced by the red files). Added optional `className`/`classBonuses` on `Character` (published list only, like `notes`). Summary component's "(+n)" badge still shows item bonus only.

## Review

- Verdict: fix first
- Must fix: `src/app/modules/character/business/character-host.business.ts:112-125` (`onClassChoices`) — ignores who sent the request, while `onMyClass`/`onSaveNotes` resolve `playerIdOf(from)` and refuse non-room senders (rules: host handlers check the sender) — take `{ from }`, allow `SELF_PEER` or a known `playerIdOf(from)`, else `forbidden` `character.errors.notInRoom`; add a spec for an unknown peer.
- Consider:
  - `character-host.business.ts:223-237` / `world.ts:108-111` — optional `className`/`classBonuses` on `Character`, set only when published, is acceptable (same pattern as `notes`, inverse), but a `PublishedCharacter = Character & {className?, classBonuses?}` type would make "only on the published list" explicit; fine to defer. `classBonuses` are bonuses only, no tree: no leak.
  - `character.business.ts:~147` `classBonusesOf` — falls back to `character.classBonuses` only when no classes are at hand; correct for players, but `world as {classes?}` casts are a smell; give `SheetWorld` an optional `classes`.
  - `character-actions.rules.ts` `statsOf` — passive skill bonuses now count in stat checks (behaviour change): coherent with the sheet's max, and `skillBonus` was previously ignored there; covered by the suite, but add one spec for a spend/refund with a passive skill so it is pinned.
  - Production callers of `attributeStats` (actions rules, `statsOf`, `toPublicNpc`) all pass class bonuses; the `= []` defaults are kept for specs only (`passiveBonuses` default `skills = []` is redundant).
  - Summary "(+n)" badge counts items only: fine, note in ticket as follow-up.
  - Class `startingItems` unknown in the catalogue are silently skipped; acceptable.
  - Formatting: long one-line `statsOf(...).find(...)` lines in `character-actions.rules.ts` are not Prettier-formatted.

Re-check after the must-fix (`onClassChoices` now refuses a sender outside the room, like `onMyClass`): verdict **ship**.

## Answer

Built:
- When the world has classes, character creation has a Class step: cards with name, description, image and bonuses. The choice is required.
- Players get the class list from a new host route `class/choices`. It never sends trees or starting items, and refuses senders outside the room.
- The host checks `CreateCharacterRequest.classId`. It refuses a missing class when the world has classes, an unknown class, and any class when the world has none. It gives the class's starting items and `startingSkillPoints`.
- The published character list carries `className` and `classBonuses`, never the tree. The card and the players list show the class name.
- Class bonuses (always on) now reach `attributeStats` as `classBonus`, in the max, with their own tooltip line, for characters (sheet, card, table, action checks) and NPCs.

Decisions:
- Class bonuses were added to this ticket because nothing applied them yet.
- `attributeStats` keeps `= []` parameter defaults for skills and class bonuses (a function convenience used by older specs, not a data fallback); every production caller passes them.
- `applyCharacterAction` now counts passive skill bonuses in its stat checks, matching the sheet's max.
- The orchestrator added `classes: []` to the world literal in `npc-visibility.rules.spec.ts` (no assertion changed).
- No refusal spec for `class/choices`: through the public API a joined player is always known before its first request, and the fake network has no raw-peer request. The same holds for `class/mine`.

Follow-ups, from review:
- The table summary's "(+n)" badge counts item bonuses only.
- A spend/refund spec with a passive skill would pin the stat-check change.
- A `PublishedCharacter` type would make published-only fields explicit.

Checked: suite 1050/1050 (baseline 1036), spec typecheck clean, `ng build` clean, review verdict ship. No browser check: creation needs a player in a hosted room, and two devices in one browser share one profile, so the player side stays covered by the multi-device tests.
