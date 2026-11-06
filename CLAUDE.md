# rpg-manager-front

Angular front-end for the RPG manager (Optimus UI, installable PWA). Structure, layering, signals and commands are in [docs/rules.md](docs/rules.md); read it before you change code.

## Branches

Work on `develop` or a `feat/*` branch merged into `develop`. Promote with a PR `develop` → `main`. Never push to `main` directly. `legacy-dev` is the old backend-based `dev` work, kept for reference only: never merge it or build on it. Never commit `.env` files or secrets.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. Move resolved tickets to `.scratch/archived/<feature>/` in the commit that resolves them. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
