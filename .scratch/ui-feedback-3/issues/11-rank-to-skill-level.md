# Rank becomes skill level in the code

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Rank becomes skill level in the code)

- Formula variable `rank` → `skillLevel` (parser variables, skill roll and effect evaluation, combat rules, validation messages).
- Fields: skill `maxRank` → `maxLevel`; learned skills and class `requires` `rank` → `level`; helpers and methods renamed the same way (`rankOf` → `levelOf`, `setSkillRank` → `setSkillLevel`, …); i18n keys too.
- Default skills/classes, generators, AI prompts and JSON shapes use the new names. No backward compatibility.
- No identifier with `rank` left for skills (`grep -rn rank src` only hits unrelated words).
