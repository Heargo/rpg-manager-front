# Documentation content per module

Status: resolved
Type: task
Blocked by: 08, 09

Spec: `../spec.md` (User documentation)

- Write each module's pages in FR and EN for players and GMs (what it is, how to do the common tasks, tips), with the screenshots from 09. Use the words of `GLOSSARY.md` and the app's labels.
- Every page has at least one screenshot; no screenshot is unused.

## Answer

The twelve module pages are written in French and English (24 pages): getting started, worlds and rules, items, NPCs and merchants, classes and skills, host and join, the table, characters, combat, dice, tools, credits and privacy. Each explains what the module is and how to do the common tasks, for players and GMs, with tips and cautions where they help, links between pages, and the app's own labels (taken from `public/i18n/*.json`; there is no `GLOSSARY.md` in the repo).

Every page has at least one screenshot; all 36 screenshots per language are used exactly where they fit (checked by script), every image loads, and every internal `/docs` link resolves in the build. A few claims were checked against the app's labels and corrected while writing (progression names, what the GM can grant from the table).

Not covered by a screenshot (no script captures them yet): the merchant shop, the quick images and NPCs shown on the table, the combat grid, the offline joined-world sheet. The text describes them.
