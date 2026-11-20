# Gather the Vecteezy landscapes for the neutral pack

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (World images)

Download needs a Vecteezy account and a licence check per image, so a human does it. For each: check it's under the free licence (not Pro), download, export to WebP at the pack's size, name it, tag it, note the author for the credits.

- https://www.vecteezy.com/vector-art/7095576-mountains-in-the-night-sky-near-the-clouds-vector-flat-illustration-landscape
- https://www.vecteezy.com/vector-art/7162595-beautiful-blue-mountain-landscape-silhouette-with-fog-and-sunrise-and-sunset-in-mountains-background-outdoor-and-hiking-concept-sun-in-the-sky-vector-good-for-wallpaper-site-banner-cover-poster
- https://www.vecteezy.com/vector-art/11513279-beautiful-sunset-arctic-or-antartic-iceberg-landscape-illustration
- https://www.vecteezy.com/vector-art/23103479-abstract-flat-desert-mountain-landscape-vector-background-scenery-flat-desert-mountain-landscape-vector-background-earth-tone-scenery-flat-desert-mountain-landscape-vector
- https://www.vecteezy.com/vector-art/12991429-cartoon-nature-landscape-early-morning-background
- https://www.vecteezy.com/vector-art/273915-ocean-background
- https://www.vecteezy.com/vector-art/10551466-mountain-landscape-illustration-set-cartoon-summer-collection-of-mountainous-natural-landscape-backgrounds-with-green-forest-and-lake-in-the-morning-afternoon-evening-and-night-nature-panorama (a set: split into one image per time of day)
- https://www.vecteezy.com/vector-art/8277964-landscape-of-mountains-and-pine-forests-in-the-morning-or-evening
- https://www.vecteezy.com/vector-art/8277965-mountain-landscape-with-pines-and-forests-under-winter-skies
- https://www.vecteezy.com/vector-art/14487928-silhouette-of-nature-landscape-mountains-forest-in-background-blue-and-green-illustration
- https://www.vecteezy.com/vector-art/9155728-beautiful-seasonal-nature-mountain-landscape-illustration

Then an agent adds them to the neutral pack's manifest and the credits page (Vecteezy attribution, FR/EN).

## Progress (2026-11-18)

9 of the 11 landscapes were provided by the user and are in `base-assets` (NP03, commit 9921218), each with its source link. Still missing: 10551466 (mountain landscape set, to split per time of day) and 9155728 (seasonal nature). Drop their SVG in the same folder and an agent converts them (`rsvg-convert -w 1600` then `magick -quality 80` to WebP) and adds them to `public/packs/base-assets/pack.json` with their source.

## Answer

Done by the user (reported 2026-11-18): the landscapes were gathered by hand, outside this repository's ticket workflow.
