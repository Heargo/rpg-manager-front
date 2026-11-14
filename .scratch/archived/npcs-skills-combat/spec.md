# Spec: NPCs, skills, classes and combat

Status: validated (2026-11-08)
Date: 2026-11-08
Depends on: `archived/legacy-parity/` (item catalogue, character sheet), `archived/ui-feedback/` (attribute formulas, XP and level)

## Goal

The user's request (2026-11-08):

- **NPCs** for the story, merchants and enemies, kept in a **catalogue** per world, like the item catalogue. An NPC has the same structure as a character: attributes, XP, level, equipment, inventory, money.
- **Skills**, predefined by the GM in a **skill catalogue**.
- **Classes**, each with a **skill tree** the GM designs. A player picks a class when creating a character.
- **Skill points**: a character gains a number of them per level and spends them in their class's tree.
- A **combat system**.

**This app is a tool for a tabletop game played in real life, not a video game.** It shows the information and the actions people need; it doesn't simulate everything. Players organise themselves at the table, roll their own dice if they want, and the GM always has the last word. Where the app computes something (a skill's damage, a cost), it shows the number and offers to apply it; nothing is forced.

Nothing like this existed in the legacy app, so every rule below is new. Rules marked **(assumed)** are defaults picked for this spec and still need the user's yes.

## Decisions (user, 2026-11-08)

1. The GM can show **any NPC** on the players' table; what players see depends on the NPC's role.
2. Players see **only their own class and their own skills**, not the catalogues.
3. A **World rules** page lets the GM change the world's rules after the wizard.
4. Combat is **configurable per world** (grid or not, actions per turn, initiative…), and stays a table aid: it shows information and actions, it doesn't simulate the fight.
5. Selling is **configurable in the world's rules**.
6. NPC generation **builds on the classes**; the GM can then add any skill they want, to NPCs and to characters alike.
7. What players see of an NPC, per role, is **set in the world's rules**.
8. In combat, using a skill **rolls its dice at once**; the **GM chooses** whether to apply the result.

## Terms

| Term | Meaning |
| --- | --- |
| **Sheet** | What a character and an NPC share: name, portrait, level, XP, attributes, inventory, money, stat points, class, skills, skill points. Rules that read a sheet (`attributeStats`, level rules, equip) work on both. |
| **Character** | A sheet owned by a player (`playerId`), as today. |
| **NPC** (FR: PNJ) | A sheet owned by the GM, kept in the world's NPC catalogue. It has one or more **roles**: `story`, `merchant`, `enemy`. |
| **Skill** | A catalogue entry: an active skill (used in combat or in play) or a passive one (permanent modifiers). It has **ranks** (1 to its max rank). |
| **Class** | A catalogue entry with a name, a description, an image, optional starting bonuses and a **skill tree**. |
| **Skill tree** | The skills a class can learn, as nodes with prerequisites and a minimum level. |
| **Skill points** | Spent to learn a skill or raise its rank. Separate from stat points. |
| **Encounter** | One combat on the table: participants, turn order, rounds, a log, optionally a grid. |
| **Combatant** | A participant of an encounter: a character, or a copy of a catalogue NPC with its own current values. |

## Shared sheet model

- Extract a `Sheet` type from `Character`. `Character = Sheet & { playerId, rev, notes }`. `Npc = Sheet & { roles, description, xpReward, loot, merchant? }`.
- `attributeStats`, `levelProgress`, equip / unequip / use rules take a sheet, so an NPC's maxima, equipment bonuses and passive skills are computed exactly like a character's.
- New fields on `Sheet`: `classId?`, `skillPoints`, `skills: { skillId, rank }[]`.
- Format change, no fallback (dev rule: no backward compatibility): world exports without the new fields are refused on import, and dev databases are reset.

## World rules page

- `/room/rules` (GM only, button in the host lobby), and the same form on the sandbox world in Tools.
- It edits every rule the wizard's Rules step sets today (starting stat points and money, level curve, max level, stat points per level, offline toggles) plus the new ones: skill points, selling, combat. Sections in `p-tabs` or a `p-accordion`: **Progression**, **Economy**, **NPCs** (what players see per role), **Combat**, **Offline**.
- **Attributes** can be edited too: add one, rename, change base value, formula and cap. Deleting an attribute asks for confirmation and removes it from every sheet and from item modifiers that name it **(assumed)**.
- Changes apply at once to everyone (`world/info` is published again) **(assumed)**:
  - starting values (stat points, skill points, money) only affect characters created afterwards;
  - a new level curve recomputes each sheet's level from its XP, without granting or taking points **(assumed)**;
  - a lower max level caps sheets at it (their XP is kept).
- Same validation as the wizard; the wizard and the page share the rule fields (one component).

## NPC catalogue

- `World.npcs: Npc[]`. Only the host has it; players never receive the catalogue (like items).
- **Catalogue page** (`/room/npcs`, GM only, button in the host lobby next to Items): `p-dataview` grid of NPC cards (portrait, name, level badge on the rarity scale, role tags), search by name, role `p-multiselect`, level range. Actions: edit, duplicate, delete (with confirmation), show on the table, and "Add to combat" during an encounter.
- **NPC card**: the character card format at a smaller size, so a GM reads an NPC the way they read a player.
- **NPC editor** (`/room/npcs/editor[/:id]`), tabs like the item editor:
  - **Form**: portrait, name, description, roles, level (the GM sets it directly; XP follows the start of that level), attribute levels (no stat point budget: the GM types the levels), class and skills, equipment and inventory picked from the item catalogue, money.
  - **Skills**: pick a class, then "Learn from the class" spends the skill points an NPC of that level would have (starting + per level) along the tree, as a player would; the GM then adds, removes or re-ranks any catalogue skill freely, in or out of the tree.
  - Enemy fields: `xpReward` (XP granted when defeated), `loot` (inventory items marked as dropped on defeat).
  - Merchant fields: see Merchants.
  - **JSON** tab, like the item editor.
  - **Generate**: a random NPC from the L10 generators: name from the word lists, a level, a class from the world's classes (random or chosen), attribute levels spread from that level, skills learned along that class's tree, random equipment from the catalogue at a matching rarity.
- **Tools entry**: the NPC catalogue and editor on the sandbox world (memory only), like the item catalogue tool.

## Showing NPCs on the table

- The GM can **show** any NPC to every player, and **hide** it again. Shown NPCs appear on the table like the illustration, several at once **(assumed: up to 4)**.
- What players see depends on the NPC's roles and is **set in the world's rules** (World rules page, **NPCs** section; user, 2026-11-08). For each role, the GM ticks what players see; an NPC with several roles shows the union:

| Field | Story (default) | Merchant (default) | Enemy (default) |
| --- | --- | --- | --- |
| Portrait and name | always | always | always |
| Description | on | on | off |
| Level | on | on | on |
| Life bar (no numbers) | off | off | on |
| Life numbers (current / max) | off | off | off |
| Every attribute (current / max) | off | off | off |
| Equipped items | off | off | off |

- A merchant also shows a "Shop" button while the GM has the shop open for that player.
- The same rule applies to an NPC combatant in an encounter.
- Inventory, skills, money, XP reward and loot are never sent to players.
- One topic carries the shown NPCs as a public projection built by the host from these rules; the full NPC never leaves the host.

## Merchants

- A merchant NPC has a **stock**: the unequipped items of its inventory. Its `buyRatio` and `sellRatio` override the world's defaults (see Selling).
- The GM **opens the shop** for one or all players. A player sees the stock with prices and their money; **Buy** moves the item to the player's inventory and takes the money (refused if they can't afford it); **Sell to merchant** takes an item from the player and pays `price × sellRatio`.
- Stock is finite (a bought item leaves the merchant) and the merchant's money is unlimited **(assumed)**. The GM can refill the stock from the item catalogue in the editor.
- Host-validated routes: `merchant/open`, `merchant/close` (GM), `merchant/buy`, `merchant/sell` (player, only while the shop is open for them).

## Selling (world rule)

World rules, **Economy** section:

| Setting | Default | Meaning |
| --- | --- | --- |
| `sellAnywhere` | on | The sheet's "Sell" action works anywhere, as today. Off: only to a merchant. |
| `sellAnywhereRatio` | 1 | What "Sell anywhere" pays, × the item price (1 = full price, as today). |
| `merchantBuyRatio` | 1 | Default price multiplier when buying from a merchant. |
| `merchantSellRatio` | 0.5 | Default share of the price a merchant pays. |

Ratios are numbers from 0 to 10, prices rounded to whole copper. The offline `sell` toggle only concerns "Sell anywhere".

## Skill catalogue

- `World.skills: Skill[]`, edited on `/room/skills` (GM only): grid, search, type filter (active / passive), edit, duplicate, delete. A skill used by a class tree or a sheet can't be deleted until it's removed from them (the dialog lists where it's used) **(assumed)**.
- A **skill**:
  - `name`, `description`, `imageId?`, `rarity` (display only, reuses the rarity scale);
  - `type`: `active` or `passive`;
  - `maxRank` (1 to 10), `pointCost` (skill points per rank, default 1);
  - active only: `target` (`self`, `one-ally`, `one-enemy`, `all-allies`, `all-enemies`, `area`), `cost?` (an attribute and an amount, taken from the caster's current value: 10 Mana), `cooldown` (turns, 0 = none), `actionType?` (which of the world's action types it uses in combat, the first one by default), `range?` (cells, shown on the grid when there is one);
  - `effects`: a list, each one:
    - `damage` / `heal`: an attribute of the target (life by default) and an **amount formula**;
    - `modify`: an attribute and an amount formula, with a `duration` in turns (a buff or a debuff; 0 on a passive skill = permanent);
    - `note`: free text for what the app doesn't model ("the target is stunned", "push 2 cells");
    - optional dice on any amount: `count d faces`, shown next to the computed part ("12 + 2d6") and rolled by the app when the skill is used.
- **Amount formulas** use U07's safe parser, with the variables `rank` (skill rank), `level` (caster level), and the caster's attribute **max** values by name. Validated live with a preview at rank 1 and at max rank, like attribute formulas.
- **Passive skills** add their permanent `modify` effects to the sheet's maxima like equipped items (the stats tooltip shows them as their own line).
- **Tools entry**: skill catalogue on the sandbox world.

## Classes and skill trees

- `World.classes: CharacterClass[]`, edited on `/room/classes` (GM only).
- A **class**: `name`, `description`, `imageId?`, optional `bonuses` (attribute modifiers, like an item's, always on), optional `startingItems` (catalogue items given at creation), and a `tree`.
- A **tree node**: `skillId`, `requires: { skillId, rank }[]` (nodes of the same tree), `minLevel` (character level needed), and a grid position (`column`, `row`) for the drawing.
- **Tree editor**: a grid; the GM adds catalogue skills as nodes, drags them to a cell, links a node to its prerequisites and sets their required rank and the node's min level. Validation: no cycles, prerequisites must be in the same tree, a skill appears once per tree, at least one node with no prerequisite.
- **Tree view** (sheet, NPC editor): nodes as skill icons, links drawn as lines, each node shows its rank / max rank and is **locked** (prerequisites or level missing), **available** (can be learned now) or **learned**. Tap a node for the skill's details and the Learn / Rank up button.
- A world can have **no classes**: then creation skips the class step and skills come only from the GM.

## What players receive

- Players never receive the skill or class catalogues (decision 2).
- Each player receives, for **their own character only**: their class (name, description, bonuses, its tree) and the skills it references, plus every skill on their sheet (tree or taught). The host builds that view per player and sends it to that player alone (a request route `class/mine`, re-requested when the character or the catalogues change) **(assumed mechanism; settle at the seams)**.
- Other players' characters show their class name only.
- **At creation**, a player needs to choose: they receive the list of classes with name, description, image and bonuses, **without the trees** **(assumed)**. Their tree arrives once the class is chosen.
- The GM sees everything.

## Skill points

- World rules (wizard Rules step and World rules page, **Progression**): `startingSkillPoints` (default 1), `skillPointsPerLevel` (default 1). Both integers of at least 0.
- A level-up grants `skillPointsPerLevel` per level gained, next to the stat points it already grants; the level-up toast says both.
- Character actions (host-validated, like stat points):
  - `learn-skill { skillId }` (player): the skill is a node of the character's class tree, its prerequisites and min level are met, its rank is below max, and the character has `pointCost` points. Raises the rank by 1.
  - `refund-skill { skillId }` (GM only): lowers the rank by 1 and gives the points back for tree skills; refused while another learned node requires that rank.
  - `grant-skill-points { amount }` (GM only).
  - `set-skill { skillId, rank }` (GM only): gives any catalogue skill at any rank (0 removes it), free, in or out of the tree (decision 6: the GM adds what they want to characters too).
  - `set-class { classId }` (GM only): changes the class and refunds every tree skill **(assumed)**.
- Offline host mode: `learn-skill` can be queued like spending stat points, behind a new offline feature toggle `learnSkills` **(assumed)**.

## Class choice at creation

- Character creation gains a **Class** step when the world has classes: class cards (image, name, description, bonuses). The choice is required.
- `CreateCharacterRequest` gains `classId`; the host checks it exists, applies the class's starting items and gives `startingSkillPoints`.
- The card shows the class name; the sheet gains a **Skills** tab with the tree view, the skills taught outside the tree, and the unspent skill points (a badge, like stat points).

## Default classes and skills

- "Default classes and skills" fills both catalogues from the world's attributes, like default items: a checkbox in the wizard and an "Add defaults" button on the classes page.
- Starter set **(assumed)**: three classes (Warrior, Mage, Rogue in EN; Guerrier, Mage, Voleur in FR), each with a tree of 4 to 6 skills, built on the life and mana bar attributes and on the world's first attributes by order. A world without a mana bar gets skills with no cost.

## Combat

A **table aid**, not a game engine (decision 4). It keeps track of who plays when, shows each combatant's numbers, computes what a skill does and offers to apply it. The people at the table decide; the GM can change anything at any time.

### World combat rules

World rules, **Combat** section (also in the wizard's Rules step, collapsed by default):

| Setting | Options | Default **(assumed)** |
| --- | --- | --- |
| Life attribute | an attribute | the life bar attribute; required to start a combat |
| Initiative | **Rolled** by the app (dice + a formula), **Typed** (each player types their roll, the GM types the NPCs' or lets the app roll them), **Free order** (the GM orders by drag) | Rolled, `1d20` + `0` |
| Action types per turn | a list of `{ name, count }` | Action × 1, Movement × 1 |
| Grid | off, or on: square cells, columns × rows, optional map image | off |
| Movement | cells per turn: a number or a formula (shown, not enforced) | 6 |
| Basic attack | a damage formula + the equipped weapons' modifiers, shown as a ready-made action; or none | none |
| Defence | an optional reduction formula, offered when applying damage | none |

All formulas use the safe parser with the combatant's attribute max values by name and `level`. The app has no hit / miss rule: the dice are rolled and the **GM decides** whether the result lands (user, 2026-11-08).

### Encounter flow

1. The GM **starts an encounter** from the table: picks the characters present and adds NPCs from the catalogue (enemies or allies, with a count: "Goblin × 3" makes Goblin 1, 2, 3, each a copy with full current values).
2. **Initiative**, by the world rule: the app rolls (shown in the log, as a shared 3D roll if dice sharing is on), or players type their result, or the GM orders by hand. The GM can always reorder.
3. **On each turn**, the active combatant's row shows:
   - **action counters** from the world's action types (Action 1/1, Movement 1/1), ticked by hand or by using a skill; they are a reminder, not a lock;
   - their **active skills** with what each does at their rank ("12 + 2d6 damage, 10 Mana, cooldown 2"), greyed out when on cooldown or when the cost isn't affordable (still usable by the GM);
   - **consumables** from their inventory;
   - the basic attack if the world has one.
4. **Using a skill** (user, 2026-11-08): the player picks the skill and its targets (tap combatants, or cells on the grid within range). The host **rolls its dice at once** (a shared 3D roll if dice sharing is on) and posts the result for everyone: "Aria — Fireball on Goblin 2: 12 + 2d6 (4, 5) = 21 fire damage". The cost is taken and the cooldown starts on use **(assumed)**.
   The result is then **pending** for the GM, who can:
   - **Apply**: the damage or heal hits the targets' life (with the defence formula if the world has one, shown as a suggestion), buffs are added with their duration;
   - **Edit then apply**: change the amount or the targets first (a partial hit, a resistance);
   - **Dismiss**: a miss; nothing changes on the targets, the log keeps the roll.
   Several pending results can wait; the GM's panel lists them in order. The GM's own skill uses for NPCs go through the same roll, and the GM can apply them in one tap.
5. **Free changes**: the GM can apply damage, heal or a status to a combatant by hand (a hit from their own rules, a trap), edit any value, add or remove a combatant, skip a turn, and undo the last change **(assumed: one step)**.
6. A combatant at 0 life is marked **down** (greyed out, skipped by "Next turn" unless the GM says otherwise). Nothing dies automatically.
7. **End turn**: the active player or the GM. Durations and cooldowns tick at the start of the combatant's turn; the round number goes up when the order wraps.
8. The GM **ends** the encounter. The end dialog proposes the rewards: the sum of defeated enemies' `xpReward`, split evenly among the characters who took part **(assumed)**, the money of defeated enemies, and their loot items to hand out. The GM edits and confirms; XP goes through `grant-xp`, so level-ups happen as today.

### Grid (when on)

- The table shows the grid (with the map image if any); each combatant has a token (its portrait in a circle, enemies with a red ring).
- Players drag their own token; the GM drags any token and places NPCs. The movement allowance is shown as highlighted cells from the start of the turn, not enforced.
- A skill's `range` highlights the reachable cells and combatants when targeting.
- No fog of war, walls or line of sight **(assumed: out of scope)**.

### Sync and storage

- The encounter is host state, saved with the world (`World.encounter?`), so a host reload resumes it.
- Characters' current values change on the real character records (a hit in combat is a hit on the sheet). NPC copies live only in the encounter; the catalogue entry never changes.
- Topic `combat/state`: the encounter as players see it: order, round, active combatant, tokens, each combatant's name, portrait, life bar and statuses, pending results, the log. NPC combatants follow the world's NPC visibility rules.
- Routes, host-validated: `combat/start`, `combat/add`, `combat/remove`, `combat/reorder`, `combat/edit`, `combat/apply`, `combat/dismiss`, `combat/undo`, `combat/end` (GM); `combat/initiative` (a player types their own roll), `combat/use-skill` (rolls and creates a pending result), `combat/use-item`, `combat/move` (a player's own token), `combat/tick-action`, `combat/end-turn` (the active combatant's player, or the GM).
- Combat needs the host: there is no offline combat.

### UI

- **GM**: a combat panel on the table: the turn order as a list of combatant rows (portrait, name, life bar, status icons with remaining turns, initiative), the active one highlighted and expanded with its counters, skills and items; the **pending results** with Apply / Edit / Dismiss; the log; Start / Next turn / Undo / End. The grid, when on, takes the centre where the illustration is.
- **Player**: a turn order strip at the top, the grid or the list, "Your turn" banner, and their own character's skills, items and counters in a bottom bar on mobile. A player can open their skills outside their turn (reactions, reading).
- **Tools entry**: a combat sandbox on the sandbox world (the sample character against catalogue enemies, GM and player views on one screen).

## i18n

Every new string in EN and FR. "NPC" is "PNJ" in French; "skill" is "compétence"; "skill tree" is "arbre de compétences"; "skill points" is "points de compétence"; "encounter" is "combat"; "world rules" is "règles du monde".

## Open questions

None blocking. The **(assumed)** rules are to confirm when each ticket's seams are agreed.
