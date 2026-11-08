import { ItemModifier } from '../../../core/models/item';
import { CharacterClass } from '../../class/models/class';
import { Sheet } from '../../world/models/world';
import { SkillCatalogue } from './character-actions.rules';
import { ClassView } from '../models/character-api';

/** A sheet's class and the skills it needs: those of the class tree plus the ones on the sheet. */
export function classViewOf(
  sheet: Pick<Sheet, 'classId' | 'skills'>,
  catalogue: SkillCatalogue,
): ClassView {
  const characterClass =
    catalogue.classes.find((entry) => entry.id === sheet.classId) ?? null;
  const ids = new Set([
    ...(characterClass?.tree.map((node) => node.skillId) ?? []),
    ...sheet.skills.map((entry) => entry.skillId),
  ]);
  return {
    characterClass,
    skills: catalogue.skills.filter((skill) => ids.has(skill.id)),
  };
}

/** The always-on bonuses of a sheet's class (none without a class, or when the class is gone). */
export function classBonusesOf(
  sheet: Pick<Sheet, 'classId'>,
  classes: CharacterClass[],
): ItemModifier[] {
  return classes.find((entry) => entry.id === sheet.classId)?.bonuses ?? [];
}
