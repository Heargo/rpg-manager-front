# Phrase engine: variants, params, agreement

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decision 9, Assumed: missing params, depth 5).

A pure helper in `core/generators/` (with `RandomSource`, like the other generators):

- `[a|b|c]` draws one variant; variants may be nested and may contain params.
- `{name}` draws an entry of the param `name` from a given params pool, and expands it recursively (depth 5 at most, then the phrase fails).
- `{g:masc|fem}` picks by the given gender (default `m`).
- `{base}`, `{adjective}`, `{suffix}` are replaced by given values (only where the caller provides them).
- A phrase whose param is missing from the pool fails, so the caller can draw another one. Same seed, same pool → same text.
- Spaces are collapsed and the result is trimmed (capitalising stays with the caller).
- A syntax check for the pack validation: unbalanced brackets, empty variant, unknown `{x:…}` prefix, and the list of params a phrase uses (so the pack can warn about params it doesn't define).
