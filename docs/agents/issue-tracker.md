# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Archiving completed tickets

Once a ticket is `Status: resolved` (or `wontfix`), move it with `git mv` to `.scratch/archived/`, keeping its path: `.scratch/<feature-slug>/issues/NN-<slug>.md` → `.scratch/archived/<feature-slug>/issues/NN-<slug>.md`. Do it in the same commit that resolves the ticket.

- When every ticket of a feature is archived, move the rest of the feature (`spec.md`, `map.md`, reports) too and delete the empty directory. While a ticket is still open, its spec and reports stay in the live directory.
- Keep numbering: a new ticket in a feature takes the next number after the highest one, archived ones included.
- Archived tickets are read-only history. To reopen one, move it back first.
- Open work is everything under `.scratch/` outside `archived/`; skip `archived/` when scanning for the frontier or for open tickets.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
