# Skill generator on kinds

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (Decisions 1–5, "Skills").

- Manifest: `domains.skills.kinds` with a `SKILL_KIND_SCHEMA` (`type` active|passive only and required on a root; `effect` damage|heal|modify only on an active chain).
- `generators/skills.json` version 2 (top-level `templates`, `adjectives`, `suffixes`; per kind `nouns`, `descriptions`, `adjectives`, `suffixes`, `names`), validated with readable errors; `isSkillWordList` goes away.
- `SkillVocabulary` pooled from the world's active packs, on the shared helper from 01.
- `generateSkill` draws a kind; type and (when set) effect come from it; name and description through `expandPhrase`. `Skill.kind?` kept on save, export and room.
- The Pack select goes away from the skill editor (and any Tools page that has one).
- Base FR and EN: the skill kinds of the spec, `skills.json` v2 with today's words sorted into kinds.
- Same seed and same active packs → same skill.
