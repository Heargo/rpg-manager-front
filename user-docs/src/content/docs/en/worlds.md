---
title: "Worlds and rules"
description: "Create a world and set its attributes, progression, economy and combat."
---

A **world** holds everything a game needs: the characters' attributes, the progression rules, the economy, the catalogues (items, NPCs, skills, classes) and the combat settings. The game master creates it and hosts it.

## Create a world

In **Worlds**, click **New world**. The wizard has three steps, with a preview of the world on the right.

**1. Identity**: the name and a short description.

![The Identity step of the wizard](../../../assets/screens/en/worlds-wizard-identity.png)

**2. Attributes**: what every character has (Life, Mana, Strength…). Each one has a base value and a **progression** that gives its maximum by level: linear, steep linear, diminishing, percent or custom (a formula). The heart and bolt icons pick the two attributes shown as bars (life and mana).

![The Attributes step of the wizard](../../../assets/screens/en/worlds-wizard-attributes.png)

**3. Rules**: progression, economy, skills, combat and the world's [content packs](/docs/en/packs/#a-worlds-packs) (by default, the Base in the app's language and Base assets for the sprites). You can also add the **default items** and the **default classes and skills** to have a playable world right away.

On the **Identity** step, besides uploading a picture, you can pick one of the **world images** of the active packs (Base assets brings nine landscapes): the picture is copied into the world, so it stays when the pack is turned off and for players who join. The **World rules** page has no picture picker yet.

![The Rules step of the wizard](../../../assets/screens/en/worlds-wizard-rules.png)

## Your worlds

Your worlds are listed in **Worlds**, with the ones you joined as a player (a **GM** or **Player** badge). For each of your worlds: **Host** to start a game, **Export as a file** to keep a copy or move it to another device, **Import** to load it back.

![The list of worlds](../../../assets/screens/en/worlds-list.png)

## The world rules

Once the game is running, **World rules** lets you adjust everything. Changes reach the players at once. The page has three tabs:

- **Attributes**: the same settings as in the wizard.
- **Rules**: progression (stat and skill points, max level, the XP curve: flat, growing, steep, classic or custom), economy (starting money, selling), skills (whether they roll dice), what players see of NPCs shown on the table, combat, and the [packs](/docs/en/packs/#a-worlds-packs) the generators use.
- **Offline**: what players can still do while the host is offline (roll dice, write notes, equip, sell…).

![The World rules page](../../../assets/screens/en/worlds-rules.png)

### The world language

The **World language** setting (English or French) is in the rules section, in the wizard (**Rules** step) as in **World rules**. A new world takes the app's language; an older world that has none is read with the app's language. It is exported with the world. In the **Tools**, with no world, it is the app's language (or the one set in **Tools › World rules**).

This language decides the **texts** of the item generators: nouns, adjectives, descriptions and params only come from [packs](/docs/en/packs/#the-world-language) written in that language. An active pack in another language is still allowed, marked "images, kinds and tints only": only its sprites, kinds and tints are used. A neutral pack is marked "images".

### Combat

The **Combat** section sets the life attribute (0 means down), initiative, actions per turn, the grid, movement, and the basic attack and defence formulas. **Every combat step is optional**: initiative, action counters, GM validation of results, defence and end-of-combat rewards. A step that is off hides its settings and leaves the combats (see [Combat](/docs/en/combat/)).

![The Combat section of the world rules](../../../assets/screens/en/worlds-rules-combat.png)

:::tip
Formulas (progression, initiative, attack, defence…) accept numbers, `+ - * / ^`, parentheses, `min`, `max`, `floor`, `round`, `sqrt`, plus `level` and attributes by name. They are checked as you type.
:::
