import { World } from '../models/world';
import { createWorld } from './world.factory';

/** The attributes a new world starts with, as translation keys; the first two are the life and mana bars. */
export const DEFAULT_ATTRIBUTES = [
  { nameKey: 'world.defaults.life', baseValue: 10 },
  { nameKey: 'world.defaults.mana', baseValue: 5 },
  { nameKey: 'world.defaults.strength', baseValue: 1 },
  { nameKey: 'world.defaults.agility', baseValue: 1 },
  { nameKey: 'world.defaults.intelligence', baseValue: 1 },
] as const;

export const SANDBOX_WORLD_ID = 'sandbox';

/**
 * The world the tools use outside a game: the default attributes in the active language (through `translate`),
 * life and mana bars, the wizard's starting values. Fixed ids, so the same language always gives the same world.
 * Never saved nor hosted.
 */
export function createSandboxWorld(translate: (key: string) => string): World {
  const attributes = DEFAULT_ATTRIBUTES.map(({ nameKey, baseValue }) => ({
    name: translate(nameKey),
    baseValue,
  }));
  let next = 0;
  const ids = [
    ...attributes.map((_, i) => `${SANDBOX_WORLD_ID}-attribute-${i}`),
    SANDBOX_WORLD_ID,
  ];
  return createWorld(
    {
      name: translate('tools.sandbox.name'),
      attributes,
      barAttributes: { life: attributes[0].name, mana: attributes[1].name },
      startingStatPoints: 5,
      startingMoney: 5000,
    },
    () => ids[next++],
    0,
  );
}
