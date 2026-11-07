# Development workflow

Develop one ticket test-first: **red** (failing tests), **green** (code that passes them), **review**, then a short **browser check** for UI tickets. You are the orchestrator: the `tdd-red`, `tdd-green` and `tdd-review` subagents (`.claude/agents/`) do the work, and the ticket file is the hand-off between them.

Input: the path of one ticket, `.scratch/<feature>/issues/NN-slug.md`. The next one is the first open row of `.scratch/ROADMAP.md`.

## Budget

This runs on a Claude Pro plan, so every token counts:

- You read the ticket and run short git/test commands; the subagents read the code. Leave code exploration to them.
- Pipe every test run through `tail` or a `grep` for summary lines.
- Briefs use the templates below, filled in. Subagents put details in the ticket file and reply with a short block.
- Retry a step by continuing the same subagent with `SendMessage`, which keeps its context.
- In the browser, read pages as text (`get_page_text`, `find`, `read_page`) and take a screenshot only for layout, at `scale: 0.5`.
- One ticket per run.

## 1. Load the ticket

Read the ticket file, and the section of `spec.md` (beside its `issues/` folder) that the ticket points to. State its title. Set `Status: claimed`.

Done when: you can say the ticket's behaviours in one line each, and whether it has UI.

## 2. Baseline

1. `git status --short` is empty. If it isn't, stop and ask.
2. Work on `develop` (or a `feat/<slug>` branch the user asked for). Never on `main`.
3. Run `npm test 2>&1 | grep -E "Test Files|Tests |FAIL"`. Record it in the ticket as `## Baseline`.

Done when: `## Baseline` is in the ticket. A red baseline is fine: it is recorded, and later steps compare against it.

## 3. Agree the seams

Propose 1 to 3 seams: the public interfaces the tests will go through. In this app they are usually:

- a `*.rules.ts` helper (pure game rules),
- a business class over the fake peer network (`src/testing/game-device.ts`: a host and players in one test),
- a component's inputs/outputs (`TEST_PROVIDERS`).

One line each: what it catches, what it misses. Ask the user to confirm.

More than 3 seams means the ticket is too big: propose a split and stop.

Done when: the user confirmed, and the seams are written in the ticket as `## Seams`.

## 4. Red

Dispatch `tdd-red`:

> Ticket: `<ticket path>`. Seams are in the ticket. Baseline: `<summary line>`. Spec section: `<spec.md heading, or none>`.

Then run the `## Red` command yourself through `tail -15` and check it fails as described. Stage the test files: `git add <test files>`.

Done when: the new tests are red for the reason the report gives, and staged.

## 5. Green

Dispatch `tdd-green`:

> Ticket: `<ticket path>`. The red tests are staged; keep them unchanged.

Then check:

- `git diff --name-only` lists no test file.
- The `## Red` command passes (`tail -15`).
- `npx ng build 2>&1 | grep -E "ERROR|Output location"` shows no error (templates are only compiled by the build).

If a check fails, or the agent reports a test it believes is wrong, continue it once with `SendMessage` and the exact problem. A second failure goes to the user.

Done when: all checks pass.

## 6. Review

Dispatch `tdd-review`:

> Ticket: `<ticket path>`. Review `git diff HEAD`.

- **ship**: go to step 7.
- **fix first**: show the user the `Must fix` lines. On their go, continue `tdd-green` with `SendMessage` and those lines, rerun the step 5 checks, then continue `tdd-review` with `SendMessage` for a re-check of the fixes only.

Done when: the verdict is `ship`, or the user accepted the remaining findings.

## 7. Browser check (UI tickets only)

Start the dev server with `preview_start` (`front`, from `.claude/launch.json`). Walk the ticket's main flow once, in French and in English (`localStorage.lang = 'en'` then reload), and once at mobile width (`resize_window` preset `mobile`, back to `desktop` after). Check `read_console_messages` with `onlyErrors`.

Two devices in one browser share one profile, so the player side of a room flow stays covered by the multi-device test, not the browser. Say so in the ticket.

Done when: the flow works with no console error, or the problem is fixed through `tdd-green` and rechecked.

## 8. Wrap up

1. Show the user: the ticket title, files changed (`git diff HEAD --stat`), suite result vs baseline, and any `Consider` lines.
2. Append `## Answer` to the ticket (what was built, decisions taken, what was checked and how), set `Status: resolved`, and `git mv` it to `.scratch/archived/<feature-slug>/issues/` (see `docs/agents/issue-tracker.md`).
3. Commit on `develop` as `<type>(<scope>): <summary>`, ending with "Resolve `<ticket path>` (archived)". Commit only files of this ticket: leave other sessions' changes alone.

Nothing is pushed unless the user asks. Promotion is a PR `develop` → `main`.
