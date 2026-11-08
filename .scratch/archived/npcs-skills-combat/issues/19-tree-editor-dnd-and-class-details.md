# Class tree editor with drag & drop, and class details

Status: resolved
Type: task
Blocked by: 06

Spec: `../spec.md` (Classes and skill trees: "Tree editor: a grid; the GM adds catalogue skills as nodes, drags them to a cell, links a node to its prerequisites").

User request (2026-11-08): « first make a better ui pour la création/modifications des arbres de classes (je veux du drag & drop et une ui plus moderne) et add a button to visualise the class details from the catalogue. »

N06 shipped column/row number fields. This replaces them with a modern board editor:

- **Board**: a grid of cells (grows by a row/column when you drop near the edge), with nodes drawn as skill cards (icon, name, max rank, min level badge) and prerequisite links as SVG curves with an arrow toward the node that requires them.
- **Drag & drop** (Angular CDK, already installed):
  - drag a skill from a palette (the catalogue skills not in the tree, with a search box) onto a cell to add it there;
  - drag a node to another cell to move it (dropping on an occupied cell swaps the two);
  - drag from a node's connector handle onto another node to make the first a prerequisite of the second (rank 1 by default).
- **Inspector**: selecting a node opens a side panel with its min level, its prerequisites (each with its required rank, removable), and Remove from tree. Clicking a link selects it so it can be deleted.
- Validation errors from `validateClass` show on the board: the nodes and links involved are highlighted, and save stays blocked.
- Works with touch on a phone. Below a tablet width the palette and inspector stack under the board.
- **Class details**: each class card in the catalogue (GM and Tools) gets a "View" button that opens a dialog with the image, name, description, bonuses, starting items, the read-only tree (`app-skill-tree`) and the list of its skills with their descriptions. Tapping a node in the tree scrolls to that skill.

## Baseline

Test Files 124 passed (124), Tests 1050 passed (1050).

## Seams

1. **Tree board rules (pure, `class/helpers/tree-board.rules.ts`)**: add a node at a cell, move a node to a cell (swap when occupied), link a prerequisite (refused when it would make a cycle, link itself, or duplicate a link), unlink, remove a node (its links go with it), grow the board size from the nodes, and a cell from a pointer offset and cell size. Misses: the gestures themselves.
2. **Class editor component inputs/outputs (`TEST_PROVIDERS`)**: the board shows a node per tree skill at its cell and a link per prerequisite. The palette lists only skills not in the tree, filtered by its search. Selecting a node opens the inspector, where min level, prerequisite ranks and removal edit the class. Validation errors mark the nodes involved and block save. The emitted class reflects the edits. The component's drop handlers (`onPaletteDrop`, `onNodeDrop`, `onLinkDrop`, public methods fed by CDK events) are called with a target cell or node. Misses: real pointer dragging (browser check, by hand, desktop and touch).
3. **Class catalogue component inputs/outputs**: each card's View button opens the details dialog with the name, description, bonuses, starting items, the read-only tree and the class's skills with their descriptions. GM and Tools both have it. Misses: dialog layout (browser check).

## Red

- Test files: `src/app/modules/class/helpers/tree-board.rules.spec.ts` (new), `src/app/modules/class/components/class-editor/class-editor.component.spec.ts` (rewritten for board/inspector; the cycle, no-name and emit/JSON tests kept), `src/app/modules/class/components/class-catalogue/class-catalogue.component.spec.ts` (new)
- Run: `npm test` (single-file `ng test --include` fails on the baseline too: `node:crypto` type error in `jsdom-setup.ts`). Result: Test Files 3 failed | 123 passed, Tests 16 failed | 1046 passed | 12 skipped (the 12 are the rules tests).
- API the tests fix: `tree-board.rules.ts` exports `addNodeAt(tree, skillId, {column,row})`, `moveNode(tree, skillId, cell)`, `linkPrerequisite(tree, prerequisiteId, skillId)`, `unlinkPrerequisite(tree, prerequisiteId, skillId)`, `removeNode(tree, skillId)`, `boardSize(tree)` (min 4x3, else farthest node + 2), `cellAt({x,y}, {width,height})`; refused operations return the tree unchanged. The editor exposes public `onPaletteDrop(skillId, cell)`, `onNodeDrop(skillId, cell)`, `onLinkDrop(fromSkillId, toSkillId)`; the catalogue gains `skills` and `items` inputs. DOM hooks are in each spec's header comment. The rules spec loads its module with a runtime dynamic import so the suite still compiles.
- Failing: 28 tests (12 + 11 + 5)
  - tree-board.rules.spec.ts, 12 tests (addNodeAt x2, moveNode x2, linkPrerequisite x2, unlinkPrerequisite, removeNode, boardSize x2, cellAt x2) — module `tree-board.rules` does not exist (whole file fails to load)
  - class-editor: fills the form and the JSON ... draws a node per skill and a link per prerequisite — no `data-column`, no `[data-link]`
  - class-editor: lists in the palette only the skills not in the tree, filtered by its search — no `[data-palette-item]` / `palette-search`
  - class-editor: adds a palette skill at the dropped cell — `onPaletteDrop` missing
  - class-editor: moves a node to the dropped cell, and swaps ... — `onNodeDrop` missing
  - class-editor: makes a prerequisite of rank 1 when a node is dropped on another — `onPaletteDrop`/`onLinkDrop` missing
  - class-editor: refuses a drop link that would make a cycle — `onLinkDrop` missing
  - class-editor: opens the inspector on a selected node and edits ... — no `[data-inspector]`
  - class-editor: removes a prerequisite from the inspector — no `[data-inspector]`
  - class-editor: removes a node from the tree from the inspector ... — no `[data-inspector]`
  - class-editor: selects a link by clicking it and deletes it — no `[data-link]`
  - class-editor: highlights the nodes involved in a validation error — no `data-invalid` on nodes
  - class-catalogue (5 tests: View button per card, no details until View, details name/description/bonuses/items, read-only tree and skills with descriptions, scroll to skill on tree node tap) — NG0303: `skills` input missing (then View button, dialog and `[data-skill]` blocks do not exist)

## Green

- Files: src/app/modules/class/helpers/tree-board.rules.ts (new), src/app/modules/class/components/class-editor/class-editor.component.ts, src/app/modules/class/components/class-catalogue/class-catalogue.component.ts, src/app/modules/class/components/skill-tree/skill-tree.component.ts, src/app/modules/class/pages/class-catalogue-page/class-catalogue-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: Tree board rules (add/move-swap/link with cycle refusal/unlink/remove/boardSize/cellAt, plus `involvedInIssues`). Editor is now palette | board | inspector (stacked under 64rem): CDK drag-drop palette items and nodes (preview + ghost placeholder, hovered cell highlighted, dropPoint to cell), connector handles drawing a dashed wire and highlighting the target node, SVG bezier links with arrowheads and clickable rank chips, dotted grid, selected/invalid states, p-inputnumber inspector; `onPaletteDrop`/`onNodeDrop`/`onLinkDrop` public. Catalogue cards get a View button opening a p-dialog (image, name, description, bonuses, items, read-only `app-skill-tree`, skill list; tapping a node scrolls to the skill via a new `nodeSelected` output on the tree); the page passes `skills`/`items`. EN/FR keys added, unused column/row/addRequirement removed.
- Suite: Test Files 126 passed, Tests 1074 passed (baseline 124 / 1050 plus the 3 new files); tsc clean; ng build OK (no error; CDK drag-drop is only in a lazy chunk; the existing initial-budget warning remains, class-editor styles now 6.34 kB over the 4 kB component-style budget warning); no unstaged test file.
- Open questions: real pointer/touch dragging and layout were not checked in a browser (browser check by hand); the class-editor component style budget warning (4 kB) is exceeded, a candidate for the review step (split SCSS or raise the budget).

## Review

- Verdict: fix first
- Must fix: class-editor.component.ts:300-375 — spec says linking is by drag only, and moving a node has no keyboard path: nodes are `tabindex=0` but only Enter (select) is handled; the connector `cdkDrag` is not focusable. Keyboard/screen-reader users can add (palette "+"), edit and remove, but cannot link or move. Add a keyboard alternative in the inspector (a "Add prerequisite" p-select of other nodes calling `onLinkDrop`, and optionally column/row via arrows or inputs) — drops spec "better UI" parity with N06, which had number fields for position and requirements (regression).
- Must fix: class-editor.component.ts ~line 644 and 905 — `touch-action: none` on every palette item makes the palette list unscrollable by touch on a phone (stacked layout); restrict to a `cdkDragHandle` (grip icon) or use `cdkDragStartDelay` for touch.
- Must fix: class-editor.component.ts styles (6.34 kB > 4 kB warning) — move the styles to `class-editor.component.scss` via `styleUrl` (as character-card, character-sheet do); a split of board/palette/inspector into subcomponents is optional. The 8 kB error limit is close to being hit.
- Consider: class-editor.component.ts:1165-1193 — wiring is correct: palette/node use `dropPoint` -> cell, link uses `dropPoint` -> `nodeAt(cell)`; CDK handles touch events itself. But the CDK `endXDrag` glue is untested (only `onXDrop` is); the node/palette drag keeps its transform after drop unless the re-render replaces it (palette item removed on add; a node move with no change, e.g. dropped outside the board, leaves the element offset: call `event.source.reset()` as in endLinkDrag).
- Consider: class-editor.component.ts — the 1300-line component mixes board geometry, drag glue and inspector; extract the board as a subcomponent.
- Consider: connector hit target is 22 px (`left - 11`), under the 44 px touch guideline.
- Consider: class-catalogue.component.ts `scrollToSkill` uses a selector built from an id; use `CSS.escape` or a ViewChild lookup.
- Checked, fine: no native inputs beyond pInputText/textarea in the Optimus style (existing), p-inputnumber/p-dialog used; strings in en.json and fr.json; no secrets; the details dialog shows only the class's name, description, bonuses, items, tree and skill descriptions (the catalogue is the GM/Tools page, same data as the card and editor).

## Answer

Built:
- The class editor's tree is now a board (`app-tree-board`, with an `app-tree-links` SVG layer) driven by pure rules in `tree-board.rules.ts`: addNodeAt, moveNode (swap), linkPrerequisite (refuses self, duplicate and cycle), unlinkPrerequisite, removeNode, boardSize, cellAt, linkRoute.
- CDK drag & drop:
  - palette → cell (by a grip handle, so the palette scrolls on touch);
  - node → cell;
  - a node's bottom connector → another node, to make a prerequisite.
- Each card sits in a positioned slot, so a drop never loses its place.
- Links run from the bottom of the prerequisite to the top of the skill that needs it, with arrowheads and clickable rank chips.
- The inspector edits min level and prerequisite ranks, adds a prerequisite (p-select), deletes a link, or removes a node.
- Arrow keys move the focused node, and the palette has a "+" button, so it works without a mouse.
- Validation errors highlight the nodes and links involved.
- The class catalogue (GM and Tools) gets a View button with a details dialog: name, description, bonuses, starting items, the read-only tree (same routing) and the skills with their descriptions. Tapping a node scrolls to its skill.

Decisions:
- The user's request (2026-11-08) replaces N06's column/row number fields.
- Styles live in .scss files, with the board and links split into components to stay under the 4 kB component budget without dropping hover/transition polish.

Checked:
- Suite 1074/1074 (baseline 1050), spec typecheck clean, `ng build` clean (no class style warning), review verdict ship after two fix rounds.
- By hand in the browser (Tools, Guerrier, 800px wide):
  - moved a node to an empty cell; it renders at its cell and its links follow;
  - linked Second souffle → Coup dévastateur by dragging the connector (rank 1, link selected in the inspector);
  - dragged "Trait arcanique" from the palette by its grip onto an empty cell; the board grew and the inspector opened;
  - the details dialog shows the tree and the skills.
- At phone width there's no horizontal page scroll; the board scrolls inside itself and the inspector stacks under it. No console errors after a reload.

Follow-ups: dedicated specs for `linkRoute`, the arrow-key move and the inspector's "Add a prerequisite" (covered by the browser check only).
