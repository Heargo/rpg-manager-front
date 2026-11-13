# Pack choice next to the seed

Status: ready-for-agent
Type: task
Blocked by: 01, 02

Spec: `../spec.md` (Pack choice in generation options)

- A Pack select (Optimus UI) next to the seed in the item editor, item generator page, NPC editor, skill and class generators: selected packs with content for this generator and language, plus Random.
- Random picks the pack from `<seed>:pack`: same seed and same selected packs give the same result (pure helper, seeded test).
- Missing language in the chosen pack falls back to Base. Random item images draw from the chosen pack's sprites.
