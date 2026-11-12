# Formula presets for skills

Status: ready-for-agent
Type: task
Blocked by: 09

Spec: `../spec.md` (Skill editor and formula presets)

- Success formula and effect amount fields get a preset select that fills the field.
- Built-in presets (a few for success, a few for effects), read-only, can be duplicated.
- User presets: create, edit, delete (name, kind `success` | `effect`, formula, description), validated with the formula parser, stored on the device through the app's local storage layer (not per world).
- Presets are generic over attributes: placeholders `{A}`, `{B}`… (caster) and `{target.A}`… (target); applying a preset asks which world attribute each placeholder stands for, then writes the formula with real names. Validation substitutes a dummy attribute. "Save as preset" turns the current formula's attribute names into placeholders.
