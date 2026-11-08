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
| 18b | **L12** On-device AI item generation | Split from L09 (2026-11-07): Chrome Prompt API tier, feature-detected. | L09 |

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
| 42b | **N18** NPC class and skills | Split from N07 (2026-11-08): NPC class-based generation. | N07 |
| 43 | **N08** Class choice at character creation | Needs classes and skill points. | N07 |
| 44 | **N09** Default classes and skills | A world is playable without designing a tree first. | N06 |
| 45 | **N11** Selling rules and merchants | Needs the NPC editor's stock and shown NPCs. | N04, N10, N15 |
| 46 | **N12** Combat rules (pure) and world combat settings | Pure rules first. | N05, N15 |
| 47 | **N13** Combat protocol and host persistence | | N12, N02, N10 |
| 48 | **N14** Combat UI and sandbox tool (list mode) | | N13, N07 |
| 49 | **N16** Combat grid | Optional per world; after list mode works. | N14 |

## How each ticket is developed

Follow [workflow.md](../workflow.md): baseline, agreed seams, red / green / review in subagents, browser check for UI tickets (both languages, mobile), then one commit per ticket on `develop` that resolves and archives it. Stop and ask when a ticket hits a decision the spec doesn't cover. Nothing is pushed unless you ask.

## Before starting

- Every ticket triaged to `ready-for-agent` on validation.
- Shared dice rolls: **off** by default, with a toggle next to the Roll button (validated with this order).
