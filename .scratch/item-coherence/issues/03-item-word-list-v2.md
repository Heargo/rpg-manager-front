# Item word list v2 and the Base FR/EN lists

Status: ready-for-agent
Type: task
Blocked by: 01, 02

Spec: `../spec.md` (Decisions 2, 3, 4, 9, 10, 13, Assumed: untinted adjectives, Base packs, param warnings).

- `WORD_LIST_VERSION` 2: `kinds` (`{ [kind]: { nouns?, descriptions?, names?: Partial<Record<rarity, string[]>> } }`), `tints` (`{ [tint]: { adjectives?, suffixes?, descriptions? } }`), `adjectives?` and `suffixes?` per rarity (untinted), `templates?` per rarity. All sections optional, but the file must give something.
- `bases` and `descriptions` per type go away.
- Shared language file `generators/common.json`, version 1: `params` (`{ [name]: string[] }`). Its validator is separate from the items one, since every domain will use it.
- The items validator is the generic language-file validator (`kinds` keyed by the domain's kind ids, plus top-level sections) with the items schema (kind sections `nouns`, `descriptions`, `names`; tint sections; `adjectives`, `suffixes`, `templates`). Unknown fields are errors.
- Validation with readable errors: every phrase passes the phrase engine's syntax check; templates and `names` must contain `{base}`; a template using `{suffix}` for a rarity with no suffix anywhere in the file is only a warning (another pack may give them); params used and not defined in the file are warnings, not errors.
- `base-fr` and `base-en` `generators/items.json` rewritten: every current noun under its kind (new kinds for nouns that had no sprite, declared in 01's manifests), descriptions on the roots and on some kinds, tinted adjectives/suffixes for the obvious ones (rouillé → `rust`, argenté → `silver`, des braises → `fire`, des marées → `ice`…), and a `generators/common.json` with a starting set of params (`maker`, `owner`, `place`, `event`, `material`, `creature`, `effect`). Plus the templates.
