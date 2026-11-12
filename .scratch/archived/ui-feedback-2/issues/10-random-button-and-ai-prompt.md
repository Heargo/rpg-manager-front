# Random button next to Save, Copy AI prompt in JSON tabs

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- Every "Generate" button becomes "Random" (FR « Aléatoire »), icon `pi-sparkles`, placed next to the editor's Save button (items, NPCs, and any other editor that has one).
- The JSON tab of every editor (item, NPC, skill, class) gets **Copy AI prompt**: copies to the clipboard a prompt (in the active language) describing the expected JSON shape, the world's attribute names and the allowed values, asking a chat AI to answer with JSON only. A toast confirms.
- The prompt builder is a pure helper per entity.

## Baseline

Test Files 134 passed, Tests 1144 passed.

## Seams

1. **AI prompt builders (pure helpers, one per entity: item, NPC, skill, class)**: given the world's attributes and the language, return a prompt naming the JSON fields, allowed values (rarities, kinds, types, targets…) and the attribute names, asking for JSON only. Misses: real AI answers.
2. **Editor components (item, NPC, skill, class; `TEST_PROVIDERS`, clipboard faked)**: the JSON tab has Copy AI prompt, which writes the built prompt to the clipboard and toasts; the item and NPC editors' Random button reads "Random"/"Aléatoire" with `pi-sparkles` and sits with the Save button.

## Red

- JSON tabs today: item, NPC, skill and class editors all already have one (the ticket adds only Copy AI prompt to them; the item editor already has a `copy-prompt` button in its Generate tab, to be moved to the JSON tab as `copy-ai-prompt`).
- Contract chosen by the tests: `buildItemPrompt(attributeNames, language)` in `item/helpers/item-editor.rules.ts`; new files `npc/helpers/npc-ai-prompt.ts` (`buildNpcPrompt`), `skill/helpers/skill-ai-prompt.ts` (`buildSkillPrompt`), `class/helpers/class-ai-prompt.ts` (`buildClassPrompt`), all `(attributeNames, 'en' | 'fr')`. EN prompts contain "JSON only", FR ones "uniquement". Hooks: `[data-action="copy-ai-prompt"]` (JSON tab, success toast via `MessageService`), `[data-action="random"]` (replaces `generate`, same parent as `save`, label Random/Aléatoire, `pi-sparkles`).
- Existing specs that use `[data-action="generate"]` / `copy-prompt` (item and NPC editor specs) will need updating in green.
- Env note: `npx ng test` fails to build here for any spec (`node:crypto` in `src/testing/jsdom-setup.ts`, @types/node not loaded), even on a clean tree. I ran with a temporary tsconfig adding `"node"` to `types` (`--ts-config`), since deleted.
- Test files: `src/app/modules/item/helpers/item-ai-prompt.spec.ts`, `src/app/modules/npc/helpers/npc-ai-prompt.spec.ts`, `src/app/modules/skill/helpers/skill-ai-prompt.spec.ts`, `src/app/modules/class/helpers/class-ai-prompt.spec.ts`, `src/app/modules/item/components/item-editor/item-editor.ai.spec.ts`, `src/app/modules/npc/components/npc-editor/npc-editor.ai.spec.ts`, `src/app/modules/skill/components/skill-editor/skill-editor.ai.spec.ts`, `src/app/modules/class/components/class-editor/class-editor.ai.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (add `--ts-config` with node types if the env issue persists)
- Failing: 18 tests
  - item/npc prompt helper (2 each) — item: TS error, `buildItemPrompt` takes 1 argument (no language); npc/skill/class: module `*-ai-prompt` missing
  - skill/class prompt helper (2 each) — module missing
  - item, NPC editors (3 each): copy AI prompt + toast, prompt in active language, Random next to Save with sparkles and no Generate — `copy-ai-prompt` / `random` hooks absent (null)
  - skill, class editors (2 each): copy AI prompt + toast, prompt in active language — `copy-ai-prompt` absent

## Green

- Files: `src/app/modules/{item/helpers/item-editor.rules.ts,item/business/item-editor.business.ts,npc/helpers/npc-ai-prompt.ts,skill/helpers/skill-ai-prompt.ts,class/helpers/class-ai-prompt.ts}`, the four `*-editor.business.ts` and `*-editor.component.ts` (item, npc, skill, class), `public/i18n/{en,fr}.json`; updated older specs `item-editor.component.spec.ts`, `npc-editor.component.spec.ts` (selectors only: `generate` -> `random`, `copy-prompt` -> `copy-ai-prompt`) and `item-editor.rules.spec.ts` (`buildItemPrompt(attributes, 'en')`, forced by the new signature).
- Change: pure prompt builders per entity (every JSON field with its type, allowed values, attribute names, JSON only, EN/FR). JSON tab of the four editors has Copy AI prompt (clipboard + toast, active language). Item/NPC Random button (`pi-sparkles`, from the seed in the Generate tab, which keeps seed, reroll and class options) sits next to Save; the item's copy-prompt left the Generate tab. New i18n keys `ai.*`, `common.random`; removed the unused `item.editor.{generate,copyPrompt,copyPromptHint,promptCopied,copyFailed}` and `npc.editor.generate`.
- Suite: 142 files / 1162 tests pass (baseline 134 / 1144 + 18 new); tsc clean; ng build no error.
- Open questions: NPC prompt cannot ask for per-attribute levels or inventory (the NPC JSON uses attribute ids); it lists the attribute names as context only. Random reuses the visible seed (same seed, same result; Reroll gives a new one).

### Green update

- Random now draws a fresh seed on every click (visible seed updated) and generates. The Generate tab gained `[data-action="generate-seed"]` ("Generate from this seed", key `common.generateFromSeed`) to reproduce from a typed seed. The older item/NPC editor specs that typed a seed then clicked `random` now click `generate-seed` (selector only). Suite 142 files / 1162 tests pass; tsc and ng build clean.

## Answer

Pure AI prompt builders per entity (EN/FR); Copy AI prompt in the JSON tab of the item, NPC, skill and class editors; Random (pi-sparkles) next to Save on the item and NPC editors draws a fresh seed per click (Generate tab keeps Generate from this seed). Browser: item editor Random gives a new item per click, no console error. Limit: the NPC prompt lists attribute names as context only (NPC JSON uses attribute ids).
