/**
 * The starter skills and classes `buildStarterClasses` produced on a default world (snapshot taken before that helper
 * was deleted), without ids: class trees name their skills. `full` is a world with Life, Mana, Strength, Agility and
 * Intelligence (or their French names); `noMana` the same world without the Mana attribute.
 */
export const STARTER_SNAPSHOT: Record<'en-full' | 'en-noMana' | 'fr-full' | 'fr-noMana', { skills: any[]; classes: any[] }> =
{
 "en-full": {
  "skills": [
   {
    "name": "Power Strike",
    "description": "A heavy blow on one enemy. Grows with strength.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 0.5 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Iron Skin",
    "description": "Toughened by countless fights: permanently raises maximum life.",
    "kind": "toughness",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Life",
      "amount": "skillLevel * 5",
      "duration": 0
     }
    ]
   },
   {
    "name": "Cleave",
    "description": "A sweeping swing that hits every enemy.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Battle Cry",
    "description": "Rallies the allies: their main attribute rises for three turns.",
    "kind": "war-cry",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-allies",
    "cooldown": 3,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 4
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Strength",
      "amount": "skillLevel + 1",
      "duration": 3
     }
    ]
   },
   {
    "name": "Second Wind",
    "description": "Catches your breath and recovers life.",
    "kind": "remedy",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Life",
      "amount": "level * 2 + skillLevel * 5"
     }
    ]
   },
   {
    "name": "Mighty Blow",
    "description": "All the warrior's strength in a single, crushing strike.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 3,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "cost": {
     "attribute": "Mana",
     "amount": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Arcane Bolt",
    "description": "A bolt of raw magic on one enemy.",
    "kind": "lightning-spell",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "cost": {
     "attribute": "Mana",
     "amount": 2
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.6 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Healing Light",
    "description": "A soft light that closes the wounds of one ally.",
    "kind": "healing",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-ally",
    "cooldown": 1,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "heal",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.5 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Arcane Focus",
    "description": "Disciplined study: permanently raises maximum mana.",
    "kind": "focus",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Mana",
      "amount": "skillLevel * 4",
      "duration": 0
     }
    ]
   },
   {
    "name": "Fireball",
    "description": "An explosion of flames that burns an area.",
    "kind": "fire-spell",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "area",
    "cooldown": 2,
    "actionType": "Action",
    "roll": {
     "count": 2,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "cost": {
     "attribute": "Mana",
     "amount": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.8 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Arcane Ward",
    "description": "A shimmering barrier: your maximum life rises for three turns, more with intelligence.",
    "kind": "blessing",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 4
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.5 + skillLevel * 3",
      "duration": 3
     }
    ]
   },
   {
    "name": "Meteor Storm",
    "description": "Calls down a rain of burning rock on every enemy.",
    "kind": "fire-spell",
    "rarity": "mythic",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 4,
    "actionType": "Action",
    "roll": {
     "count": 3,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "cost": {
     "attribute": "Mana",
     "amount": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Quick Stab",
    "description": "A fast, precise stab on one enemy.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "cost": {
     "attribute": "Mana",
     "amount": 1
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 0.4 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Nimble",
    "description": "Light on your feet: permanently raises your main attribute.",
    "kind": "agility",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agility",
      "amount": "skillLevel",
      "duration": 0
     }
    ]
   },
   {
    "name": "Poisoned Blade",
    "description": "A coated blade that bites deeper than steel alone.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "cost": {
     "attribute": "Mana",
     "amount": 2
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Shadow Step",
    "description": "Slips into the shadows: your main attribute rises for two turns.",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 3,
    "actionType": "Movement",
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agility",
      "amount": "skillLevel * 2",
      "duration": 2
     }
    ]
   },
   {
    "name": "Assassinate",
    "description": "A lethal strike on an enemy that never saw you coming.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 4,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 12
    },
    "cost": {
     "attribute": "Mana",
     "amount": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 1.5 + skillLevel * 5"
     }
    ]
   }
  ],
  "classes": [
   {
    "name": "Warrior",
    "description": "A front-line fighter: sturdy, strong and hard to put down.",
    "kind": "warrior",
    "tree": [
     {
      "skillId": "Power Strike",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Iron Skin",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Cleave",
      "requires": [
       {
        "skillId": "Power Strike",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Battle Cry",
      "requires": [
       {
        "skillId": "Iron Skin",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 1,
      "row": 1
     },
     {
      "skillId": "Second Wind",
      "requires": [
       {
        "skillId": "Iron Skin",
        "level": 2
       }
      ],
      "minLevel": 5,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Mighty Blow",
      "requires": [
       {
        "skillId": "Cleave",
        "level": 2
       }
      ],
      "minLevel": 7,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Mage",
    "description": "A scholar of the arcane: spells that burn, heal and protect.",
    "kind": "mage",
    "tree": [
     {
      "skillId": "Arcane Bolt",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Healing Light",
      "requires": [],
      "minLevel": 1,
      "column": 1,
      "row": 0
     },
     {
      "skillId": "Arcane Focus",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Fireball",
      "requires": [
       {
        "skillId": "Arcane Bolt",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Arcane Ward",
      "requires": [
       {
        "skillId": "Healing Light",
        "level": 1
       }
      ],
      "minLevel": 4,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Meteor Storm",
      "requires": [
       {
        "skillId": "Fireball",
        "level": 3
       }
      ],
      "minLevel": 8,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Rogue",
    "description": "Quick and cunning: strikes first, from the shadows.",
    "kind": "rogue",
    "tree": [
     {
      "skillId": "Quick Stab",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Nimble",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Poisoned Blade",
      "requires": [
       {
        "skillId": "Quick Stab",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Shadow Step",
      "requires": [
       {
        "skillId": "Nimble",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Assassinate",
      "requires": [
       {
        "skillId": "Poisoned Blade",
        "level": 1
       },
       {
        "skillId": "Shadow Step",
        "level": 1
       }
      ],
      "minLevel": 6,
      "column": 1,
      "row": 2
     }
    ]
   }
  ]
 },
 "en-noMana": {
  "skills": [
   {
    "name": "Power Strike",
    "description": "A heavy blow on one enemy. Grows with strength.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 0.5 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Iron Skin",
    "description": "Toughened by countless fights: permanently raises maximum life.",
    "kind": "toughness",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Life",
      "amount": "skillLevel * 5",
      "duration": 0
     }
    ]
   },
   {
    "name": "Cleave",
    "description": "A sweeping swing that hits every enemy.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Battle Cry",
    "description": "Rallies the allies: their main attribute rises for three turns.",
    "kind": "war-cry",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-allies",
    "cooldown": 3,
    "actionType": "Action",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Strength",
      "amount": "skillLevel + 1",
      "duration": 3
     }
    ]
   },
   {
    "name": "Second Wind",
    "description": "Catches your breath and recovers life.",
    "kind": "remedy",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Life",
      "amount": "level * 2 + skillLevel * 5"
     }
    ]
   },
   {
    "name": "Mighty Blow",
    "description": "All the warrior's strength in a single, crushing strike.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 3,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Strength] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Arcane Bolt",
    "description": "A bolt of raw magic on one enemy.",
    "kind": "lightning-spell",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.6 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Healing Light",
    "description": "A soft light that closes the wounds of one ally.",
    "kind": "healing",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-ally",
    "cooldown": 1,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.5 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Fireball",
    "description": "An explosion of flames that burns an area.",
    "kind": "fire-spell",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "area",
    "cooldown": 2,
    "actionType": "Action",
    "roll": {
     "count": 2,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.8 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Arcane Ward",
    "description": "A shimmering barrier: your maximum life rises for three turns, more with intelligence.",
    "kind": "blessing",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Life",
      "amount": "[Intelligence] * 0.5 + skillLevel * 3",
      "duration": 3
     }
    ]
   },
   {
    "name": "Meteor Storm",
    "description": "Calls down a rain of burning rock on every enemy.",
    "kind": "fire-spell",
    "rarity": "mythic",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 4,
    "actionType": "Action",
    "roll": {
     "count": 3,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Intelligence] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Quick Stab",
    "description": "A fast, precise stab on one enemy.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 0.4 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Nimble",
    "description": "Light on your feet: permanently raises your main attribute.",
    "kind": "agility",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agility",
      "amount": "skillLevel",
      "duration": 0
     }
    ]
   },
   {
    "name": "Poisoned Blade",
    "description": "A coated blade that bites deeper than steel alone.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Shadow Step",
    "description": "Slips into the shadows: your main attribute rises for two turns.",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 3,
    "actionType": "Movement",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agility",
      "amount": "skillLevel * 2",
      "duration": 2
     }
    ]
   },
   {
    "name": "Assassinate",
    "description": "A lethal strike on an enemy that never saw you coming.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 4,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 12
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Life",
      "amount": "[Agility] * 1.5 + skillLevel * 5"
     }
    ]
   }
  ],
  "classes": [
   {
    "name": "Warrior",
    "description": "A front-line fighter: sturdy, strong and hard to put down.",
    "kind": "warrior",
    "tree": [
     {
      "skillId": "Power Strike",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Iron Skin",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Cleave",
      "requires": [
       {
        "skillId": "Power Strike",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Battle Cry",
      "requires": [
       {
        "skillId": "Iron Skin",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 1,
      "row": 1
     },
     {
      "skillId": "Second Wind",
      "requires": [
       {
        "skillId": "Iron Skin",
        "level": 2
       }
      ],
      "minLevel": 5,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Mighty Blow",
      "requires": [
       {
        "skillId": "Cleave",
        "level": 2
       }
      ],
      "minLevel": 7,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Mage",
    "description": "A scholar of the arcane: spells that burn, heal and protect.",
    "kind": "mage",
    "tree": [
     {
      "skillId": "Arcane Bolt",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Healing Light",
      "requires": [],
      "minLevel": 1,
      "column": 1,
      "row": 0
     },
     {
      "skillId": "Fireball",
      "requires": [
       {
        "skillId": "Arcane Bolt",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Arcane Ward",
      "requires": [
       {
        "skillId": "Healing Light",
        "level": 1
       }
      ],
      "minLevel": 4,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Meteor Storm",
      "requires": [
       {
        "skillId": "Fireball",
        "level": 3
       }
      ],
      "minLevel": 8,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Rogue",
    "description": "Quick and cunning: strikes first, from the shadows.",
    "kind": "rogue",
    "tree": [
     {
      "skillId": "Quick Stab",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Nimble",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Poisoned Blade",
      "requires": [
       {
        "skillId": "Quick Stab",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Shadow Step",
      "requires": [
       {
        "skillId": "Nimble",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Assassinate",
      "requires": [
       {
        "skillId": "Poisoned Blade",
        "level": 1
       },
       {
        "skillId": "Shadow Step",
        "level": 1
       }
      ],
      "minLevel": 6,
      "column": 1,
      "row": 2
     }
    ]
   }
  ]
 },
 "fr-full": {
  "skills": [
   {
    "name": "Frappe puissante",
    "description": "Un coup lourd sur un ennemi. Progresse avec la force.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 0.5 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Peau de fer",
    "description": "Endurci par d'innombrables combats : augmente durablement la vie maximale.",
    "kind": "toughness",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Vie",
      "amount": "skillLevel * 5",
      "duration": 0
     }
    ]
   },
   {
    "name": "Enchaînement",
    "description": "Un grand coup circulaire qui touche tous les ennemis.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Cri de guerre",
    "description": "Galvanise les alliés : leur attribut principal augmente pendant trois tours.",
    "kind": "war-cry",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-allies",
    "cooldown": 3,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 4
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Force",
      "amount": "skillLevel + 1",
      "duration": 3
     }
    ]
   },
   {
    "name": "Second souffle",
    "description": "Reprend son souffle et récupère de la vie.",
    "kind": "remedy",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Vie",
      "amount": "level * 2 + skillLevel * 5"
     }
    ]
   },
   {
    "name": "Coup dévastateur",
    "description": "Toute la force du guerrier dans une frappe écrasante.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 3,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "cost": {
     "attribute": "Mana",
     "amount": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Trait arcanique",
    "description": "Un trait de magie pure sur un ennemi.",
    "kind": "lightning-spell",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "cost": {
     "attribute": "Mana",
     "amount": 2
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.6 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Lumière guérisseuse",
    "description": "Une lumière douce qui referme les blessures d'un allié.",
    "kind": "healing",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-ally",
    "cooldown": 1,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "heal",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.5 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Concentration arcanique",
    "description": "Une étude rigoureuse : augmente durablement le mana maximal.",
    "kind": "focus",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Mana",
      "amount": "skillLevel * 4",
      "duration": 0
     }
    ]
   },
   {
    "name": "Boule de feu",
    "description": "Une explosion de flammes qui embrase une zone.",
    "kind": "fire-spell",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "area",
    "cooldown": 2,
    "actionType": "Action",
    "roll": {
     "count": 2,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "cost": {
     "attribute": "Mana",
     "amount": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.8 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Protection arcanique",
    "description": "Une barrière scintillante : votre vie maximale augmente pendant trois tours, davantage avec l'intelligence.",
    "kind": "blessing",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "cost": {
     "attribute": "Mana",
     "amount": 4
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.5 + skillLevel * 3",
      "duration": 3
     }
    ]
   },
   {
    "name": "Pluie de météores",
    "description": "Fait tomber une pluie de roche enflammée sur tous les ennemis.",
    "kind": "fire-spell",
    "rarity": "mythic",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 4,
    "actionType": "Action",
    "roll": {
     "count": 3,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "cost": {
     "attribute": "Mana",
     "amount": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Coup rapide",
    "description": "Un coup de dague rapide et précis sur un ennemi.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "cost": {
     "attribute": "Mana",
     "amount": 1
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 0.4 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Agilité accrue",
    "description": "Léger sur ses appuis : augmente durablement votre attribut principal.",
    "kind": "agility",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agilité",
      "amount": "skillLevel",
      "duration": 0
     }
    ]
   },
   {
    "name": "Lame empoisonnée",
    "description": "Une lame enduite de poison qui mord plus profond que l'acier seul.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "cost": {
     "attribute": "Mana",
     "amount": 2
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Pas de l'ombre",
    "description": "Se glisse dans l'ombre : votre attribut principal augmente pendant deux tours.",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 3,
    "actionType": "Movement",
    "cost": {
     "attribute": "Mana",
     "amount": 3
    },
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agilité",
      "amount": "skillLevel * 2",
      "duration": 2
     }
    ]
   },
   {
    "name": "Assassinat",
    "description": "Une frappe mortelle sur un ennemi qui ne vous a pas vu venir.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 4,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 12
    },
    "cost": {
     "attribute": "Mana",
     "amount": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 1.5 + skillLevel * 5"
     }
    ]
   }
  ],
  "classes": [
   {
    "name": "Guerrier",
    "description": "Un combattant de première ligne : robuste, puissant et difficile à abattre.",
    "kind": "warrior",
    "tree": [
     {
      "skillId": "Frappe puissante",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Peau de fer",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Enchaînement",
      "requires": [
       {
        "skillId": "Frappe puissante",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Cri de guerre",
      "requires": [
       {
        "skillId": "Peau de fer",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 1,
      "row": 1
     },
     {
      "skillId": "Second souffle",
      "requires": [
       {
        "skillId": "Peau de fer",
        "level": 2
       }
      ],
      "minLevel": 5,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Coup dévastateur",
      "requires": [
       {
        "skillId": "Enchaînement",
        "level": 2
       }
      ],
      "minLevel": 7,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Mage",
    "description": "Un érudit des arcanes : des sorts qui brûlent, soignent et protègent.",
    "kind": "mage",
    "tree": [
     {
      "skillId": "Trait arcanique",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Lumière guérisseuse",
      "requires": [],
      "minLevel": 1,
      "column": 1,
      "row": 0
     },
     {
      "skillId": "Concentration arcanique",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Boule de feu",
      "requires": [
       {
        "skillId": "Trait arcanique",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Protection arcanique",
      "requires": [
       {
        "skillId": "Lumière guérisseuse",
        "level": 1
       }
      ],
      "minLevel": 4,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Pluie de météores",
      "requires": [
       {
        "skillId": "Boule de feu",
        "level": 3
       }
      ],
      "minLevel": 8,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Voleur",
    "description": "Vif et rusé : frappe en premier, depuis l'ombre.",
    "kind": "rogue",
    "tree": [
     {
      "skillId": "Coup rapide",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Agilité accrue",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Lame empoisonnée",
      "requires": [
       {
        "skillId": "Coup rapide",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Pas de l'ombre",
      "requires": [
       {
        "skillId": "Agilité accrue",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Assassinat",
      "requires": [
       {
        "skillId": "Lame empoisonnée",
        "level": 1
       },
       {
        "skillId": "Pas de l'ombre",
        "level": 1
       }
      ],
      "minLevel": 6,
      "column": 1,
      "row": 2
     }
    ]
   }
  ]
 },
 "fr-noMana": {
  "skills": [
   {
    "name": "Frappe puissante",
    "description": "Un coup lourd sur un ennemi. Progresse avec la force.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 0.5 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Peau de fer",
    "description": "Endurci par d'innombrables combats : augmente durablement la vie maximale.",
    "kind": "toughness",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Vie",
      "amount": "skillLevel * 5",
      "duration": 0
     }
    ]
   },
   {
    "name": "Enchaînement",
    "description": "Un grand coup circulaire qui touche tous les ennemis.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Cri de guerre",
    "description": "Galvanise les alliés : leur attribut principal augmente pendant trois tours.",
    "kind": "war-cry",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-allies",
    "cooldown": 3,
    "actionType": "Action",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Force",
      "amount": "skillLevel + 1",
      "duration": 3
     }
    ]
   },
   {
    "name": "Second souffle",
    "description": "Reprend son souffle et récupère de la vie.",
    "kind": "remedy",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Vie",
      "amount": "level * 2 + skillLevel * 5"
     }
    ]
   },
   {
    "name": "Coup dévastateur",
    "description": "Toute la force du guerrier dans une frappe écrasante.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 3,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Force] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Trait arcanique",
    "description": "Un trait de magie pure sur un ennemi.",
    "kind": "lightning-spell",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.6 + skillLevel * 3"
     }
    ]
   },
   {
    "name": "Lumière guérisseuse",
    "description": "Une lumière douce qui referme les blessures d'un allié.",
    "kind": "healing",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-ally",
    "cooldown": 1,
    "actionType": "Action",
    "effects": [
     {
      "kind": "heal",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.5 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Boule de feu",
    "description": "Une explosion de flammes qui embrase une zone.",
    "kind": "fire-spell",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "area",
    "cooldown": 2,
    "actionType": "Action",
    "roll": {
     "count": 2,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 6
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.8 + skillLevel * 4"
     }
    ]
   },
   {
    "name": "Protection arcanique",
    "description": "Une barrière scintillante : votre vie maximale augmente pendant trois tours, davantage avec l'intelligence.",
    "kind": "blessing",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 4,
    "actionType": "Action",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Vie",
      "amount": "[Intelligence] * 0.5 + skillLevel * 3",
      "duration": 3
     }
    ]
   },
   {
    "name": "Pluie de météores",
    "description": "Fait tomber une pluie de roche enflammée sur tous les ennemis.",
    "kind": "fire-spell",
    "rarity": "mythic",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "all-enemies",
    "cooldown": 4,
    "actionType": "Action",
    "roll": {
     "count": 3,
     "faces": 6
    },
    "success": {
     "mode": "threshold",
     "value": 10
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Intelligence] * 1.2 + skillLevel * 6"
     }
    ]
   },
   {
    "name": "Coup rapide",
    "description": "Un coup de dague rapide et précis sur un ennemi.",
    "kind": "strike",
    "rarity": "common",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 0,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 5
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 0.4 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Agilité accrue",
    "description": "Léger sur ses appuis : augmente durablement votre attribut principal.",
    "kind": "agility",
    "rarity": "common",
    "type": "passive",
    "maxLevel": 5,
    "pointCost": 1,
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agilité",
      "amount": "skillLevel",
      "duration": 0
     }
    ]
   },
   {
    "name": "Lame empoisonnée",
    "description": "Une lame enduite de poison qui mord plus profond que l'acier seul.",
    "kind": "strike",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 5,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 2,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 8
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 0.3 + skillLevel * 2"
     }
    ]
   },
   {
    "name": "Pas de l'ombre",
    "description": "Se glisse dans l'ombre : votre attribut principal augmente pendant deux tours.",
    "rarity": "uncommon",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "self",
    "cooldown": 3,
    "actionType": "Movement",
    "effects": [
     {
      "kind": "modify",
      "attribute": "Agilité",
      "amount": "skillLevel * 2",
      "duration": 2
     }
    ]
   },
   {
    "name": "Assassinat",
    "description": "Une frappe mortelle sur un ennemi qui ne vous a pas vu venir.",
    "kind": "strike",
    "rarity": "rare",
    "type": "active",
    "maxLevel": 3,
    "pointCost": 1,
    "target": "one-enemy",
    "cooldown": 4,
    "actionType": "Action",
    "success": {
     "mode": "threshold",
     "value": 12
    },
    "effects": [
     {
      "kind": "damage",
      "attribute": "Vie",
      "amount": "[Agilité] * 1.5 + skillLevel * 5"
     }
    ]
   }
  ],
  "classes": [
   {
    "name": "Guerrier",
    "description": "Un combattant de première ligne : robuste, puissant et difficile à abattre.",
    "kind": "warrior",
    "tree": [
     {
      "skillId": "Frappe puissante",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Peau de fer",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Enchaînement",
      "requires": [
       {
        "skillId": "Frappe puissante",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Cri de guerre",
      "requires": [
       {
        "skillId": "Peau de fer",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 1,
      "row": 1
     },
     {
      "skillId": "Second souffle",
      "requires": [
       {
        "skillId": "Peau de fer",
        "level": 2
       }
      ],
      "minLevel": 5,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Coup dévastateur",
      "requires": [
       {
        "skillId": "Enchaînement",
        "level": 2
       }
      ],
      "minLevel": 7,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Mage",
    "description": "Un érudit des arcanes : des sorts qui brûlent, soignent et protègent.",
    "kind": "mage",
    "tree": [
     {
      "skillId": "Trait arcanique",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Lumière guérisseuse",
      "requires": [],
      "minLevel": 1,
      "column": 1,
      "row": 0
     },
     {
      "skillId": "Boule de feu",
      "requires": [
       {
        "skillId": "Trait arcanique",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Protection arcanique",
      "requires": [
       {
        "skillId": "Lumière guérisseuse",
        "level": 1
       }
      ],
      "minLevel": 4,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Pluie de météores",
      "requires": [
       {
        "skillId": "Boule de feu",
        "level": 3
       }
      ],
      "minLevel": 8,
      "column": 0,
      "row": 2
     }
    ]
   },
   {
    "name": "Voleur",
    "description": "Vif et rusé : frappe en premier, depuis l'ombre.",
    "kind": "rogue",
    "tree": [
     {
      "skillId": "Coup rapide",
      "requires": [],
      "minLevel": 1,
      "column": 0,
      "row": 0
     },
     {
      "skillId": "Agilité accrue",
      "requires": [],
      "minLevel": 1,
      "column": 2,
      "row": 0
     },
     {
      "skillId": "Lame empoisonnée",
      "requires": [
       {
        "skillId": "Coup rapide",
        "level": 2
       }
      ],
      "minLevel": 3,
      "column": 0,
      "row": 1
     },
     {
      "skillId": "Pas de l'ombre",
      "requires": [
       {
        "skillId": "Agilité accrue",
        "level": 1
       }
      ],
      "minLevel": 3,
      "column": 2,
      "row": 1
     },
     {
      "skillId": "Assassinat",
      "requires": [
       {
        "skillId": "Lame empoisonnée",
        "level": 1
       },
       {
        "skillId": "Pas de l'ombre",
        "level": 1
       }
      ],
      "minLevel": 6,
      "column": 1,
      "row": 2
     }
    ]
   }
  ]
 }
};
