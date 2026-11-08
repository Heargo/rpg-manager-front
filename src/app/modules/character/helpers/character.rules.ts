import { formulaMax } from './character-stats';
import { Character, World } from '../../world/models/world';
import {
  CHARACTER_NAME_MAX_LENGTH,
  CreateCharacterRequest,
  PORTRAIT_MAX_BASE64_LENGTH,
} from '../models/character-api';

/** Translation key of what's wrong with a create request, or null when it's fine. */
export function validateCreateCharacter(request: unknown): string | null {
  if (typeof request !== 'object' || request === null)
    return 'character.errors.invalid';
  const { name, portrait } = request as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim())
    return 'character.errors.nameRequired';
  if (name.trim().length > CHARACTER_NAME_MAX_LENGTH)
    return 'character.errors.nameTooLong';
  if (portrait !== undefined) {
    if (typeof portrait !== 'object' || portrait === null)
      return 'character.errors.invalid';
    const { type, data } = portrait as Record<string, unknown>;
    if (
      typeof type !== 'string' ||
      !type.startsWith('image/') ||
      typeof data !== 'string'
    )
      return 'character.errors.invalid';
    if (data.length > PORTRAIT_MAX_BASE64_LENGTH)
      return 'character.errors.portraitTooLarge';
  }
  return null;
}

/**
 * Translation key of what's wrong with the class a player chose: one is required when the world has classes,
 * must be one of them, and is refused when the world has none. Null when it's fine.
 */
export function validateClassChoice(
  world: Pick<World, 'classes'>,
  classId: unknown,
): string | null {
  if (!world.classes.length)
    return classId === undefined ? null : 'character.errors.noClasses';
  if (classId === undefined) return 'character.errors.classRequired';
  if (
    typeof classId !== 'string' ||
    !world.classes.some((entry) => entry.id === classId)
  )
    return 'character.errors.unknownClass';
  return null;
}

export function normalizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, CHARACTER_NAME_MAX_LENGTH);
}

export function findCharacterOf(
  world: Pick<World, 'characters'>,
  playerId: string,
): Character | undefined {
  return world.characters.find((character) => character.playerId === playerId);
}

/**
 * A new character from the world's defaults: every attribute at its base value (no points spent, current = max),
 * the world's starting stat points and money, an empty inventory.
 */
export function createCharacter(
  world: Pick<World, 'attributes' | 'startingStatPoints' | 'startingMoney'> & {
    startingSkillPoints: number;
  },
  input: {
    playerId: string;
    name: string;
    portraitId?: string;
    classId?: string;
  },
  id: string,
  now: number,
): Character {
  const levels = Object.fromEntries(
    world.attributes.map((attribute) => [attribute.name, 0]),
  );
  return {
    id,
    playerId: input.playerId,
    name: normalizeCharacterName(input.name),
    portraitId: input.portraitId,
    ...(input.classId !== undefined && { classId: input.classId }),
    statPoints: world.startingStatPoints,
    xp: 0,
    level: 1,
    money: world.startingMoney,
    attributes: world.attributes.map((attribute) => ({
      attributeId: attribute.id,
      level: 0,
      current: formulaMax(attribute, 0, levels, 1),
    })),
    inventory: [],
    rev: 1,
    updatedAt: now,
    skillPoints: world.startingSkillPoints,
    skills: [],
  };
}
