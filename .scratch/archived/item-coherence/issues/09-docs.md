# User docs: kinds, tints, phrases, naming conventions

Status: resolved
Type: task
Blocked by: 01, 03, 06, 07, 08

Spec: `../spec.md` (Decision 11).

Update `user-docs` `packs.md` and `create-pack.md` (FR and EN), and `worlds.md` for the world language:

- what a domain, a kind, a tint and a param are (`domains.items` now, NPCs, skills and classes later), the kind tree and inheritance (the rapier example), neutral packs, text only from the world's language;
- the phrase syntax (`[a|b]`, `{param}`, `{g:m|f}`, `{base}`…);
- naming conventions and the standard kinds, tints and params published by Base;
- the manifest and word list v2 reference.

Check with `npm run docs:build`.

## Answer

- `packs.md`, `create-pack.md` and `worlds.md` (FR and EN) updated:
  - a new "Comment les objets sont composés" / "How items are put together" block (domains, kinds and inheritance with the rapier/sabre example, tints, params, neutral packs, world language, how an item is drawn, phrase syntax table, naming conventions, what Base publishes);
  - the structured creator form;
  - sprites with kinds and colouring;
  - the format 2 reference;
  - the "Langue du monde" setting.
- Outdated v1 statements removed. The sprite "kind" is called "coloration/colouring" in the docs.
- Checked: `npm run docs:build` builds 31 pages, and the new anchors resolve. Done by a docs agent, then reviewed by the orchestrator (one French wording fix). No TDD steps, since it's docs only.
- Left: the screenshots of the creator and rules pages still show the old UI. Untinted adjectives and suffixes can only be edited in Advanced (JSON).
