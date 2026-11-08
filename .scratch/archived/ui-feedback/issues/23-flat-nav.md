# Tools directly in the nav bar

Status: resolved
Type: task

User request (2026-11-08): "in the nav bar, put the tools directly, remove them from the tool section, it's not useful".

## Answer

- **Nav bar:** `MenuService` lists Play, then the six tools (dice, item generator, character sheet, item catalogue, item editor, external tools) as top-level items; the "Tools" submenu is gone.
- **Spec:** rewritten first to expect the flat list with no submenu; it failed, then passed.
- **Checked:** the browser at 1440 px shows the seven entries in the bar; on phones they sit in the hamburger menu. Suite green.
