---
title: "Content packs"
description: "Add sprites and word lists to the generators, from official packs or a link."
---

A **pack** adds content to the app: **word lists** for the generators (items, NPCs, skills, classes) and item **sprites**. Packs are managed from **Tools › Content packs**.

![The content packs page](../../../assets/screens/en/packs-page.png)

## The Base pack

**Base** holds the word lists and the 101 item sprites bundled with the app. It is **always on** and cannot be removed. **Details** shows its license, its word lists per language and its sprites, grouped by kind.

![A pack's details](../../../assets/screens/en/packs-details.png)

A sprite is one of three **kinds**:

- **Grayscale**: an image you split into materials yourself in the [colorizer](/docs/en/tools/).
- **Masked**: a grayscale image shipped with its materials, ready to recolour.
- **Colored**: an image already in colour, used as is. The colorizer refuses it.

## Official packs

Official packs are listed on the page, but **their files are only downloaded when you turn them on**. They then stay on the device and work **offline**. Turning a pack off keeps its files; **Remove from device** deletes them (you can download it again).

For now, Base is the only official pack.

## Add a pack from a link

**Add a pack** installs a pack made by someone else. Paste:

- a **GitHub repository** link (`https://github.com/owner/repository`), or one of its folders (`…/tree/main/my-pack`);
- or an **https** link to a `pack.json` file.

**Check** downloads the whole pack and checks every file, **without installing anything**. You see its name, author, license, source, size and what it adds. **Install** stores it on the device and turns it on. If a file has a problem, the list of errors is shown and nothing is installed.

![A pack's preview before installing it](../../../assets/screens/en/packs-add-preview.png)

:::caution
A pack added from a link is **not checked by the app's authors**. It only holds data (text and images), never code, and the app checks its size and format, but its words and images can be anything. Only add packs whose source you know.
:::

Packs added from a link have their own section. **Update** downloads the pack again from its link and shows the old and new versions before replacing it. **Remove from device** deletes it. Items and NPCs already generated keep their names and images.

The authors and licenses of installed packs are listed in the [credits](/docs/en/about/).

## Choose the pack in the generators

The item editor, the item generator and the NPC editor have a **Pack** menu next to the seed.

![The pack choice next to the seed](../../../assets/screens/en/packs-choice.png)

- **Random** (the default) picks the pack from the seed: the same seed, with the same packs on, always gives the same result.
- A named pack uses its word lists, and its sprites for the item's random image. If it has no list in your language, Base takes over.

The **Random** buttons for skills and classes pick a pack at random among those that have them.

To make your own pack, see [Create a pack](/docs/en/create-pack/).
