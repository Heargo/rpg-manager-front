# Random button next to Save, Copy AI prompt in JSON tabs

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md`

- Every "Generate" button becomes "Random" (FR « Aléatoire »), icon `pi-sparkles`, placed next to the editor's Save button (items, NPCs, and any other editor that has one).
- The JSON tab of every editor (item, NPC, skill, class) gets **Copy AI prompt**: copies to the clipboard a prompt (in the active language) describing the expected JSON shape, the world's attribute names and the allowed values, asking a chat AI to answer with JSON only. A toast confirms.
- The prompt builder is a pure helper per entity.
