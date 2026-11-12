/** A prompt to paste in any AI chat to get a class (bonuses and skill tree) as JSON for this world. */
export function buildClassPrompt(
  attributeNames: readonly string[],
  language: 'en' | 'fr',
): string {
  const attributes = attributeNames.join(', ');
  const shape =
    '{ "name": string, "description": string, "bonuses": [{ "attribute": string, "value": number }], "tree": [{ "skillId": string, "requires": [{ "skillId": string, "rank": number }], "minLevel": number, "column": number, "row": number }] }';
  if (language === 'fr') {
    return [
      'Crée une classe de personnage pour un jeu de rôle sur table. Réponds uniquement avec du JSON, sans autre texte ni bloc de code, dans cette forme :',
      shape,
      '- name : le nom de la classe. description : quelques phrases.',
      `- bonuses : bonus toujours actifs ; attribute est uniquement l'un de ces attributs : ${attributes} ; value est un entier (négatif pour un malus).`,
      "- tree : l'arbre de compétences. skillId est l'identifiant d'une compétence existante du monde, une seule fois par nœud ; si tu ne les connais pas, laisse tree à [].",
      '- requires : compétences du même arbre à avoir au niveau indiqué (rank, entier de 1 ou plus) ; [] si aucune.',
      '- minLevel : niveau minimal, entier de 1 ou plus. column et row : la case du nœud dans la grille, entiers de 0 ou plus. Au moins un nœud racine (requires : []), et aucune exigence circulaire.',
    ].join('\n');
  }
  return [
    'Create one character class for a tabletop role-playing game. Answer with JSON only, no other text and no code block, in this shape:',
    shape,
    '- name: the class name. description: a few sentences.',
    `- bonuses: always-on bonuses; attribute is only one of these attributes: ${attributes}; value is a whole number (negative for a malus).`,
    '- tree: the skill tree. skillId is the id of an existing skill of the world (leave tree as [] if you do not know them).',
    '- requires: skills of the same tree needed at the given level (rank, a whole number, 1 or more); [] when none.',
    "- minLevel: minimum level, a whole number, 1 or more. column and row: the node's cell in the grid, whole numbers, 0 or more, one node per skill. At least one root node (requires: []), and no circular requirement.",
  ].join('\n');
}
