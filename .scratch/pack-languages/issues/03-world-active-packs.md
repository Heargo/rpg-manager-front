# Active packs in the world rules

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (Decisions 3-5, Assumed: missing pack).

- `WorldRules` (and the stored world) get `packs: string[]`, the active pack ids.
- Rules page: a "Packs" section, a multi-select of the installed packs with a language tag. A missing pack is shown as missing, with Install when it is official.
- Wizard, Rules step: the same choice, preset to the Base of the app language.
- The Packs page loses its on/off toggle (install, add, create, duplicate, remove stay).
