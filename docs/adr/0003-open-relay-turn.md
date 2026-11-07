# 0003 — Open Relay TURN through a Netlify Function

Status: accepted
Date: 2026-11-07

## Context

ADR 0002 left TURN out of scope, so players behind strict NATs or firewalls (symmetric NAT, corporate or school networks, some mobile networks) can't connect: STUN only finds public addresses, it can't relay. TURN credentials or API keys can't sit in the bundle, or anyone could use the relay's quota. The free plan must stop at its limit rather than bill.

| Option | Free allowance | Why not |
| --- | --- | --- |
| Cloudflare Realtime TURN | 1,000 GB/month, then $0.05/GB | No spending cap |
| Metered paid TURN | 500 MB/month | Smaller than Open Relay |
| ExpressTURN | 1,000 GB/month | Free plan only has fixed credentials; unclear if a card is needed |
| Self-hosted coturn | VPS traffic | A server to run and pay for |
| **Open Relay (Metered)** | 20 GB/month, free account | — |

## Decision

Metered's Open Relay. A Netlify Function (`netlify/functions/ice-servers.mts`) calls `https://<app>.metered.live/api/v1/turn/credentials?apiKey=…` and returns `{ iceServers }`. `WebRtcTransport` asks `fetchIceServers()` (`core/p2p/helpers/ice-servers.ts`) for servers before each new peer connection. If the function can't be reached (`ng serve`, offline, not configured, quota used up), the app falls back to public STUN, as before.

Netlify environment variables (Site configuration → Environment variables, never committed): `METERED_APP_NAME` (the `<name>` in `<name>.metered.live`), `METERED_API_KEY`, from the Open Relay dashboard after signing up. No payment method on the Metered account, so nothing can be billed.

## Consequences

- The app has one tiny backend endpoint. It never sees game data, only hands out credentials.
- The relay is no longer offered on every invite. The first invite is STUN only (no function call, no relay allocation, shorter codes). Only when it fails does the host make a relay invite (a flag in the code; both sides then ask the function for TURN servers and use `iceTransportPolicy: 'relay'`): silently on the retry in mailbox mode, through a "Try through the relay" button in manual mode. If the function is unreachable, the relay is reported unavailable instead of making an invite that can't work. The data channel stays end-to-end encrypted (DTLS); the relay sees who connects and how much, not what.
- 20 GB is thousands of relayed game sessions (chat, dice, state: a few MB each). Past the quota, relayed players fail to connect until next month, as they did before TURN.
- Anyone can call the function and get credentials; Metered's docs don't say whether they expire. Abuse can only use up the free quota. Rate limiting is left out until that happens.
- Open Relay is a free service with no uptime guarantee.
- Invite and answer codes grow by ~7 bytes per relay candidate.
- `ng serve` has no Netlify Functions, so local runs use STUN only; `netlify dev` serves the function locally with the env vars.
