# Phrase engine: variants, params, agreement

Status: resolved
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

## Decisions (orchestrator, 2026-11-14)

- New pure module `src/app/core/generators/phrase.ts`, two exports:
  - `expandPhrase(source: RandomSource, phrase: string, context: { params?: Record<string, readonly string[]>; gender?: Gender; values?: Partial<Record<'base' | 'adjective' | 'suffix', string>> }): string | undefined`. `undefined` when the phrase fails (missing param, depth over 5, a `{base}`/`{adjective}`/`{suffix}` with no value given).
  - `checkPhrase(phrase: string): { errors: string[]; params: string[] }`. `params` lists the distinct param names used (not `base` / `adjective` / `suffix`, not `g:`), in order of first use.
- Reserved names: `base`, `adjective`, `suffix` are values, never params. Param names are kebab-case; anything else inside `{}` (other than `g:a|b`) is a syntax error.
- Variant `[a|b]` with an empty option (`[a|]`) is allowed: it means "or nothing" (optional words). A variant whose options are all empty (`[]`, `[|]`) is an error. Nesting `[a|[b|c]]` and `[{maker}|x]` work.
- `{g:m|f}` with exactly two options, otherwise a syntax error.
- Draw order is left to right, so the same seed and pool give the same text. A param entry is drawn uniformly from its list.
- The result collapses whitespace runs to one space, trims, and removes a space before `,` `.` (so an empty optional variant leaves no gap). No capitalising.

## Baseline

Test Files 250 passed, Tests 2257 passed (after `915c29a`).

## Seams

1. **`expandPhrase` (pure, seeded `RandomSource`)**: variants, nesting, params from the pool with recursion and the depth limit, agreement, values, failure cases, determinism, whitespace. Misses nothing outside the helper (no caller yet).
2. **`checkPhrase` (pure)**: syntax errors (unbalanced brackets/braces, empty variant, unknown prefix, bad `g:` arity, bad param name) and the params list.

## Red

- Test files: `src/app/core/generators/phrase.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/generators/phrase.spec.ts`
- Failing: all 36 tests (`expandPhrase` 24, `checkPhrase` 12), one failure for the whole file — `./phrase` does not exist yet (`Could not resolve "./phrase"`). Nothing outside the file was touched.
  - expandPhrase: plain text, variants, nesting, params, param in variant, recursion, depth 5 ok / 6 fails, self-call fails, missing/empty param fails, nested missing param, gender pick and default, base/adjective/suffix values, missing value fails, reserved names not looked up in params, determinism, uniform draw, whitespace, empty optional variant, space before `,` `.`, no capitalising.
  - checkPhrase: valid phrase, params list (distinct, first use, nested), unclosed/unopened bracket and brace, empty-only variant, optional variant allowed, unknown prefix, `g:` arity, bad param name.

## Green

- Files: src/app/core/generators/phrase.ts
- Change: New pure module with `expandPhrase` and `checkPhrase`. A small recursive parser builds nodes (text, variant, param, value, gender) and collects syntax errors. Rendering draws left to right with `pick`. Params expand recursively with a depth limit of 5, and a missing param or value makes the phrase fail. The result collapses whitespace, trims and removes the space before `,` and `.`.
- Suite: 251 files and 2293 tests pass (baseline 250 and 2257, plus 36 new). tsc is clean and the build has no error.
- Open questions: the ticket says 38 red tests, but the spec has 36 (24 expandPhrase and 12 checkPhrase). All 36 pass.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/core/generators/phrase.spec.ts — not Prettier-formatted (`prettier --check` warns; the repo uses Prettier) — run `npx prettier --write` on it.
  - src/app/core/generators/phrase.spec.ts — `expandPhrase` returning `undefined` on a syntax error (documented in phrase.ts) has no test; add e.g. `expandPhrase(fixed, '[a|b', {})` -> undefined, also for a param entry with bad syntax.
  - src/app/core/generators/phrase.spec.ts — checkPhrase error tests only assert `length > 0`; asserting the count (1) would catch a bug that reports a single fault twice or misses a second one.
  - src/app/core/generators/phrase.ts:~160 — `expand` re-parses every param entry on each draw; fine now, cache if packs get large.
  - Ticket Red section says 36 failing tests; real count is 36 (24 + 12). Fix the number in the Red section.
- Checked: 36/36 tests pass; the code matches the ticket decisions (depth 5 ok / 6 fails, reserved value names, `g:` arity, empty optional variant, space before `,` `.`); the module is a pure helper with no Angular injection; no UI, i18n, secrets or invite code changes.

## Answer

- New pure module `src/app/core/generators/phrase.ts`: `expandPhrase(source, phrase, { params, gender, values })` draws variants `[a|b]` (empty option = optional words, nesting allowed), params `{name}` from the pool (recursive, depth 5), agreement `{g:m|f}`, and the values `{base}` / `{adjective}` / `{suffix}`. It returns `undefined` on a syntax error, a missing or empty param, a missing value, or depth over 5. `checkPhrase(phrase)` gives syntax errors and the params used.
- Orchestrator, after review: added a test for a phrase with bad syntax and a param entry with bad syntax, ran Prettier on the spec, and fixed the red count (36).
- Checked: suite 251 files / 2294 tests pass (baseline 250 / 2257, plus 37). Build OK. No UI, so no browser check.
- Left: param entries are parsed again on each draw (cache if packs grow). The checkPhrase error tests assert that there are errors, not their exact count.
