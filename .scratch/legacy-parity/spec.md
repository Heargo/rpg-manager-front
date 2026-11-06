# Spec: legacy feature parity, rebuilt on Optimus UI

Status: needs-triage
Date: 2026-11-06
Depends on: `.scratch/p2p-rooms/spec.md`

## Goal

Bring back what `rpg-manager-frontend-legacy` (Angular 15 + Appwrite, last commit "allow to load default items") did, with a cleaner UI built from Optimus UI components and no backend. The legacy **game** becomes a **room**, and its **GM** (game master) is the room's **host**: the GM's device owns the world and dispatches it to the players.

## Legacy inventory

Routes: `home`, `login`, `signup`, `games`, `new-game`, `game`, `create-player`, `items`, `create-item`, `settings`, `tools`, `credits`, `contact`, `privacy-policy`.

| # | Feature | Legacy behaviour | Notes |
| - | --- | --- | --- |
| 1 | Landing | Logo, scroll arrow, "online support for your role play games" pitch, demo screenshot, footer (credits, contact, privacy policy). | |
| 2 | Accounts | Email signup/login/logout; settings page with change email/password (forms not wired) and delete account. | Replaced by a local profile (p2p ticket 01). |
| 3 | Games list | Cards (illustration, name, description) of games you created or joined; empty state; join by game ID; create; leave (player) or delete (GM). | Becomes "my rooms": hosted worlds + joined rooms. |
| 4 | New game | Icon upload, world name, description, **attributes** (name + default value), starting stat points, starting money; live card preview. | |
| 5 | Create character | Portrait upload + name; attributes copied from the game, stat points and money from the game's defaults. | Runs when a player joins a room for the first time. |
| 6 | Game table, GM view | Player list → select a player to see details; central **illustration** shown to every player; **quick images** strip (upload, click to push it to everyone); notes textarea (never saved, TODO); dice roller. | Live updates came from Appwrite realtime; now host broadcasts. |
| 7 | Game table, player view | Own character details, **life and mana bars** (current / max), dice roller, the illustration. | Life/mana were hard-wired attribute names. |
| 8 | Character sheet | Portrait; **11 equipment slots** (head, earring, necklace, ring, chest, hand, legs, foot, weapon 1, weapon 2); attributes with base + bonus and current value; player spends stat points, GM grants them; **inventory grid**; item actions: view details, equip/unequip, use (consumables add their modifiers to current values, capped at max), sell (adds price to money, removes item); money in "fantasy coins". | Attribute "pin" was hidden as not implemented. |
| 9 | Item catalogue (GM) | Search by name; filter by rarity, type, price range; hover preview; actions: give to player, edit (WIP), delete; items without an image fall back to a default illustration (`default_item.jpg`, commit `bce168e` "allow to load default items"). | There was no built-in item list; see Default items. |
| 10 | Item editor | Image, name, rarity (common → legendary), type (item / consumable / equipment), slot (equipment only), price, description, stat modifiers; **JSON tab** (edit the item as JSON); **AI tab** (copies a prompt built from the game's attributes, to paste into an LLM, which returns item JSON + an image prompt). | |
| 11 | Dice roller | `N d F` inputs, roll, total coloured by how high it is, each die shown. | Was local only. Rebuilt as 3D physics dice, see Dice roller. |
| 12 | Tools | Link cards: Watabou's Procgen Arcana, Azgaar's Fantasy Map Generator, Squoosh. | |
| 13 | Shared UI | Rarity icon, toasts, loading overlay, custom dropdown and context menu. | All replaced by library components. |

## Cleaner UI: component mapping

| Need | Optimus UI |
| --- | --- |
| Room / item cards, empty states | `p-card`, `p-dataview` (grid/list) |
| New game, new character | `p-stepper` with a live `p-card` preview; `p-inputnumber`, `p-textarea`, `p-fileupload` (basic mode) |
| Attributes editor | `p-table` with inline editing, add/remove rows |
| Table layout | `p-splitter` (GM: players / illustration / notes+dice), `p-drawer` on mobile |
| Character sheet | `p-tabs` (Stats / Equipment / Inventory), `p-progressbar` for life & mana, `p-inputnumber` with buttons for stat points, `p-badge` for unspent points |
| Item actions | `p-contextmenu` (right-click) and a `p-menu` button (touch) |
| Item details | `p-popover` on hover/tap, `p-dialog` for full view |
| Catalogue filters | `p-iconfield` search, `p-multiselect` rarity and type, `p-slider` range for price |
| Rarity | `p-tag` with one colour token per rarity in `ui.preset.ts` |
| Item editor tabs | `p-tabs`: Form / JSON (`p-textarea`, validated) / AI prompt (copy button) |
| Delete / leave | `p-confirmdialog` |
| Feedback | `p-toast`, `p-skeleton` instead of a full-screen loader |

## Data in a serverless world

- **GM device** (host) stores worlds in IndexedDB: game settings, item catalogue, characters, inventories, illustration and quick images, notes. It's the source of truth while the room is live.
- **Player device** stores its profile, the rooms it joined (code + last snapshot for an offline read-only view).
- **Images** (game icon, portraits, item images, illustrations) are resized client-side (max ~512 px, WebP) and stored as blobs; the host sends them over the data channel in chunks, and clients cache them by content hash so they're sent once.
- Players act through **feature services** (`characterService.spendStatPoint()`, `equip()`, `use()`, `sell()`): requests to the GM's device, whose business handlers validate them with the rules in row 8 (`character.rules.ts`) and publish the new state. GM-only actions (grant points, give item, change illustration) are service calls whose host handlers reject them unless they come from the host itself.
- **Export/import a world as JSON** replaces cloud backup (the legacy JSON item editor is the same idea at item level).

## Default items (decided: yes, for now)

The legacy app had no starter catalogue, only a default image. We ship one:

- A bundled `starter-items.json` (~30 items across every rarity, type and equipment slot) plus the default item image, in `public/`.
- When creating a world, a "Start with the default items" checkbox (on by default) copies them into the world's catalogue; the catalogue also has "Import default items" later.
- Item modifiers name attributes. On import, modifiers on attributes the world doesn't have are dropped, and the dialog says how many; attribute names are matched case-insensitively.

## Item generation (decided: three tiers)

1. **Random generator, no AI** (default, every browser, offline).
2. **On-device AI** with Chrome's built-in Prompt API (`LanguageModel`, Gemini Nano), feature-detected and hidden elsewhere. It receives the random generator's draw and the world's attributes and writes the name and description, returning JSON that matches the item schema. Caveats: Chrome desktop only, a one-time ~4 GB model download, and its status on regular websites (stable vs origin trial) must be checked when building it.
3. **Copy prompt + paste JSON** (kept from legacy), for any free chatbot; the JSON tab validates the result.

### Random generators as separate helpers

Pure functions, no Angular, no DOM, each in its own file under `src/app/core/generators/`, unit-tested on their own:

```
core/generators/
  random-source.ts     RandomSource { nextUint32(): number }
                       cryptoRandomSource()      crypto.getRandomValues, for anything a player sees as a roll
                       seededRandomSource(seed)  small seeded PRNG (sfc32), for rerolls, previews and tests
  random.ts            randomInt(src, min, max)  unbiased: rejection sampling, never `% n` on a raw value
                       pick(src, list), weightedPick(src, [{value, weight}]), shuffle(src, list) (Fisher–Yates), chance(src, p)
  dice.ts              rollDie(src, sides), rollDice(src, count, sides), d100 as tens + units
  word-list.ts         WordList types + validateWordList(json) → WordList | errors
  name-generator.ts    generateItemName(src, words, { slot, type, rarity }) → string (templates, grammatical gender)
  item-generator.ts    generateItem(src, words, { attributes, rarity?, type?, slot? }) → ItemDraft
                       rarity → number and size of modifiers, price from rarity × modifier total
```

Business code (`item-editor.business.ts`) picks the source (seeded for "Reroll" with a visible seed, crypto otherwise), loads the word list for the active language and calls these helpers. Generators never read the language or fetch anything themselves.

### Word lists: loadable JSON per language

- Files: `public/i18n/generators/<lang>/items.json` (`en`, `fr`), loaded at runtime by `word-list.service.ts` (HTTP only) and cached per language by `word-list.business.ts`, which follows the active language (`LanguageBusiness.$language`). Missing or invalid file → fall back to `en` and log once.
- Cached by the service worker like the other `i18n/` files, so generation works offline.
- Format (versioned, validated on load):

```json
{
  "version": 1,
  "templates": {
    "common": ["{base} {adjective}"],
    "legendary": ["{base} {adjective} {suffix}", "{base} {suffix}"]
  },
  "bases": {
    "head": [{ "text": "Casque", "gender": "m" }, { "text": "Couronne", "gender": "f" }],
    "consumable": [{ "text": "Potion", "gender": "f" }]
  },
  "adjectives": {
    "common": [{ "m": "rouillé", "f": "rouillée" }],
    "legendary": [{ "m": "éternel", "f": "éternelle" }]
  },
  "suffixes": { "rare": ["de vigueur"], "legendary": ["des anciens rois"] },
  "descriptions": { "equipment": ["Forgé pour {wearer}."] }
}
```

  English uses the same shape with `"{adjective} {base}"` templates and plain-string adjectives (a string means one form for every gender). The template order per language handles word order; `gender` handles agreement. New languages are a new folder, no code change.
- The item draft stores the generated text, so a world's items stay in the language they were made in, even if players use other languages.

## Dice roller (decided: 3D physics)

Clicking **Roll** opens a modal (`p-dialog`, full screen, transparent so the page looks like the table) where 3D dice are thrown, bounce off each other and off the **screen edges**, and settle. The result is fair and does not depend on the physics.

### Fairness

- The value of every die is drawn **first**, with `rollDice(cryptoRandomSource(), count, sides)` from `core/generators/dice.ts`: `crypto.getRandomValues` + rejection sampling, so each face of an `n`-sided die has probability exactly `1/n`.
- Physics never decides the result: simulated polyhedra are not perfectly fair (mesh, collision shape, throw angle), and many sizes have no fair solid at all.
- **Predetermined landing**: for each throw, run the simulation headless (fixed timestep, fast-forward, Rapier is deterministic for the same inputs) with a random throw (position, velocity, spin from a non-crypto PRNG: it only affects the animation). Read which face ends up on top, then **relabel** that die's faces so the top face shows the drawn value (swap that label with the face that had it). Replay the same simulation visibly. If a die ends cocked (top face normal within ~10° of vertical not reached) or off the table, re-run that throw with a new seed.
- Labels stay a permutation of `1..n`, so a die never shows a number twice.

### Shapes

| Sides | Shape |
| --- | --- |
| 4, 6, 8, 12, 20 | Tetrahedron, cube, octahedron, dodecahedron, icosahedron |
| 10 | Pentagonal trapezohedron |
| 100 | Two d10s: tens (`00`–`90`) and units (`0`–`9`), `00` + `0` = 100; drawn as one uniform value in `1..100`, then split |
| Other `n` | No fair solid exists: the smallest standard shape with at least `n` faces, labelled with distinct values from `1..n` (top face = drawn value); above 20, the d20 shape with the drawn value on top and distinct other values |

d4: read the value at the top vertex (standard d4 convention), labels arranged accordingly.

### Table

- Floor plane and four walls placed at the visible screen edges at floor height (computed from the camera frustum), recomputed on resize/orientation change; restitution ~0.4, friction tuned so dice slide a little before stopping.
- Dice thrown from a random screen edge toward the centre, with random spin.
- Settled when every body sleeps, or after 6 s. Then a result bar: each die value, the total (coloured by ratio to max, as in legacy), "Roll again" and "Close". Clicking during the throw skips to the final position.
- Up to ~20 dice simulated; above that, 20 are thrown and the bar lists all values.
- `prefers-reduced-motion`: no animation, results shown at once.

### Tech

- `three` (MIT) for rendering and `@dimforge/rapier3d-compat` (Apache-2.0, WASM inlined) for physics, both **lazy-loaded** with a dynamic import when the modal first opens, so the main bundle stays the same size; the service worker caches the chunk for offline use.
- Face labels are textures drawn on a canvas per die, so relabelling is a texture swap.
- Layering: `dice.ts` (draw), `dice-roll.business.ts` (count/sides state, draw, history), `dice-scene` (three + rapier, the only code touching them, takes `{ sides, values, seed }` and plays it). Components never draw values.

### In a room

Shared rolls send `{ count, sides, values, seed }`. Other players replay the throw from the seed and relabel to the same `values`, so they see the same result even if their physics drift slightly.

## Improvements over legacy

- Life and mana become configurable "bar attributes" in the game settings instead of hard-wired names.
- Notes are saved (legacy never saved them).
- Players can keep using allowed features while the host is offline (configured per room).
- Item edit works (was WIP).
- Dice rolls can be shared to the table (optional toggle), since the host can broadcast them.
- Money format is a game setting (the legacy `MoneyFormat` enum existed but was always fantasy coins).
- Mobile layout from the start.

## Tickets

See `issues/`. They assume the p2p tickets 01–03 and 07 land first; 01, 02 and 03 here can start right away since they run locally.

## Open questions

1. Item generation: confirm the three tiers above (random generator, Chrome on-device AI, copy prompt).
2. ~~Default items~~: decided, yes; bundled starter pack (no legacy list exists).
3. ~~Shared dice rolls~~: decided, off by default, toggle next to the Roll button.
4. ~~Item generation~~: decided, three tiers; generators as pure helpers, word lists as JSON per language.
5. ~~Dice~~: decided, 3D physics modal with predetermined fair results.
