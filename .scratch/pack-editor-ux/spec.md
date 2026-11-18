# Spec: pack editor made usable (2026-11-17)

From `quicknotes.md` ("l'interface de modification de pack est vraiment pas ouf"). Proposed, not yet validated with the user; points marked "assumed" are my reading of the notes.

## Navigation

- **Packs** becomes a top-level nav entry (out of a room and in a room), no longer an entry of the Tools submenu.
- The Tools submenu loses **Item generator**, **Character sheet** and **Combat**. Assumed: their routes and pages (`tools/item-generator`, `tools/character-sheet`, `tools/combat`) are removed too, with their tests, i18n keys and doc pages, unless another page still links to them (then that link goes). The item generator stays reachable through the item editor's Random button.

## Word lists tab split in five tabs

The draft page's "Word lists" tab becomes five tabs: **Common**, **Items**, **NPCs**, **Skills**, **Classes**.

- **Common**: what every generator shares for names and descriptions: the shared kinds tree and the params (`common.json` v2, see below).
- **Items**: kinds tree table, tints table, item texts and templates.
- **NPCs**, **Skills**, **Classes**: kinds tree table and the domain's texts.
- Each tab keeps its own "Advanced" JSON panel (import a file, copy from Base, clear) for that file only. Neutral drafts (no language) hide the texts parts; their Common tab shows the shared kinds tree only.

## Kinds as a tree table

- Kinds are shown in an Optimus UI **tree table** (parent → children), not a list of cards. Columns: label, id, the domain's main fields (type / slot for items, roles for NPCs, type / effect for skills, favoured skill kinds for classes), and row actions **Edit** and **Delete**.
- Clicking a row opens its **detail**; Edit opens the **form**. Add root kind / add child kind from the table (toolbar and row action).
- Delete asks for confirmation and says what happens to the children (assumed: children are deleted with it; the validation already flags references from sprites or tints).
- Items also get a **tints table** (name, gradient preview, fits), same detail / edit / delete pattern.

## Side panel

Detail and form open in a **right side panel overlaying the page** (Optimus UI drawer, `position="right"`), not inline. Full width on a phone. Closing with unsaved changes asks to discard (assumed). The table stays visible behind it on desktop.

## Common v2: shared kinds (decided 2026-11-17)

`common.json` goes to v2 and adds **shared kinds**: a kinds tree (e.g. `material` → `metal` → `iron`) whose words every generator can use in names and descriptions. The tree lives in the manifest (`sharedKinds`, so neutral packs can declare it), the words in `common.json`. A domain kind lists the shared kinds that fit it (`shared`); a generated entry draws one shared kind per root and keeps it, so its name and description agree. Details and assumptions in ticket 02; the Common tab editor is ticket 06.
