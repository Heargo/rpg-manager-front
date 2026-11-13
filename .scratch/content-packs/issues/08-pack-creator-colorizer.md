# Pack creator: the colorizer link

Status: ready-for-agent
Type: task
Blocked by: 07

Spec: `../spec.md` (Pack creator: Sprites). Split from K07 on 2026-11-13 (a fourth seam on the colorizer).

- In the colorizer, "Ajouter à un brouillon de pack / Add to a pack draft": picks a draft and adds the current sprite with its materials as a `masked` sprite (limits checked).
- In the pack creator, "Modifier dans le colorizer / Edit in the colorizer" on a draft sprite opens it in the colorizer with its materials; saving there writes the image and materials back to that draft sprite (a grayscale sprite becomes `masked` once it has materials).
