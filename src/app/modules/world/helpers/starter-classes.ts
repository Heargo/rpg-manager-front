import { CharacterClass, TreeNode } from '../../class/models/class';
import { Skill, SkillEffect, SkillRoll, SkillSuccess, SkillTarget } from '../../skill/models/skill';
import { ItemRarity } from '../../../core/models/item';
import { World } from '../models/world';

/** The starter skills and the three classes whose trees use them. */
export interface StarterClasses {
  skills: Skill[];
  classes: CharacterClass[];
}

type Text = readonly [en: string, fr: string];

/** The attribute names the starter amounts and costs are written on. */
interface Context {
  /** The class's main attribute. */
  main: string;
  life: string;
  /** Undefined when the world has no mana bar: skills then cost nothing. */
  mana: string | undefined;
}

interface SkillSpec {
  key: string;
  name: Text;
  description: Text;
  rarity: ItemRarity;
  maxRank: number;
  /** Left out of a world with no mana bar. */
  needsMana?: true;
  /** Absent for a passive skill. */
  active?: {
    target: SkillTarget;
    cost: number;
    cooldown: number;
    /** Default 1d20. */
    roll?: SkillRoll;
    /** Default always. */
    success?: SkillSuccess;
  };
  effects: (c: Context) => SkillEffect[];
}

interface NodeSpec {
  key: string;
  requires?: [key: string, rank: number][];
  minLevel: number;
  column: number;
  row: number;
}

interface ClassSpec {
  name: Text;
  description: Text;
  /** Which of the world's main attributes (by order) the class is built on. */
  mainIndex: number;
  skills: SkillSpec[];
  tree: NodeSpec[];
}

/** An attribute in a formula: brackets work for any name. */
const ref = (name: string) => `[${name}]`;

const CLASSES: ClassSpec[] = [
  {
    name: ['Warrior', 'Guerrier'],
    description: [
      'A front-line fighter: sturdy, strong and hard to put down.',
      'Un combattant de première ligne : robuste, puissant et difficile à abattre.',
    ],
    mainIndex: 0,
    skills: [
      {
        key: 'power-strike',
        name: ['Power Strike', 'Frappe puissante'],
        description: [
          'A heavy blow on one enemy. Grows with strength.',
          'Un coup lourd sur un ennemi. Progresse avec la force.',
        ],
        rarity: 'common',
        maxRank: 5,
        active: { target: 'one-enemy', cost: 0, cooldown: 0, success: { mode: 'threshold', value: 6 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.5 + rank * 3`,
          },
        ],
      },
      {
        key: 'iron-skin',
        name: ['Iron Skin', 'Peau de fer'],
        description: [
          'Toughened by countless fights: permanently raises maximum life.',
          "Endurci par d'innombrables combats : augmente durablement la vie maximale.",
        ],
        rarity: 'common',
        maxRank: 5,
        effects: (c) => [
          {
            kind: 'modify',
            attribute: c.life,
            amount: 'rank * 5',
            duration: 0,
          },
        ],
      },
      {
        key: 'cleave',
        name: ['Cleave', 'Enchaînement'],
        description: [
          'A sweeping swing that hits every enemy.',
          'Un grand coup circulaire qui touche tous les ennemis.',
        ],
        rarity: 'uncommon',
        maxRank: 5,
        active: { target: 'all-enemies', cost: 3, cooldown: 2, success: { mode: 'threshold', value: 8 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.3 + rank * 2`,
          },
        ],
      },
      {
        key: 'battle-cry',
        name: ['Battle Cry', 'Cri de guerre'],
        description: [
          'Rallies the allies: their main attribute rises for three turns.',
          'Galvanise les alliés : leur attribut principal augmente pendant trois tours.',
        ],
        rarity: 'uncommon',
        maxRank: 3,
        active: { target: 'all-allies', cost: 4, cooldown: 3 },
        effects: (c) => [
          {
            kind: 'modify',
            attribute: c.main,
            amount: 'rank + 1',
            duration: 3,
          },
        ],
      },
      {
        key: 'second-wind',
        name: ['Second Wind', 'Second souffle'],
        description: [
          'Catches your breath and recovers life.',
          'Reprend son souffle et récupère de la vie.',
        ],
        rarity: 'uncommon',
        maxRank: 5,
        active: { target: 'self', cost: 0, cooldown: 4 },
        effects: (c) => [
          { kind: 'heal', attribute: c.life, amount: 'level * 2 + rank * 5' },
        ],
      },
      {
        key: 'mighty-blow',
        name: ['Mighty Blow', 'Coup dévastateur'],
        description: [
          "All the warrior's strength in a single, crushing strike.",
          'Toute la force du guerrier dans une frappe écrasante.',
        ],
        rarity: 'rare',
        maxRank: 3,
        active: { target: 'one-enemy', cost: 6, cooldown: 3, success: { mode: 'threshold', value: 10 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 1.2 + rank * 6`,
          },
        ],
      },
    ],
    tree: [
      { key: 'power-strike', minLevel: 1, column: 0, row: 0 },
      { key: 'iron-skin', minLevel: 1, column: 2, row: 0 },
      {
        key: 'cleave',
        requires: [['power-strike', 2]],
        minLevel: 3,
        column: 0,
        row: 1,
      },
      {
        key: 'battle-cry',
        requires: [['iron-skin', 1]],
        minLevel: 3,
        column: 1,
        row: 1,
      },
      {
        key: 'second-wind',
        requires: [['iron-skin', 2]],
        minLevel: 5,
        column: 2,
        row: 1,
      },
      {
        key: 'mighty-blow',
        requires: [['cleave', 2]],
        minLevel: 7,
        column: 0,
        row: 2,
      },
    ],
  },
  {
    name: ['Mage', 'Mage'],
    description: [
      'A scholar of the arcane: spells that burn, heal and protect.',
      'Un érudit des arcanes : des sorts qui brûlent, soignent et protègent.',
    ],
    mainIndex: 2,
    skills: [
      {
        key: 'arcane-bolt',
        name: ['Arcane Bolt', 'Trait arcanique'],
        description: [
          'A bolt of raw magic on one enemy.',
          'Un trait de magie pure sur un ennemi.',
        ],
        rarity: 'common',
        maxRank: 5,
        active: { target: 'one-enemy', cost: 2, cooldown: 0, success: { mode: 'threshold', value: 5 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.6 + rank * 3`,
          },
        ],
      },
      {
        key: 'healing-light',
        name: ['Healing Light', 'Lumière guérisseuse'],
        description: [
          'A soft light that closes the wounds of one ally.',
          "Une lumière douce qui referme les blessures d'un allié.",
        ],
        rarity: 'common',
        maxRank: 5,
        active: { target: 'one-ally', cost: 3, cooldown: 1 },
        effects: (c) => [
          {
            kind: 'heal',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.5 + rank * 4`,
          },
        ],
      },
      {
        key: 'arcane-focus',
        needsMana: true,
        name: ['Arcane Focus', 'Concentration arcanique'],
        description: [
          'Disciplined study: permanently raises maximum mana.',
          'Une étude rigoureuse : augmente durablement le mana maximal.',
        ],
        rarity: 'common',
        maxRank: 5,
        effects: (c) => [
          {
            kind: 'modify',
            attribute: c.mana!,
            amount: 'rank * 4',
            duration: 0,
          },
        ],
      },
      {
        key: 'fireball',
        name: ['Fireball', 'Boule de feu'],
        description: [
          'An explosion of flames that burns an area.',
          'Une explosion de flammes qui embrase une zone.',
        ],
        rarity: 'uncommon',
        maxRank: 5,
        active: { target: 'area', cost: 5, cooldown: 2, roll: { count: 2, faces: 6 }, success: { mode: 'threshold', value: 6 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.8 + rank * 4`,
          },
        ],
      },
      {
        key: 'mana-shield',
        name: ['Arcane Ward', 'Protection arcanique'],
        description: [
          'A shimmering barrier: your maximum life rises for three turns, more with intelligence.',
          "Une barrière scintillante : votre vie maximale augmente pendant trois tours, davantage avec l'intelligence.",
        ],
        rarity: 'uncommon',
        maxRank: 3,
        active: { target: 'self', cost: 4, cooldown: 4 },
        effects: (c) => [
          {
            kind: 'modify',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.5 + rank * 3`,
            duration: 3,
          },
        ],
      },
      {
        key: 'meteor-storm',
        name: ['Meteor Storm', 'Pluie de météores'],
        description: [
          'Calls down a rain of burning rock on every enemy.',
          'Fait tomber une pluie de roche enflammée sur tous les ennemis.',
        ],
        rarity: 'mythic',
        maxRank: 3,
        active: { target: 'all-enemies', cost: 10, cooldown: 4, roll: { count: 3, faces: 6 }, success: { mode: 'threshold', value: 10 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 1.2 + rank * 6`,
          },
        ],
      },
    ],
    tree: [
      { key: 'arcane-bolt', minLevel: 1, column: 0, row: 0 },
      { key: 'healing-light', minLevel: 1, column: 1, row: 0 },
      { key: 'arcane-focus', minLevel: 1, column: 2, row: 0 },
      {
        key: 'fireball',
        requires: [['arcane-bolt', 2]],
        minLevel: 3,
        column: 0,
        row: 1,
      },
      {
        key: 'mana-shield',
        requires: [['healing-light', 1]],
        minLevel: 4,
        column: 2,
        row: 1,
      },
      {
        key: 'meteor-storm',
        requires: [['fireball', 3]],
        minLevel: 8,
        column: 0,
        row: 2,
      },
    ],
  },
  {
    name: ['Rogue', 'Voleur'],
    description: [
      'Quick and cunning: strikes first, from the shadows.',
      "Vif et rusé : frappe en premier, depuis l'ombre.",
    ],
    mainIndex: 1,
    skills: [
      {
        key: 'quick-stab',
        name: ['Quick Stab', 'Coup rapide'],
        description: [
          'A fast, precise stab on one enemy.',
          'Un coup de dague rapide et précis sur un ennemi.',
        ],
        rarity: 'common',
        maxRank: 5,
        active: { target: 'one-enemy', cost: 1, cooldown: 0, success: { mode: 'threshold', value: 5 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.4 + rank * 2`,
          },
        ],
      },
      {
        key: 'nimble',
        name: ['Nimble', 'Agilité accrue'],
        description: [
          'Light on your feet: permanently raises your main attribute.',
          'Léger sur ses appuis : augmente durablement votre attribut principal.',
        ],
        rarity: 'common',
        maxRank: 5,
        effects: (c) => [
          { kind: 'modify', attribute: c.main, amount: 'rank', duration: 0 },
        ],
      },
      {
        key: 'poisoned-blade',
        name: ['Poisoned Blade', 'Lame empoisonnée'],
        description: [
          'A coated blade that bites deeper than steel alone.',
          "Une lame enduite de poison qui mord plus profond que l'acier seul.",
        ],
        rarity: 'uncommon',
        maxRank: 5,
        active: { target: 'one-enemy', cost: 2, cooldown: 2, success: { mode: 'threshold', value: 8 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 0.3 + rank * 2`,
          },
        ],
      },
      {
        key: 'shadow-step',
        name: ['Shadow Step', "Pas de l'ombre"],
        description: [
          'Slips into the shadows: your main attribute rises for two turns.',
          "Se glisse dans l'ombre : votre attribut principal augmente pendant deux tours.",
        ],
        rarity: 'uncommon',
        maxRank: 3,
        active: { target: 'self', cost: 3, cooldown: 3 },
        effects: (c) => [
          {
            kind: 'modify',
            attribute: c.main,
            amount: 'rank * 2',
            duration: 2,
          },
        ],
      },
      {
        key: 'assassinate',
        name: ['Assassinate', 'Assassinat'],
        description: [
          'A lethal strike on an enemy that never saw you coming.',
          'Une frappe mortelle sur un ennemi qui ne vous a pas vu venir.',
        ],
        rarity: 'rare',
        maxRank: 3,
        active: { target: 'one-enemy', cost: 6, cooldown: 4, success: { mode: 'threshold', value: 12 } },
        effects: (c) => [
          {
            kind: 'damage',
            attribute: c.life,
            amount: `${ref(c.main)} * 1.5 + rank * 5`,
          },
        ],
      },
    ],
    tree: [
      { key: 'quick-stab', minLevel: 1, column: 0, row: 0 },
      { key: 'nimble', minLevel: 1, column: 2, row: 0 },
      {
        key: 'poisoned-blade',
        requires: [['quick-stab', 2]],
        minLevel: 3,
        column: 0,
        row: 1,
      },
      {
        key: 'shadow-step',
        requires: [['nimble', 1]],
        minLevel: 3,
        column: 2,
        row: 1,
      },
      {
        key: 'assassinate',
        requires: [
          ['poisoned-blade', 1],
          ['shadow-step', 1],
        ],
        minLevel: 6,
        column: 1,
        row: 2,
      },
    ],
  },
];

/**
 * The starter classes and skills of a world (Warrior / Mage / Rogue, or their French names), written on its own
 * attributes: damage and healing on the life bar, the main attribute of each class (the world's attributes that
 * are not bars, by order) in the amounts, costs on the mana bar (none when the world has no mana). A world with no
 * attribute gets nothing.
 */
export function buildStarterClasses(
  world: Pick<World, 'attributes' | 'barAttributes'>,
  language: string,
  newId: () => string,
): StarterClasses {
  const nameOf = (id: string | undefined) =>
    world.attributes.find((attribute) => attribute.id === id)?.name;
  const life = nameOf(world.barAttributes.life) ?? world.attributes[0]?.name;
  if (!life) return { skills: [], classes: [] };
  const mana = nameOf(world.barAttributes.mana);
  const others = world.attributes
    .map((a) => a.name)
    .filter((name) => name !== life && name !== mana);
  const mains = others.length ? others : [life];
  const at = language === 'fr' ? 1 : 0;

  const skills: Skill[] = [];
  const classes = CLASSES.map((spec): CharacterClass => {
    const context: Context = {
      main: mains[spec.mainIndex % mains.length],
      life,
      mana,
    };
    const idByKey = new Map<string, string>();
    for (const entry of spec.skills.filter(
      (skill) => !skill.needsMana || mana,
    )) {
      const id = newId();
      idByKey.set(entry.key, id);
      skills.push({
        id,
        name: entry.name[at],
        description: entry.description[at],
        rarity: entry.rarity,
        type: entry.active ? 'active' : 'passive',
        maxRank: entry.maxRank,
        pointCost: 1,
        ...(entry.active
          ? {
              target: entry.active.target,
              cooldown: entry.active.cooldown,
              ...(entry.active.roll ? { roll: entry.active.roll } : {}),
              ...(entry.active.success ? { success: entry.active.success } : {}),
              ...(mana && entry.active.cost > 0
                ? { cost: { attribute: mana, amount: entry.active.cost } }
                : {}),
            }
          : {}),
        effects: entry.effects(context),
      });
    }
    const tree: TreeNode[] = spec.tree
      .filter((node) => idByKey.has(node.key))
      .map((node) => ({
        skillId: idByKey.get(node.key)!,
        requires: (node.requires ?? []).map(([key, rank]) => ({
          skillId: idByKey.get(key)!,
          rank,
        })),
        minLevel: node.minLevel,
        column: node.column,
        row: node.row,
      }));
    return {
      id: newId(),
      name: spec.name[at],
      description: spec.description[at],
      tree,
    };
  });
  return { skills, classes };
}

/**
 * The catalogue with the starter set added: a skill or class whose name is already there is kept as it is (and a
 * new class's tree points at the kept skill), so adding twice changes nothing.
 */
export function mergeStarterClasses(
  existing: StarterClasses,
  starter: StarterClasses,
): StarterClasses {
  const skills = [...existing.skills];
  const classes = [...existing.classes];
  for (const entry of starter.classes) {
    if (classes.some((own) => own.name === entry.name)) continue;
    const keptId = new Map<string, string>();
    for (const node of entry.tree) {
      const skill = starter.skills.find(
        (candidate) => candidate.id === node.skillId,
      )!;
      const same = skills.find((own) => own.name === skill.name);
      keptId.set(skill.id, same ? same.id : skill.id);
      if (!same) skills.push(skill);
    }
    classes.push({
      ...entry,
      tree: entry.tree.map((node) => ({
        ...node,
        skillId: keptId.get(node.skillId)!,
        requires: node.requires.map((r) => ({
          ...r,
          skillId: keptId.get(r.skillId)!,
        })),
      })),
    });
  }
  return { skills, classes };
}
