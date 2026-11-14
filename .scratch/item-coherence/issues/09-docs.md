# User docs: kinds, tints, phrases, naming conventions

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 06, 07, 08

Spec: `../spec.md` (Decision 11).

Update `user-docs` `packs.md` and `create-pack.md` (FR and EN), and `worlds.md` for the world language:

- what a domain, a kind, a tint and a param are (`domains.items` now, NPCs, skills and classes later), the kind tree and inheritance (the rapier example), neutral packs, text only from the world's language;
- the phrase syntax (`[a|b]`, `{param}`, `{g:m|f}`, `{base}`…);
- naming conventions and the standard kinds, tints and params published by Base;
- the manifest and word list v2 reference.

Check with `npm run docs:build`.
