# Class generator on kinds

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Decisions 1–5, "Classes").

- Manifest: `domains.classes.kinds` with a `CLASS_KIND_SCHEMA` (`skills?`: list of kebab-case skill kind ids).
- `generators/classes.json` version 2 (same sections as skills), validated with readable errors; `isClassWordList` and `pack-word-lists.ts` go away.
- `ClassVocabulary` pooled from the world's active packs.
- `generateClass` draws a kind; the tree prefers the world skills whose kind chain (through the skill vocabulary) contains one of the class kind's `skills`, topped up with others when fewer than 3. `CharacterClass.kind?` kept on save, export and room.
- The Pack select goes away from the class editor; `PackChoiceBusiness` and `pack-choice.ts` go away if nothing uses them any more.
- Base FR and EN: the class kinds of the spec, `classes.json` v2.
- Same seed, same active packs and same world skills → same class.
