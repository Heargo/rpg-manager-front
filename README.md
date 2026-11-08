# RPG Manager

Online support for your role-playing games: a game master runs the table, players join from their phone or computer, and everyone shares the same world, characters, dice and pictures.

There are no accounts and no game server. The game master's device holds the world and talks to the players **directly, peer to peer** (WebRTC). The app works offline once installed (it's a PWA).

- [What you can do](#what-you-can-do)
- [How a game works](#how-a-game-works)
- [Run it locally](#run-it-locally)
- [Deploy](#deploy)
- [Project map](#project-map)
- [Contributing](#contributing)

## What you can do

| As | You can |
| --- | --- |
| Game master | Create a world (attributes, life/mana bars, starting points and money, default items), host it, invite players, show pictures to the whole table, keep private notes, look at every character sheet, grant stat points and set current values (a hit, a rest). |
| Player | Join with an invite link, create your character, see the picture the game master shows, spend stat points, equip, use and sell items. |
| Everyone | Roll 3D dice (fair: values are drawn before the throw), share rolls with the table, generate random items, try the character sheet on a sample character. |

Everything under **Tools** in the menu works without a world or a room. The app is in English and French.

## How a game works

1. **Play → New world**: the game master creates a world. It's saved in their browser only (IndexedDB). It can be exported to a JSON file and imported elsewhere.
2. **Host**: opens a room for that world.
3. **Invite a player**: the app makes a link (and a QR code). The game master sends it through any chat.
4. The player opens the link and waits on the page: the answer reaches the game master by itself and the player is in. If the automatic connection is unavailable, the player gets an **answer code** to send back and the game master pastes it.
5. The player creates a character, then everyone goes **to the table**.

The game master's device is the source of truth: players send requests ("spend a point", "sell this item"), the host checks them against the rules, saves, and sends the new state to everyone.

A player behind a strict network (some mobile or office networks) can't always connect directly. The app then relays the connection through a TURN server ([Open Relay](https://www.metered.ca/tools/openrelay/)), still end-to-end encrypted. Details: [docs/adr/0003-open-relay-turn.md](docs/adr/0003-open-relay-turn.md).

## Run it locally

You need Node.js 22+ and npm.

```bash
npm install
```

```bash
npm start
```

Then open http://localhost:4200. The dev server has no TURN relay (it uses public STUN only), which is fine on one machine or one Wi-Fi.

| Command | Does |
| --- | --- |
| `npm start` | Dev server with live reload |
| `npm test` | Unit tests (Vitest), single run |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run build` | Production build in `dist/panel` (with the service worker) |

To try the installed, offline app, build and serve `dist/panel/browser` with any static server (for example `npx http-server dist/panel/browser`).

To test the TURN relay locally, run `netlify dev` with the variables below in your Netlify site.

## Deploy

The app is a static site plus one Netlify Function.

1. Deploy to Netlify: build command `npm run build`, publish folder `dist/panel/browser`.
2. Create a free [Open Relay](https://www.metered.ca/tools/openrelay/) account (no payment method needed).
3. In Netlify, *Site configuration → Environment variables*, add:

| Variable | Value |
| --- | --- |
| `METERED_APP_NAME` | The `<name>` in `<name>.metered.live` |
| `METERED_API_KEY` | Your Open Relay API key |

Without them the app still works, just without the relay.

The contact form needs a [Web3Forms](https://web3forms.com/) access key, read at build time from `CONTACT_KEY` (a gitignored `.env` locally, see `.env.example`; the host's build environment in production). Without it the contact page shows an "unavailable" note. The key ends up in the shipped bundle by design: Web3Forms access keys are public.

## Project map

| Where | What |
| --- | --- |
| `src/app/modules/` | One folder per feature: `play` (hub), `world`, `room` (invites, lobby), `character`, `table`, `dice`, `item`, `tools`, `profile` |
| `src/app/core/` | Shared pieces: peer-to-peer layer (`p2p/`), random generators, images, language, profile |
| `public/i18n/` | English and French texts, and the word lists for item names |
| `netlify/functions/` | The only server code: hands out TURN credentials |
| `docs/rules.md` | How the code is organised (component → business → service), conventions, test commands |
| `docs/adr/` | Decisions and why: UI library, manual WebRTC signalling, TURN relay |
| `.scratch/` | Specs and tickets; `.scratch/ROADMAP.md` is the development order |

Built with Angular 22 (zoneless, signals), [Optimus UI](docs/adr/0001-replace-primeng-with-optimus-ui.md), Transloco, three.js and Rapier for the dice.

## Contributing

- Read [docs/rules.md](docs/rules.md) before changing code.
- Work on `develop` (or a `feat/*` branch merged into it); `main` only gets PRs from `develop`.
- Tickets are developed one at a time with [workflow.md](workflow.md): tests first, then code, then review.
- Every new text goes into both `public/i18n/en.json` and `fr.json`.
