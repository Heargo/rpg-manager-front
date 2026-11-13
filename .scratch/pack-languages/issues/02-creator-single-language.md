# Pack creator and duplicate in one language

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (Decision 1, Assumed: duplicate).

- A draft has a `language` (select on the Details tab, French or English, default the app language). One name, one description, one word list per generator, one label per sprite.
- The Lists tab shows the four generators of the draft's language. "Copy Base" copies from the Base of the draft's language.
- Duplicate keeps the language, and the name suffix follows the pack's language.
- Build, install and zip export write the new manifest. The colorizer link still works.
