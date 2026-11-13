# Sprite kinds: grayscale, masked, colored

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (What a pack is: sprite kinds table)

- The sprite library shows a kind badge and a kind filter; sprites are grouped by pack.
- `grayscale` opens like a loaded image, `masked` opens with its materials, `colored` is refused by the colorizer with a message (decided).
- Random item images: `masked` gets random gradients per material, `grayscale` uses the automatic material guess, `colored` is used as is.
