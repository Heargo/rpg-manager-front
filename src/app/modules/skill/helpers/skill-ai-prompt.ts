import { ITEM_RARITIES } from '../../../core/models/item';
import { SKILL_MAX_RANK, SKILL_TARGETS, SKILL_TYPES } from '../models/skill';

/** A prompt to paste in any AI chat to get a skill as JSON for this world. */
export function buildSkillPrompt(
  attributeNames: readonly string[],
  language: 'en' | 'fr',
): string {
  const rarities = ITEM_RARITIES.join(', ');
  const types = SKILL_TYPES.join(', ');
  const targets = SKILL_TARGETS.join(', ');
  const attributes = attributeNames.join(', ');
  const shape =
    '{ "name": string, "description": string, "rarity": string, "type": string, "maxRank": number, "pointCost": number, "target": string, "cost": { "attribute": string, "amount": number }, "cooldown": number, "effects": [{ "kind": string, "attribute": string, "amount": string, "duration": number }] }';
  if (language === 'fr') {
    return [
      'Crée une compétence pour un jeu de rôle sur table. Réponds uniquement avec du JSON, sans autre texte ni bloc de code, dans cette forme :',
      shape,
      `- rarity : parmi ${rarities}.`,
      `- type : parmi ${types}. Une compétence passive n'a ni target, ni cost, ni cooldown.`,
      `- maxRank : entier de 1 à ${SKILL_MAX_RANK}. pointCost : points de compétence par rang, entier de 1 ou plus.`,
      `- target (active seulement) : parmi ${targets}.`,
      "- cost (active seulement) : attribute est le nom d'un attribut, amount un entier de 0 ou plus, pris sur sa valeur courante du lanceur.",
      '- cooldown (active seulement) : nombre de tours, 0 = aucun.',
      '- effects : liste ; kind vaut damage, heal ou modify. amount est une formule en texte utilisant rank (le rang de la compétence), level (le niveau) et les noms d\'attributs du lanceur (leur maximum), par exemple "5 + rank * 3". duration (en tours) n\'existe que pour modify.',
      `- attribute (dans cost et effects) : uniquement parmi ces attributs : ${attributes}.`,
    ].join('\n');
  }
  return [
    'Create one skill for a tabletop role-playing game. Answer with JSON only, no other text and no code block, in this shape:',
    shape,
    `- rarity: one of ${rarities}.`,
    `- type: one of ${types}. A passive skill has no target, cost or cooldown.`,
    `- maxRank: a whole number from 1 to ${SKILL_MAX_RANK}. pointCost: skill points per rank, X (active only): one of ${targets}.`,
    "- cost (active only): attribute is an attribute name, amount a whole number, 0 or more, taken from the caster's current value.",
    '- cooldown (active only): number of turns, 0 = none.',
    '- effects: a list; kind is damage, heal or modify. amount is a formula as text using rank (the skill rank), level (the level) and the caster\'s attribute names (their maximum), for example "5 + rank * 3". duration (in turns) only exists for modify.',
    `- attribute (in cost and effects): only one of these attributes: ${attributes}.`,
  ].join('\n');
}
