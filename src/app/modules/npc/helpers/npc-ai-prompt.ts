import { NPC_ROLES } from '../models/npc';

/** A prompt to paste in any AI chat to get an NPC as JSON for this world. */
export function buildNpcPrompt(
  attributeNames: readonly string[],
  language: 'en' | 'fr',
): string {
  const roles = NPC_ROLES.join(', ');
  const attributes = attributeNames.join(', ');
  if (language === 'fr') {
    return [
      'Crée un PNJ pour un jeu de rôle sur table. Réponds uniquement avec du JSON, sans autre texte ni bloc de code, dans cette forme :',
      '{ "name": string, "description": string, "roles": string[], "level": number, "xpReward": number, "money": number, "merchant": { "buyRatio": number, "sellRatio": number } }',
      '- name : le nom du PNJ.',
      '- description : quelques phrases (apparence, caractère, rôle dans le monde).',
      `- roles : une ou plusieurs valeurs parmi ${roles} (en anglais, exactement ainsi).`,
      '- level : entier de 1 à 100.',
      "- xpReward : entier de 0 ou plus, l'expérience donnée à la défaite (utile pour un enemy, sinon 0).",
      '- money : entier de 0 ou plus, en pièces de cuivre (100 cuivre = 1 argent, 100 argent = 1 or).',
      '- merchant : seulement si roles contient merchant ; buyRatio et sellRatio sont des nombres de 0 à 10 (1 = prix normal).',
      `Les attributs de ce monde sont : ${attributes}. Choisis un niveau et une description cohérents avec eux ; ils se règlent ensuite dans le formulaire.`,
    ].join('\n');
  }
  return [
    'Create one NPC for a tabletop role-playing game. Answer with JSON only, no other text and no code block, in this shape:',
    '{ "name": string, "description": string, "roles": string[], "level": number, "xpReward": number, "money": number, "merchant": { "buyRatio": number, "sellRatio": number } }',
    "- name: the NPC's name.",
    '- description: a few sentences (looks, personality, place in the world).',
    `- roles: one or more of ${roles} (exactly as written).`,
    '- level: a whole number from 1 to 100.',
    '- xpReward: a whole number, 0 or more, the experience given on defeat (meaningful for an enemy, otherwise 0).',
    '- money: a whole number of copper, 0 or more (100 copper = 1 silver, 100 silver = 1 gold).',
    '- merchant: only when roles contains merchant; buyRatio and sellRatio are numbers from 0 to 10 (1 = normal price).',
    `The attributes of this world are: ${attributes}. Pick a level and a description that fit them; they are tuned afterwards in the form.`,
  ].join('\n');
}
