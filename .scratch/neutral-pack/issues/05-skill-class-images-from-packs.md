# Skill and class images from pack sprites

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Asset types a pack can carry)

Split from 02 (2026-11-18). Same colour rule as items and NPCs.

- The skill and class editors get an image picker (their models already have `imageId`) and a "Random image" button; their generators give an image when a matching sprite exists.
- Sprites with domain `skills` or `classes` are matched by the skill's or class's kind, like NPC portraits in 02.
- The pack creator's Sprites tab offers the `skills` and `classes` domains.
- Catalogue cards show the image when there is one.
