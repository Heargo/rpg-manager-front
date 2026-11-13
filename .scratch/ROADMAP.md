# Development order

Status: validated (2026-11-06)

Tickets across specs: `p2p-rooms/` (P), `legacy-parity/` (L), `ui-feedback/` (U) and `npcs-skills-combat/` (N). The order follows the `Blocked by:` lines, and within that:

1. Remove the backend first, so the app runs on its own from now on.
2. Do the **riskiest** thing early: the manual WebRTC handshake (P02) proves or kills the whole serverless idea, so it comes before any game feature.
3. Get to **milestones you can try** on two devices as soon as possible.
4. Keep pure helpers (generators, rules, codecs) ahead of the UI that uses them.

## Phase 1: foundations (no network yet)

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 1 | **P01** Local profile replaces accounts | Removes `localhost:3000`, Supabase and the auth pages; every later ticket uses `playerId`. | none |
| 2 | **L10** Random generators and word lists | Pure helpers (`RandomSource`, unbiased `randomInt`, name/item generators, EN/FR word lists); dice and item editor need them. | none |
| 3 | **L03** World model and local storage | Models and IndexedDB layer (worlds, images, JSON export/import); host persistence and every game feature build on it. | none |

## Phase 2: connectivity

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 4 | **P02** Signal codec and WebRTC transport | Highest technical risk: real code lengths, LAN vs STUN, two tabs exchanging a message. | none |
| 5 | **P03** PeerApi, room service and room business | The `HttpClient`-like layer every feature service uses. | P02 |
| 6 | **P04** Invite, join and lobby pages | **Milestone A: two devices in one room** via link + answer code (and displayed QR). | P03 |
| 7 | **P05** Host persistence and re-invite | Early on purpose: without it, every dev reload of the host kills the room; re-invite makes testing the next phases bearable. | P03 (+ L03 storage) |

## Phase 3: playable session

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 8 | **L04** New game wizard and "my rooms" | A host needs a world to host (attributes, defaults, offline toggles, default items checkbox). | L03, P04 |
| 9 | **L05** Character creation on first join | First real feature service + host handler (`characterService.createCharacter()`). | L03, P03 |
| 10 | **L02** 3D dice roller | Needed on the table; self-contained (lazy three + rapier). Needs the shared-dice default decided (open question). | L10 |
| 11 | **L06** Game table (GM and player views) | Illustration, quick images, notes, players list, dice. | L05, L02 |
| 12 | **L11** Tools menu: every tool usable without a game | Lets anyone try the features without a world or a room (Tools submenu, item generator page, sandbox world). Before L07–L09 so they are built on a world input and get a Tools entry. | none |
| 13 | **L07** Character sheet and item actions | Stats, equipment, inventory, use/sell/equip rules. **Milestone B: a playable session.** | L06 |

## Phase 3b: joining from a phone

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 14 | **P12** Joining from a phone: survive leaving the page | Phone-friendly manual flow (done; now the fallback for P14). | none |
| 15 | **P14** Join with the host's link only (signalling mailbox) | Decided 2026-11-07: a Netlify Function + Blobs mailbox carries the answer, so nobody pastes and there's no 30 s limit; retries until connected. Manual code stays as fallback. | none |
| 16 | **P13** Direct first, relay on retry | Attempt 1 without TURN; the mailbox retry switches to the relay silently (relay invite in manual mode). | P14 |

## Phase 4: items

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 17 | **L08** Item catalogue (GM) | Search/filter, give to player, default items import. | L03 |
| 18 | **L09** Item editor (form, JSON, generate) | Uses L10 generators. **Milestone C: legacy parity for gameplay.** | L08, L10 |

## Phase 5: resilience

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 19 | **P09** Player copy and "Pick a save" | Needs real player data (L05–L07) to be meaningful. | P03, P05 |
| 20 | **P10** Host offline mode | Builds on P09's conflict flow and the offline toggles from L04. | P09 |
| 21 | **P06** Offline and failure states | Banners, timeouts, bad/expired codes, once all flows exist. | P04 |

## Phase 6: polish

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 22 | **P08** QR scanning | Convenience: pasting already works. | P04 |
| 23 | **P11** Room size warning | Only matters once real rooms are played. | P04 |
| 24 | **L01** Landing, tools, credits, contact, privacy | Replaces the Angular starter home page; independent, can be pulled earlier any time. | none |

## Phase 7: UI feedback round 1 (2026-11-07)

Tickets in `ui-feedback/` (U). Bugs first, then cheap visual wins, then the model changes the card depends on.

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 25 | **U01** 3D dice roller crash | Broken feature. | none |
| 26 | **U02** Wizard attributes overlap | Layout bug. | none |
| 27 | **U03** Space above the table | Layout bug. | none |
| 28 | **U04** Landing hero and favicon | Brand, small. | none |
| 29 | **U05** Fantasy coins | Legacy money, touches prices and selling before the model change. | none |
| 30 | **U06** Equipment slot silhouettes | Self-contained visuals. | none |
| 31 | **U07** Attribute levels, max, current, formulas | Model change; the card and XP build on it. | none |
| 32 | **U08** Experience and level | Needs the formula parser from U07. | U07 |
| 33 | **U09** Character card and details | Shows level and the new attributes. | U07, U08 |
| 33b | **U10** Landing content section | User feedback after U04 (done). | U04 |
| 33c | **U11** Full-width footer, static pages | User feedback after U10 (done). | U10 |
| 33d | **U12** Landing polish (done) | User feedback. | U11 |
| 33e | **U13** Original logo (done) | The old mark was Font Awesome Pro. | none |
| 33f | **U14** Formula validation gaps | Found by probing custom formulas. | U07, U08 |
| 33g | **U15** Attributes step cleanup | User feedback: clunky. | U14 |

## Phase 8: NPCs, skills, classes and combat (2026-11-08)

Tickets in `npcs-skills-combat/` (N). Status: validated (2026-11-08), every ticket ready-for-agent; the user's answers are in the spec (Decisions). Model and the World rules page first (later tickets add their settings to it), then the catalogues, then what players use; combat last because it builds on everything, and the grid after the list mode works.

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 34 | **N01** Shared sheet model | Characters and NPCs share every rule; refactor before adding fields. | none |
| 35 | **N15** World rules page | Every later setting (skill points, selling, combat) lands here, not only in the wizard. | N01 |
| 36 | **N02** NPC model, storage and export | Data first. | N01 |
| 37 | **N03** NPC catalogue page | Like the item catalogue. | N02 |
| 38 | **N04** NPC editor (form, JSON, generate) | Makes NPCs usable. | N03 |
| 38b | **N17** NPC person names (done) | User feedback after N04: generated names read like items. | N04 |
| 39 | **N10** Show NPCs on the table | Small win; per-role visibility set in the world rules. | N03, N15 |
| 40 | **N05** Skill model and skill catalogue (done) | Classes and combat need skills. | N01 |
| 41 | **N06** Classes and skill tree editor (done) | Trees need skills. | N05 |
| 42 | **N07** Skill points and learning skills (players) (done) | Players use the trees. | N06, N15 |
| 41b | **N19** Tree editor drag & drop, class details (done) | User request (2026-11-08): modern tree editor, class details view. | N06 |
| 42b | **N18** NPC class and skills (done) | Split from N07 (2026-11-08): NPC class-based generation. | N07 |
| 43 | **N08** Class choice at character creation (done) | Needs classes and skill points. | N07 |
| 44 | **N09** Default classes and skills (done) | A world is playable without designing a tree first. | N06 |
| 45 | **N11** Selling rules and merchants | Needs the NPC editor's stock and shown NPCs. | N04, N10, N15 |
| 46 | **N12** Combat rules (pure) and world combat settings | Pure rules first. | N05, N15 |
| 47 | **N13** Combat protocol and host persistence | | N12, N02, N10 |
| 48 | **N14** Combat UI and sandbox tool (list mode) | | N13, N07 |
| 48b | **N20** Combat protocol follow-ups | N13 review notes: player view leaks, typed initiative in rolled mode, error keys. | N13 |
| 49 | **N16** Combat grid | Optional per world; after list mode works. | N14 |

## How each ticket is developed

Follow [workflow.md](../workflow.md): baseline, agreed seams, red / green / review in subagents, browser check for UI tickets (both languages, mobile), then one commit per ticket on `develop` that resolves and archives it. Stop and ask when a ticket hits a decision the spec doesn't cover. Nothing is pushed unless you ask.

## Before starting

- Every ticket triaged to `ready-for-agent` on validation.
- Shared dice rolls: **off** by default, with a toggle next to the Roll button (validated with this order).

## Phase 9: UI feedback round 2 (2026-11-12)

Tickets in `ui-feedback-2/` (F), developed on the `feedback` branch. Bugs and cheap wins first, then navigation and pages, then the model changes, the sprite colorizer last.

| # | Ticket | Blocked by |
| - | --- | --- |
| 50 | **F01** Mobile nav menu and dice inputs bugs | none |
| 51 | **F02** Landing: single full-height section | none |
| 52 | **F03** Credits: use of AI | none |
| 53 | **F04** Nav bar two states, close the world | none |
| 54 | **F05** Room page cleanup, offline features to World rules | none |
| 55 | **F06** World rules clickable tabs | F05 |
| 56 | **F07** Character details icon tabs | none |
| 57 | **F08** Catalogues rework | none |
| 58 | **F09** NPC portrait, human artists warning | none |
| 59 | **F10** Random button, Copy AI prompt | none |
| 60 | **F11** Skill and class generators | F10 |
| 61 | **F12** Joined worlds offline | none |
| 62 | **F13** Skill dice rolls | none |
| 63 | **F14** Sprite colorizer (P0, P1) | none |
| 64 | **F15** Sprite colorizer advanced (P2) | F14 |
| 65 | **F16** P2P and encryption learning doc | none |

## Phase 10: UI feedback round 3 (2026-11-12)

Tickets in `ui-feedback-3/` (G). Bugs and small visual fixes first, then the shared image picker and the sheet preview, the skill editor last.

| # | Ticket | Blocked by |
| - | --- | --- |
| 66 | **G01** Landing: footer below the fold | none |
| 67 | **G02** Wording: credits AI note, "niveau de compétence" | none |
| 68 | **G03** Item catalogue: wider price slider | none |
| 69 | **G04** Skill and class lists: one card per entry | none |
| 70 | **G05** Tools menu per state, bordeaux Close button | none |
| 71 | **G06** World rules: paired fields on one line | none |
| 72 | **G07** Empty image picker | none |
| 73 | **G08** Sheet preview: Mage by default, grant skill points | none |
| 73b | **G11** Rank becomes skill level in the code | G02 |
| 74 | **G09** Skill editor: readable form, variables help | G11 |
| 75 | **G10** Formula presets for skills | G09 |
| 76 | **G12** Skill form: modern layout | G09 |

## Phase 11: UI feedback round 4 (2026-11-13)

Tickets in `ui-feedback-4/` (H). Colorizer bugs first, then the bundled sprites and what builds on them, the catalogue and combat changes, the user documentation last (screenshots need the finished features).

| # | Ticket | Blocked by |
| - | --- | --- |
| 77 | **H01** Sprite colorizer: no page scroll while working | none |
| 78 | **H02** Sprite colorizer: brush size on the canvas | none |
| 79 | **H03** Bundled grayscale sprites, demo axe, credits | none |
| 80 | **H04** Saved sprites and masks (sprite sets) | H03 |
| 81 | **H05** Random item images from sprite sets | H04 |
| 82 | **H06** Item catalogue: context menu on the clicked item | none |
| 83 | **H07** Optional combat steps in World rules | none |
| 84 | **H08** User documentation: Starlight site, theme, /docs | none |
| 85 | **H09** Doc screenshots with Playwright | H08 |
| 86 | **H10** Documentation content per module | H08, H09 |

## Phase 12: content packs (2026-11-13)

Tickets in `content-packs/` (K). Status: validated (2026-11-13), every ticket ready-for-agent; answers in the spec (Decisions). Model and Base pack first (no visible change), then sprite kinds and the official lazy path, the pack choice in generators, unofficial packs from a link, the pack creator (reuses their validation), docs last.

| # | Ticket | Blocked by |
| - | --- | --- |
| 87 | **K01** Pack model, validation and the Base pack (done) | none |
| 88 | **K02** Sprite kinds: grayscale, masked, colored (done) | K01 |
| 89 | **K03** Official packs: registry and lazy loading (done) | K01 |
| 90 | **K04** Pack choice next to the seed (done) | K01, K02 |
| 91 | **K05** Unofficial packs from a link or GitHub repository (done) | K03 |
| 92 | **K07** Pack creator (done) | K02, K05 |
| 92b | **K08** Pack creator: the colorizer link (split from K07) (done) | K07 |
| 93 | **K06** Documentation: using and creating packs (done) | K04, K05, K07, K08 |
| 94 | **K09** Duplicate a pack and Packs page redesign (user request) (done) | none |

## Phase 13: combat made easy (2026-11-13)

Tickets in `combat-ux/` (C). Status: proposed (2026-11-13); the user's answers are in the spec (Decisions), the rest is marked "assumed". Small rule fixes first, then the turn actions, the start form and the GM layout, grid moves and placement, the shared rolls last (they sit on the new layout).

| # | Ticket | Blocked by |
| - | --- | --- |
| 95 | **C01** Initiative input only when it can be typed (done) | none |
| 96 | **C02** Player actions only on their own turn (done) | none |
| 97 | **C03** Action tabs replace the counters (done) | C02 |
| 98 | **C04** Target picking as a multi-select (done) | none |
| 99 | **C05** Start form: characters and NPCs multi-selects | none |
| 100 | **C06** GM table: collapsible Dice, Combat, Notes | C05 |
| 101 | **C07** Grid moves: GM anywhere, players on their turn | C02 |
| 102 | **C08** Place tokens before starting | C05, C07 |
| 103 | **C09** Shared combat rolls and recap banner | C06 |

## Phase 14: one language per pack (2026-11-13)

Tickets in `pack-languages/` (PL). Decisions from the user on 2026-11-13 are in the spec. Format first, then the creator and the world's choice side by side, then the generators and the docs.

| # | Ticket | Blocked by |
| - | --- | --- |
| 104 | **PL01** Pack format: one language, Base split in two (done) | none |
| 105 | **PL02** Pack creator and duplicate in one language (folded into PL01) | PL01 |
| 106 | **PL03** Active packs in the world rules (done) | PL01 |
| 107 | **PL04** Generators and sprites use the world's packs (done) | PL03 |
| 108 | **PL05** User docs: one language per pack, packs per world (done) | PL01, PL04 |
