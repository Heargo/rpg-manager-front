# User docs: NPC, skill and class kinds

Status: resolved
Type: task
Blocked by: 01, 02, 03, 04

Spec: `../spec.md`.

Update `user-docs` `packs.md` and `create-pack.md` (FR and EN): the three new domains, their kind fields and text sections, the standard kinds published by Base, the v2 reference for `npcs.json`, `skills.json`, `classes.json`, and that the Pack select is gone from every generator. Check with `npm run docs:build`.

## Answer

- `packs.md` and `create-pack.md` (FR and EN): the npcs, skills and classes domains, their kind fields and v2 text sections, the Base standard kinds, a JSON example per domain, every generator pooling the world's active packs (no Pack select), the creator's new sections. FR example fixed by the orchestrator to follow the conventions (genders, `{g:…}`, noun before adjective).
- Checked: `npm run docs:build`, 31 pages, no error.
