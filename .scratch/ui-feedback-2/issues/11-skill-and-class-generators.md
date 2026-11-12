# Random generators for skills and classes

Status: ready-for-agent
Type: task
Blocked by: 10

Spec: `../spec.md`

- Pure generators in `core/generators/`: `generateSkill(random, attributes, lang words)` (name, description, type, rarity, cost, cooldown, target, effects on the world's attributes) and `generateClass(random, attributes, skills)` (name, description, bonuses, a small valid tree from given skills).
- EN/FR word lists in `public/i18n/generators/<lang>/`.
- The skill and class editors get the Random button next to Save.
