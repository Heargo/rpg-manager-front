# Spec: encounters that are not a combat (2026-11-14)

The user's request (FR): "il faut pouvoir lancer une rencontre qui n'est pas un combat (avec un pnj d'histoire ou un pnj marchand par exemple). Histoire et marchand affichent la card du PNJ pour tous les joueurs à la place de l'image partagée, et marchand affiche un bouton « Boutique » sous sa card qui permet d'acheter ou de vendre des items."

## Decisions (user, 2026-11-14)

1. A story or merchant encounter has **one NPC**. Its card takes the place of the shared image for everyone.
2. A merchant encounter **opens the shop for every player**; ending it closes the shop. The per-merchant Open/Close button and the "for whom" select go away.
3. The NPC catalogue's **"Show on the table" is replaced**: it starts a story encounter with that NPC (a merchant encounter if the NPC has the merchant role). The strip of shown NPCs under the image goes away (one mechanism).
4. The GM tools' **Combat** panel becomes **Encounter** (FR: Rencontre), with a Combat / Story / Merchant choice at the top of the start form.

## Decisions (orchestrator, assumed)

- One encounter at a time: while a combat runs, story and merchant can't start (and "Show on the table" is disabled with a tooltip); starting a story or merchant encounter while another story or merchant encounter runs replaces it.
- Story: any NPC of the catalogue. Merchant: only NPCs with the merchant role.
- The card shows what the world's rules let players see for that NPC's roles (the existing public projection, unchanged); the full NPC never leaves the host.
- The card replaces the image on the players' table and in the GM's scene panel; the GM's quick images stay usable and come back on screen when the encounter ends (the shown illustration is kept, not cleared).
- While a story or merchant encounter runs, the Encounter panel shows the NPC's name, the kind, and an **End** button.
- Persistence: like the shown NPCs today (no new storage).
