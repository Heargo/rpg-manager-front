# Unofficial packs from a link or GitHub repository

Status: needs-triage
Type: task
Blocked by: 03

Spec: `../spec.md` (Unofficial packs)

- Pure helper resolving a link to a manifest URL: `github.com/<owner>/<repo>[/tree/<ref>/<path>]` → `raw.githubusercontent.com/...`, or a direct HTTPS `pack.json`; relative file URLs resolved against it.
- "Add a pack" dialog: fetch the manifest, show name, author, license, source, counts per generator and sprite kind, size and the third-party warning; install downloads and validates every file (word-list validators, PNG decode and limits, colorizer config import), stores it, or lists errors and installs nothing.
- Update (shows old and new version, replaces on confirm) and Remove on the Packs page.
- Data only: nothing from a pack is executed or rendered as HTML.
