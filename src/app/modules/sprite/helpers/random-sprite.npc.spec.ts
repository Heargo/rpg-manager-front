import {
  baseItemVocabulary,
  baseNpcVocabulary,
} from '../../../../testing/base-vocabulary';
import { seededRandomSource } from '../../../core/generators/random-source';
import { pickSprite } from './random-sprite';

const npcVocabulary = baseNpcVocabulary('en');
const itemVocabulary = baseItemVocabulary('en');

const npcSprite = (key: string, kinds: string[]) => ({
  key,
  kinds,
  domain: 'npcs' as const,
});
const itemSprite = (key: string, kinds: string[]) => ({
  key,
  kinds,
  domain: 'items' as const,
  type: 'equipment' as const,
  slot: 'weapon1' as const,
});

const pool = [
  npcSprite('wolf-1', ['wolf']),
  npcSprite('wolf-2', ['wolf']),
  npcSprite('beast-1', ['beast']),
  npcSprite('noble-1', ['noble']),
  itemSprite('sword-1', ['sword']),
  itemSprite('wolf-item', ['wolf']),
  itemSprite('beast-item', ['beast']),
];

const npcKeys = (kind: string | undefined, candidates = pool, runs = 40) =>
  new Set(
    Array.from(
      { length: runs },
      (_, i) =>
        pickSprite(
          candidates as never,
          { domain: 'npcs', kind } as never,
          npcVocabulary as never,
          seededRandomSource(`n${i}`),
        )?.key,
    ),
  );

describe('pickSprite for an NPC', () => {
  it('draws among the NPC sprites of the NPC kind', () => {
    expect(npcKeys('wolf')).toEqual(new Set(['wolf-1', 'wolf-2']));
  });

  it('draws a sprite of a parent kind for a child kind, the nearest level first', () => {
    expect(npcKeys('boar')).toEqual(new Set(['beast-1']));
    expect(npcKeys('wolf')).not.toContain('beast-1');
  });

  it('falls back to any NPC sprite when no sprite matches the kind, and never to an item sprite', () => {
    expect(npcKeys('merchant')).toEqual(
      new Set(['wolf-1', 'wolf-2', 'beast-1', 'noble-1']),
    );
    expect(npcKeys(undefined)).toEqual(
      new Set(['wolf-1', 'wolf-2', 'beast-1', 'noble-1']),
    );
  });

  it('is undefined when there is no NPC sprite, even with item sprites around', () => {
    const itemsOnly = pool.filter((c) => c.domain === 'items');
    expect(npcKeys('wolf', itemsOnly)).toEqual(new Set([undefined]));
  });

  it('gives the same sprite for the same seed, always an NPC sprite of the kind', () => {
    for (let i = 0; i < 10; i++) {
      const draw = () =>
        pickSprite(
          pool as never,
          { domain: 'npcs', kind: 'wolf' } as never,
          npcVocabulary as never,
          seededRandomSource(`same${i}`),
        )?.key;
      expect(draw()).toBe(draw());
      expect(draw()).toMatch(/^wolf-\d$/);
    }
  });

  it('never draws an NPC sprite for an item', () => {
    const mixed = [
      itemSprite('sword-1', ['sword']),
      npcSprite('sword-npc', ['sword']),
      npcSprite('npc-any', ['wolf']),
    ];
    const draw = (item: object) =>
      new Set(
        Array.from(
          { length: 40 },
          (_, i) =>
            pickSprite(
              mixed as never,
              item as never,
              itemVocabulary,
              seededRandomSource(`i${i}`),
            )?.key,
        ),
      );
    expect(
      draw({ name: 'Lame', type: 'equipment', slot: 'weapon1', kind: 'sword' }),
    ).toEqual(new Set(['sword-1']));
    expect(draw({ name: 'Truc', type: 'item', slot: 'none' })).toEqual(
      new Set(['sword-1']),
    );
  });
});
