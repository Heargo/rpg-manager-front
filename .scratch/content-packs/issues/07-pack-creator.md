# Pack creator

Status: ready-for-agent
Type: task
Blocked by: 02, 05

Spec: `../spec.md` (Pack creator)

- "Create a pack" button on the Packs page opens the creator; drafts are saved on the device (several, deletable).
- Details form (id derived from the name, EN/FR name and description, version, author, license, URLs) with Optimus UI controls.
- Generators: per language and generator, import a JSON word list or copy Base's, edit as JSON with the existing validators' errors live.
- Sprites: from a PNG upload, a saved sprite set or the colorizer's current sprite; id, labels, type, slot, kind; `masked` sprites edited in the colorizer and saved back to the draft; limits checked on add.
- Outputs: "Install on this device" (same validation as "Add a pack"), "Export" as a `.zip` in the documented layout (small zip library, e.g. `fflate`), and "Edit as a new draft" for installed non-official packs.
- Seams likely: a pure `buildPack(draft)` → manifest + files (validated with `validatePack`), the creator business over faked storage, the page's inputs/outputs.
