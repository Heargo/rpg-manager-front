# Stats table without horizontal scroll; bonus next to the name

Status: resolved
Type: task

User request (2026-11-08): « le tableau de stats dans la fiche personnage ne doit pas avoir de scroll horizontal (enlève la colonne bonus pour que ce soit juste un texte intégré à droite du nom) ».

## Answer

- **Columns:** the Bonus column (header and cells) is removed; an equipment bonus shows as a small coloured tag right after the attribute name (`.bonus`, green for a bonus, red for a malus, labelled "Bonus" for screen readers), only when it isn't 0.
- **Scroll:** the `.stats-scroll` wrapper (`overflow-x: auto`) is removed.
- **Test:** written first (no Bonus header, the bonus tag next to the name, no scroll wrapper); it failed, then passed. Suite green.
- **Checked in the browser:** at 1440 px the table is 378 px in a 456 px panel; at 375 px it ends at 312 px in a 351 px panel; no horizontal scroll at either size.
