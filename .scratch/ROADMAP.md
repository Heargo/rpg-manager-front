# Development order

Status: validated (2026-11-06)

Tickets across two specs: `p2p-rooms/` (P) and `legacy-parity/` (L). The order follows the `Blocked by:` lines, and within that:

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
| 14 | **P12** Joining from a phone: survive leaving the page | Manual codes stay (decided 2026-11-07): players switch to their chat app to send the answer code, and a frozen background tab loses the connection. Without this, phone players can't join reliably. | none |
| 15 | **P13** Direct first, relay invite on failure | Invites without TURN by default (shorter codes, no relay allocation); a relay invite when the direct one fails. | P12 |

## Phase 4: items

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 16 | **L08** Item catalogue (GM) | Search/filter, give to player, default items import. | L03 |
| 17 | **L09** Item editor (form, JSON, generate) | Uses L10 generators; Chrome on-device AI tier last within the ticket. **Milestone C: legacy parity for gameplay.** | L08, L10 |

## Phase 5: resilience

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 18 | **P09** Player copy and "Pick a save" | Needs real player data (L05–L07) to be meaningful. | P03, P05 |
| 19 | **P10** Host offline mode | Builds on P09's conflict flow and the offline toggles from L04. | P09 |
| 20 | **P06** Offline and failure states | Banners, timeouts, bad/expired codes, once all flows exist. | P04 |

## Phase 6: polish

| # | Ticket | Why now | Blocked by |
| - | --- | --- | --- |
| 21 | **P08** QR scanning | Convenience: pasting already works. | P04 |
| 22 | **P11** Room size warning | Only matters once real rooms are played. | P04 |
| 23 | **L01** Landing, tools, credits, contact, privacy | Replaces the Angular starter home page; independent, can be pulled earlier any time. | none |

## How each ticket is developed

Follow [workflow.md](../workflow.md): baseline, agreed seams, red / green / review in subagents, browser check for UI tickets (both languages, mobile), then one commit per ticket on `develop` that resolves and archives it. Stop and ask when a ticket hits a decision the spec doesn't cover. Nothing is pushed unless you ask.

## Before starting

- Every ticket triaged to `ready-for-agent` on validation.
- Shared dice rolls: **off** by default, with a toggle next to the Roll button (validated with this order).
