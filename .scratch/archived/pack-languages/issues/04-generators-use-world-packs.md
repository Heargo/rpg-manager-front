# Generators and sprites use the world's packs

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (Decision 6, Assumed: no world, fallback).

- Word lists, sprites and the random item image come from the world's active packs. Without a world (sandbox, Tools pages), they come from the Base of the app language.
- The Pack select next to the seed offers "Random" and the active packs with content for this generator, with no filter on the app language.
- A generator with no word list in the active packs falls back to the Base of the app language.
- The Packs page loses its on/off toggle (moved here from PL03): install, add, create, duplicate and remove stay.

## Decisions (orchestrator, 2026-11-13)

- **Where the active packs come from:** the world open in `WorldSessionBusiness` (`$world()?.packs`), the sandbox world included, since it is a world with its own packs (PL03). With no world open, the active packs are `[basePackId(app language)]`. `PackBusiness` reads it (a business may use another feature's business, per `docs/rules.md`). This replaces PL01's interim rule (enabled packs in the app language).
- `packsFor(content)`, `sprites()` and the random item image use the active packs **whatever their language**. An active id that isn't installed is skipped. The language arg of `packsFor` goes away, or stays unused, as green sees fit.
- **Fallback:** when no active pack has content for a generator, use the Base of the app language. The Pack select then shows only "Random" and that Base.
- **Packs page:** the on/off toggle and the `enabled` flag go away (storage field dropped, DB upgrade if needed, no migration of values). An official pack that isn't downloaded shows "Download" (was turning it on). A downloaded one shows "Remove from device" as today. Base packs keep "Always available" (rename the "Always active" tag).
- Removing a pack from the device doesn't touch worlds: their rules then show it as missing (PL03).
- Players: the host generates, so nothing changes on player devices.

## Baseline

Test Files 231 passed, Tests 1991 passed (after `ecfe462`).

## Seams

1. **`PackBusiness` + `PackChoiceBusiness` + `WordListBusiness` with a world open in `WorldSessionBusiness` (fake-indexeddb, faked `PackService`, as the pack specs do)**: a French app with world packs `[base-en, extra-fr]` gets both packs' sprites and word lists (the Pack select lists both). With no world open, only the Base of the app language. An active id that isn't installed is skipped. A world whose packs have no list for a generator falls back to the Base of the app language. Changing the world's packs (`saveRules`) changes the content. Misses the pages.
2. **Random item image (`random-item-image.business`)**: it draws only from the active packs' sprites (world open / not). Misses the pages.
3. **Packs page component**: no toggle and no "enabled" state. Official not downloaded → Download, which then shows it as downloaded. Remove still works, and Base shows "Always available". Misses the generators.

## Red

- Test files: `src/testing/active-packs.ts` (helper `openWorldWithPacks`: real `WorldLibraryBusiness.create` + `WorldSessionBusiness.open`); `src/app/core/business/pack-choice.business.spec.ts` (rewritten); `src/app/modules/sprite/business/random-item-image.pack.spec.ts`; `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.spec.ts` and `packs-tool-page.unofficial.spec.ts`; updated to the new rule: `src/app/core/business/{pack-official,pack-unofficial,pack-creator,pack-concurrency,pack}.business.spec.ts`, `src/app/modules/{item/components/item-editor/item-editor.pack,npc/components/npc-editor/npc-editor.pack,tools/pages/item-generator-page/item-generator-page.pack}.spec.ts`.
- Run: `npx ng test --watch=false --include <file>` (full suite: `npx ng test --watch=false`; now 9 files failed, 27 tests failed, 1969 passed of 1996; baseline 1991 all passed, so no regression outside the new red).
- Assumptions for green: `PackBusiness.enable(id)` stays as the "download an official pack" call (used by the rule fields and the Packs page Download button); `disable` and the `enabled` flag (storage field, `InstalledPack.enabled`) are gone; `packsFor(content)` may drop its `lang` arg (specs no longer call it directly); the Packs page "Always on" tag now reads "Always available" and the download button's label contains "Download"; `WordListBusiness.itemWords(lang, packId)` serves an active pack whatever its language. `openWorldWithPacks` needs `PackBusiness` to reach the session lazily (circular PackBusiness -> WorldSessionBusiness -> WorldLibraryBusiness -> PackBusiness).
- Failing (27):
  - pack-choice (10): without a world gives the Base alone; without a world a downloaded pack stays out; with a world sprites and Pack select list all its packs; with a world the word list of a pack in another language; skips an uninstalled active pack; lists only active packs with content; fallback to Base when no active pack has the list; fallback when the world has no pack; follows `saveRules`; back to Base when the world closes — all fail because packs are still filtered by `enabled` and app language, not by `$world().packs`.
  - random-item-image (3): other-language pack when the world has it active; draws only from active packs; only Base without a world — same reason.
  - packs page (7): Base "Always available"; no toggle on any card; official shows Download; Download then Downloaded + Remove; Remove clears state; failed download toast; unofficial card has no toggle — the toggle and "Always on" still exist, no Download button.
  - pack-official (1): downloaded pack stays out of sprites until a world has it active.
  - pack-unofficial (2) and pack-creator (1): stored pack has no `enabled` property (storage field still written).
  - item-editor.pack (2) and item-generator-page.pack (1): no world gives Random + Base only; world packs listed whatever the app language (item editor).

## Green

- Files: `src/app/core/business/active-packs.business.ts` (new), `pack.business.ts`, `pack-choice.business.ts`, `word-list.business.ts`, `src/app/core/services/pack-storage.service.ts`, `src/app/modules/world/business/world-session.business.ts`, `src/app/modules/character/services/character.service.ts`, `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: `ActivePacksBusiness.$worldPacks` (`string[] | null`) is set by `WorldSessionBusiness` on open, update/saveRules and close, so there is no cycle. `PackBusiness` reads it for `sprites()` and `packsFor(content)`: installed active packs whatever their language, uninstalled ids skipped, Base of the app language as fallback. `enabled`, `disable`, `setEnabled` and `languageOf` are gone, and the word-list language check too. No DB bump (the store is keyed by id, so old records just carry an unused field). The Packs page has a Download button instead of the toggles. Strings: "Always available" / "Toujours disponible", `packs.download`, `packs.toggle` removed, and the intro and details hints reworded. `CharacterService.publishCharacters` now returns when the role is not host (like `WorldService.publishInfo`), because the red `saveRules` test runs without a host.
- Suite: 231 files and 1996 tests pass (baseline 1991, plus the 5 new red). tsc clean, `ng build` OK. The only spec in `git diff --name-only` is `static-pages.spec.ts`, the user's own uncommitted credits work.
- Open questions: none

## Review

- Verdict: fix first
- Must fix: `src/app/modules/world/business/sandbox-world.business.ts:33` (`applyRules`) and `src/app/modules/tools/business/sandbox-rules.business.ts:16` — nothing ever calls `ActivePacksBusiness.set` for the sandbox world, so packs chosen in the Tools rules page never reach the generators, which stay on the Base of the app language (ticket: "the sandbox world included"). Fix: have the sandbox publish its packs to `ActivePacksBusiness` (on `applyRules`, and its language-driven default) and add a test through the seam.
- Must fix: `character.service.ts:82` — new host guard has no test of its own. Add one (non-host does not publish, host does).
- Consider: (1) guard is safe: `PeerApi.publish` throws "Only the host publishes" for non-hosts, and it copies `WorldService.publishInfo`, so `saveRules` with no room no longer fails after saving. Keep it, with the test above; do not make the red test set up a host.
- Consider: sync of `ActivePacksBusiness`. Host open/update/close are covered. Player join never opens the session, so players get the Base of the app language (fine, the host generates). Delete while open: `WorldLibraryBusiness.remove` does not touch the session, so the holder keeps the open world's packs, consistent with the session. Race: `GameSessionBusiness.stop()` during `session.open` awaiting can close first, then open sets the world and packs, leaving stale packs for generators. Guard with the `generation` check or close again.
- Consider: `word-list.business.ts:96` indentation broken; `lang` is now unused in `load` paths.
- Consider: `PackBusiness.activeIds` is read in `sprites()` but sprites are not reactive to pack changes.

## Review (re-check of the fixes)

- Verdict: ship
- Must fix: none
- Consider: the sandbox effect only runs once `SandboxWorldBusiness` is injected (Tools); elsewhere `null` already means the Base of the app language, so it is equivalent.

## Answer

- Content (word lists, sprites, random item image, the Pack select) comes from the active packs, whatever their language. They are those of the open world (a new core `ActivePacksBusiness`, set by `WorldSessionBusiness` on open, rules save and close), or of the sandbox in the Tools. With neither, the Base of the app language. Missing ids are skipped, and a generator with no list falls back to the Base of the app language.
- The Packs page lost its toggle and the `enabled` flag (no DB bump: old records keep an unused field). Official packs not downloaded show Download, and the Bases show "Always available".
- Also: `CharacterService.publishCharacters` returns when not host (like `WorldService.publishInfo`), with a test. A late `WorldSessionBusiness.open` after `close` no longer sets the world.
- Checked: suite 233 files / 2000 tests pass (baseline 1991). Build OK. Browser: Packs page with no toggle and "Toujours disponible"; Tools item generator without changes offers Random + Base (français); after ticking base-en in the Tools rules, it offers both Bases.
- Left: the sandbox lives in memory, so its pack choice is lost on a full reload (that was already true of its other rules). The open/close race guard has no test.
