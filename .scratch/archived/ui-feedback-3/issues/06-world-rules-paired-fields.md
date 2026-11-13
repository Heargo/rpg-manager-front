# World rules: paired fields on one line

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Bugs and layout)

- "Max level" and "Stat points per level" on one line (two columns); the two skill-points fields on one line too. They stack below ~640px. Same in the wizard step if it shares the form.

## Answer

Layout only (no seam). In the shared `rule-fields` component (World rules page, Tools sandbox and wizard), Max level + Stat points per level, and Starting skill points + Skill points per level, are each wrapped in a `.field-pair` two-column grid that stacks to one column under 640px. Checked in the browser on the Tools world rules page (Règles tab): each pair sits on one line. Suite unchanged: 173 files, 1419 tests.
