# Host offline mode

Status: resolved
Type: task
Blocked by: 09

Spec: `../spec.md` (Host offline).

- Host-offline icon with tooltip in the nav bar and on the table when the host's channel closes.
- Room setting `offlineFeatures` (dice, notes, spend stat points, equip/unequip, use consumables, sell) edited by the host with `p-toggleswitch`es on room create/edit; defaults per the spec table; part of the room state.
- Offline, allowed actions apply to the local copy through the same reducer the host uses and are queued; disallowed ones are disabled with a tooltip.
- On reconnect, the mismatch flows into "Pick a save" (ticket 09) with the queue attached.

## Baseline

`npm test`: 60 test files, 394 tests, all passed (2026-11-07, `develop` at 4f4d57f).

## Already there

- `OfflineFeatures` (`world/models/world.ts`), with defaults in `world.factory.ts`, toggles in the new-world wizard (L04), and published in `WorldInfo`.
- `RoomStatus` `'host-offline'` (`room.business.ts`).
- P09's player copy, gate and "Pick a save", whose conflict carries an always-empty `queued` list.

## Decisions (user, 2026-11-07)

- **Edit for an existing room:** an "Offline features" panel with the same toggles in the host's lobby (room page). It is saved on the world and published in the room state.
- **Player notes are built in this ticket:**
  - Each player has personal notes, saved by the host with their record.
  - Online, edits go through a service to the host.
  - Offline, when allowed, the player edits locally and the edit is sent on reconnect (queued like the other actions).

## Seams

Confirmed with the user (2026-11-07):

1. **`offline-actions.rules.ts`** (pure): which actions each offline feature allows (spend stat points, equip/unequip, use, sell, notes); applying an allowed action to the local copy with the host's own reducer (`character-actions.rules.ts`) while appending it to the queue (route + payload). Catches rule bugs; misses the wire.
2. **Player and host over the fake peer network** (`src/testing/game-device.ts`):
   - the host's channel closes, so status is `host-offline`;
   - an allowed action (and a notes edit, when allowed) changes the local copy and is queued;
   - a disallowed action is refused;
   - on rejoin, the host's "Pick a save" conflict carries the queue: keeping the host's version drops it, and using the player's accepts it;
   - online, player notes are saved by the host;
   - the lobby's toggles change the published offline features.

   Misses UI.
3. **Components** (`TEST_PROVIDERS`):
   - the host-offline icon with its tooltip in the nav bar and on the table;
   - sheet actions disabled with a tooltip when not allowed offline;
   - the player notes field (read-only offline when notes aren't allowed);
   - the lobby's offline toggles.

   Misses real layout.

## Red

- Test files:
  - `src/app/modules/character/helpers/offline-actions.rules.spec.ts`
  - `src/app/modules/character/business/offline.spec.ts`
  - `src/app/core/components/host-offline-icon/host-offline-icon.component.spec.ts`
  - `src/app/core/components/nav-bar/nav-bar.component.spec.ts`
  - `src/app/modules/table/pages/table-page/table-page.component.spec.ts`
  - `src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts` (2 tests added)
  - `src/app/modules/character/components/player-notes/player-notes.component.spec.ts`
  - `src/app/modules/room/components/offline-features-panel/offline-features-panel.component.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (one per file; `npm test` does not build until the missing modules exist)
- Failing: 31 tests (a missing module fails the whole file's build):
  - rules (9): isOfflineAllowed maps each action / refuses when off / never allows GM actions; applyOffline applies and queues / keeps queue order / refuses when off (`character.errors.offlineNotAllowed`) / passes on reducer refusal; applyOfflineNotes sets and queues / refuses — missing `character/helpers/offline-actions.rules` (`isOfflineAllowed(features, kind)`, `applyOffline(attributes, character, queue, action, features)`, `applyOfflineNotes(character, queue, notes, features)`; queue entry `{route: 'character/<kind>' | 'character/save-notes', payload: {characterId, ...}}`).
  - wire (12): features set by host reach players and the world; online notes saved by host; every action allowed online; status host-offline; disallowed action refused (`forbidden`); allowed action changes local copy, saved copy and queue; offline notes queued; offline notes refused; conflict carries queue; keep host drops queue; use player accepts queue; queued notes come with the player's version — missing `character/business/offline.business` (`OfflineBusiness`: `$offline`, `$features`, `$queue`, `$myCharacter`, `canAct(kind)`, `act(characterId, action)`, `saveNotes(text)`, `canEditNotes()`), `world/business/offline-features.business` (`OfflineFeaturesBusiness.set(features)`), `Character.notes`, route `character/save-notes`, and `PlayerCopyBusiness` submitting the queue. Built in a child injector over `gameDevice`, like `player-copy.spec.ts`; host channel closed with `PeerApi.disconnect`.
  - icon (2): shows with tooltip as `aria-label` when `host-offline`; appears/disappears with status — missing `HostOfflineIconComponent` (`.host-offline-icon`, injects `RoomBusiness.$status`).
  - nav bar (1) and table page (1): icon appears when status turns `host-offline`, disappears when connected — assertion fails (no `.host-offline-icon` in either).
  - sheet (2): spend button disabled with `[data-locked="spend-stat-point"]` wrapper `aria-label` "Not available while the host is offline"; unlocked stays enabled — missing input `lockedActions` (`CharacterActionKind[]`).
  - notes (2): save emits edited text; read-only has no save — missing `PlayerNotesComponent` (`notes`, `readOnly` inputs, `save` output, `textarea`, `[data-action="save-notes"]`).
  - panel (2): one switch per feature; toggle emits whole object — missing `OfflineFeaturesPanelComponent` (`features` input, `featuresChange` output, `[data-feature=key] input[role=switch]`).
- Not covered: the sell/equip/use menu entries of the sheet (menu is internal), the lobby page embedding the panel.

## Green

- Files: new `character/helpers/offline-actions.rules.ts`, `character/business/offline.business.ts`, `world/business/offline-features.business.ts`, `core/components/host-offline-icon/`, `character/components/player-notes/`, `room/components/offline-features-panel/`. Changed: `Character.notes`, `character-api.ts` (route `character/save-notes`, limits), `character.service.ts`, `character-host.business.ts`, `player-copy.business.ts`, `player-copy-host.business.ts`, character sheet (+page), room page, table page, nav bar, `en.json`/`fr.json`.
- Change: rules and `OfflineBusiness` apply allowed actions to the local copy (saved per room) and queue them; `PlayerCopyBusiness` owns the queue, submits it with the copy and clears it once the pick is done. Host: `character/save-notes` is owner-or-GM only (and refused while held); each `queued` entry is validated (`isValidQueue`: player actions or notes only, same character, bounded) before it reaches the dialog, else the submit is rejected. UI: icon in nav bar and table, offline panel in the host lobby (saves via `OfflineFeaturesBusiness.set`), notes on the sheet page, sheet spend/equip/use/sell locked with a tooltip (menu entries get `disabled` + `title`).
- Suite: 67 files / 425 tests pass (baseline 60 / 394 plus the new specs); tsc clean; build OK, initial 1.02 MB (within the 1.02MB error budget, only the existing 500kB warning).
- Open questions: (1) the character list is broadcast to every player, so personal notes reach all players' devices (not shown, but present); stripping them needs per-peer publishing. (2) The queue is kept in memory, not in IndexedDB: a reload while offline loses it (the changed copy is still saved, so "Pick a save" still shows the difference). (3) "Use the player's version" takes the player's copy as is; the queue is shown to the GM, not replayed.

### Fix round (after review)

- Notes are owner-only: `CharacterHostBusiness.publish` strips `notes`; the owner gets them from the `character/save-notes` answer, the `player-copy/hello` answer (`notes`) and a new `player-copy/notes` request after a pick; `PlayerCopyBusiness.$notes` keeps them and the saved copy carries them. The sheet shows notes to the owner only (the GM keeps the `save-notes` route right, but no UI and no notes in the list).
- "Use player version" replays: `replayQueue` (rules) applies the validated queue to the host record with `applyCharacterAction`, the notes rule and the offline features; nothing from the submitted copy. `usePlayer` resolves with the refused entries; the pick dialog shows a warning toast (`character.pickASave.refused`).
- Queue persisted with the copy (`PlayerCopyStorageService` stores `{character, queue}`, loaded in `hello` and when the room is known); `$offlineCopy` restores the changed copy. Queue holds one notes entry (last wins); `isValidQueue` refuses two.
- Tests added/changed: `isValidQueue` (bad route, GM kinds, other character, junk, >200, two notes, oversize), `replayQueue`, notes-last-wins; wire: second player's list has no notes, owner gets notes back on rejoin, other player and held player refused on `save-notes`, forged copy not applied, refused entries reported, queue survives a new business instance. Changed P09 spec: "use player version" now yields the host record (statPoints 5, rev 3); P10 spec reads notes from the host record.
- Suite: 67 files / 438 tests pass; tsc clean; build OK, initial 1.02 MB (same as before; only the 500kB warning), budget not raised.
- Open: a true page reload is simulated by a new business instance over the same IndexedDB; the restored offline room state itself is not covered.

## Review

- Verdict: fix first
- Must fix:
  - `character-host.business.ts:110` (`publish`) — personal notes ride in `world.characters`, broadcast to every player; "personal" notes land on all devices — strip `notes` from the published list and give each owner only their own. `PeerApi` has only broadcast `publish` (no per-peer send), so either add a per-peer publish helper in `core/p2p` (tested) or push the owner's notes in the `save-notes` answer and in the `hello` answer (`PlayerCopyHelloAnswer` gains `notes`), and keep notes in the local copy only. Add a wire test: a second player's `$characters()` has no `notes`. If the user accepts the leak for now, record it as a decision in the ticket and in the spec, and drop the "personal" wording; otherwise this blocks.
  - `player-copy-host.business.ts` `resolve`/`onSubmit` — "Use player's version" takes the submitted copy wholesale (stats, money, items) after only checking ids, so a modified client can write any state; the validated queue is shown but never used. Spec: the GM chooses to "accept" the queued actions. Fix: on `player`, start from the host record and replay the validated queue through `applyCharacterAction` / notes (refused entries reported to the GM); do not take `copy` fields. This also settles open point (3): as built, the queue is cosmetic and the copy is trusted. If P09 deliberately trusts the copy, say so in the ticket and keep this as Consider.
- Consider:
  - `player-copy.business.ts:40` — queue in memory only; a reload offline loses it (open point 2). The changed copy is saved, so "Pick a save" still fires but with `queued: []`, and the spec says the list is shown. Not blocking if (3) is fixed by replay, since then losing the queue silently loses the replay: persist it next to the copy in `PlayerCopyStorageService` (same record, `{copy, queue}`), load it in `hello`. Do this together with P12.
  - `offline-actions.rules.ts` `isValidQueue` — sound: array, bounded 200, same `characterId`, GM actions excluded, per-kind `parseCharacterAction`, notes length bounded. Gaps: total payload size is bounded only by the 256 KB message; notes entries are 5000 chars each x200 = 1 MB, so reject queues with more than one notes entry or cap bytes. Also no test for GM kind, wrong character, oversize (check `offline-actions.rules.spec.ts`).
  - `onSaveNotes` — enforcement is right (parse, member, held, owner-or-GM, rev bump, publish). Missing test: another player's character gives `forbidden`; no test for a held player.
  - Bundle: 1.02 MB is the error budget, zero headroom. Nothing heavy went in. The room panel, notes and sheet are lazy (route components). Initial gets: the icon and `TooltipModule` in the nav bar (needed there), and `offline-actions.rules` via `character-host.business` (host handlers, small, tree-shaking can't drop them). `OfflineBusiness` and `OfflineFeaturesBusiness` are only reached from lazy pages. Nothing to move; the next ticket will break the budget, so find 30 kB first.
  - Test gap (confirmed by grep): no test calls `isValidQueue` (bad route, GM kind, other character, over 200 entries) or `character/save-notes` as another player / while held; a regression there would stay green. Add them (rules spec + `offline.spec.ts`).

## Review (fix round)

- Verdict: ship
- Must fix: none. All three earlier Must fix lines are closed:
  - Notes: `CharacterHostBusiness.publish` strips `notes`. The owner gets them via the `save-notes` answer, the hello answer and `player-copy/notes`. The wire test checks a second player's list and the GM's list have none, the host record has them, and the owner gets them back on rejoin.
  - Replay: `resolve` starts from the host record and calls `replayQueue`. Nothing comes from `conflict.player`. The forged-copy test (money 9999) expects money 20; the refused-entry test expects the refusal reported and the record unchanged.
  - Test gaps: `isValidQueue` cases, other-player and held-player `save-notes` are covered.
- Spec changes match the decisions and keep coverage. "Use player version" now expects statPoints 5 and rev 3, the host record plus an empty queue, as decided. The notes assertions read the host record, with extra checks that the broadcast has none. Nothing was removed.
- Consider:
  - `character-host.business.ts`, `offline-actions.rules.spec.ts` and others: prettier reformatting of whole files inflates `git diff HEAD`. Keep it out of feature commits, or commit it separately.
  - `replayQueue` checks the features as they are at pick time. That is the right choice (the host decides now), and the test documents it.
  - The restored offline room state after a true reload is not covered (already noted as open). It belongs with P12.

## Answer

Built:

- `character/helpers/offline-actions.rules.ts`: which actions each offline feature allows, applying an allowed action to the local copy with the host's reducer and queueing it (one notes entry, the last wins), `isValidQueue` and `replayQueue`.
- `OfflineBusiness`: the player acts on the local copy while the host is offline. `PlayerCopyBusiness` owns the queue and saves `{character, queue}` per room in IndexedDB, so it survives a reload. It submits the queue on rejoin and clears it after the pick.
- Host side:
  - "Use player version" starts from the host record and replays the validated queue (nothing is taken from the submitted copy); refused entries are shown to the GM in a toast. "Keep host version" drops the queue.
  - `character/save-notes`: only the owner or the GM, and refused while the player is held.
  - Notes are stripped from the broadcast list; the owner gets them in the save-notes and hello answers and through `player-copy/notes`.
- UI:
  - the host-offline icon with its tooltip in the nav bar and on the table;
  - the "Offline features" panel in the host lobby (`OfflineFeaturesBusiness.set`, saved on the world and published);
  - player notes on the sheet page (owner only);
  - spend, equip, use and sell locked with a tooltip when not allowed offline.

Decisions (user, 2026-11-07):

- The toggles can be edited in the lobby.
- Player notes are built here.
- Notes are delivered to their owner only, so the GM has no view of players' notes.
- "Use player version" replays the queue.
- The queue is persisted in P10.

Checked:

- Suite: 67 files, 438 tests (baseline 60 / 394). Build OK, initial 1.02 MB, exactly at the budget, which is not raised.
- Browser:
  - created and hosted a local world (`Test P10`, left in this browser's IndexedDB);
  - the lobby panel shows 6 toggles with the spec defaults (dice and notes on);
  - a toggle survives a reload;
  - checked in English at mobile width, with no console error and no horizontal scroll.
- Not in the browser: the player side (offline actions, queue, icon on a client, the conflict with the queue), which needs two profiles and is covered by the multi-device specs (`offline.spec.ts`, `player-copy.spec.ts`).

Left as Consider:

- The initial bundle has no headroom left: find about 30 kB before the next ticket that touches the initial bundle.
- A true page reload restoring the offline room state is not tested (with P12).
- Some files were reformatted by prettier in this commit.
