import { Npc } from '../../npc/models/npc';
import { Character } from '../../world/models/world';
import { setupTokens, startPicks, startSlots } from './combat-start.rules';

const npcs = [
  { id: 'gob', name: 'Goblin', roles: ['enemy'] },
  { id: 'elf', name: 'Elf', roles: ['story'] },
  { id: 'mix', name: 'Mix', roles: ['merchant', 'enemy'] },
] as Npc[];

describe('startPicks', () => {
  it('builds the payload with the characters and the NPCs with their counts', () => {
    expect(
      startPicks(['a', 'b'], ['gob', 'elf'], { gob: 3, elf: 2 }, npcs),
    ).toEqual({
      characterIds: ['a', 'b'],
      npcs: [
        { npcId: 'gob', count: 3, side: 'enemy' },
        { npcId: 'elf', count: 2, side: 'ally' },
      ],
    });
  });

  it('defaults the count to 1', () => {
    expect(startPicks([], ['gob'], {}, npcs).npcs).toEqual([
      { npcId: 'gob', count: 1, side: 'enemy' },
    ]);
  });

  it('clamps the count between 1 and 20', () => {
    const picks = startPicks([], ['gob', 'elf'], { gob: 0, elf: 99 }, npcs);
    expect(picks.npcs.map((n) => n.count)).toEqual([1, 20]);
  });

  it('puts an NPC with the enemy role among the enemies, whatever its other roles', () => {
    expect(startPicks([], ['mix'], {}, npcs).npcs[0].side).toBe('enemy');
  });

  it('drops unknown NPC ids', () => {
    expect(startPicks([], ['ghost', 'gob'], { ghost: 4 }, npcs).npcs).toEqual([
      { npcId: 'gob', count: 1, side: 'enemy' },
    ]);
  });
});

const characters = [
  { id: 'ada', name: 'Ada', portraitId: 'img-ada' },
  { id: 'bob', name: 'Bob' },
] as Character[];
const gobNpcs = [
  { id: 'gob', name: 'Goblin', roles: ['enemy'], portraitId: 'img-gob' },
  { id: 'elf', name: 'Elf', roles: ['story'] },
] as Npc[];
const grid = { columns: 10, rows: 10 };

describe('startPicks with positions', () => {
  it('passes the positions through', () => {
    const positions = { 'character:a': { x: 3, y: 4 } };
    expect(startPicks(['a'], [], {}, npcs, positions)).toEqual({
      characterIds: ['a'],
      npcs: [],
      positions,
    });
  });

  it('has no positions when none are given', () => {
    expect(startPicks(['a'], [], {}, npcs).positions).toBeUndefined();
  });
});

describe('startSlots', () => {
  it('has a slot per character and per NPC copy, with stable keys', () => {
    const picks = startPicks(
      ['ada', 'bob'],
      ['gob', 'elf'],
      { gob: 2 },
      gobNpcs,
    );
    const slots = startSlots(picks, characters, gobNpcs);
    expect(slots.map((s) => [s.key, s.side])).toEqual([
      ['character:ada', 'party'],
      ['character:bob', 'party'],
      ['npc:gob:1', 'enemy'],
      ['npc:gob:2', 'enemy'],
      ['npc:elf:1', 'ally'],
    ]);
  });

  it('carries a name and the portrait when there is one', () => {
    const picks = startPicks(['ada', 'bob'], ['gob'], {}, gobNpcs);
    const slots = startSlots(picks, characters, gobNpcs);
    expect(slots[0]).toMatchObject({ name: 'Ada', portraitId: 'img-ada' });
    expect(slots[1].portraitId).toBeUndefined();
    expect(slots[2]).toMatchObject({ portraitId: 'img-gob' });
    expect(slots[2].name).toContain('Goblin');
  });

  it('skips unknown characters', () => {
    const picks = startPicks(['ghost', 'ada'], [], {}, gobNpcs);
    expect(startSlots(picks, characters, gobNpcs).map((s) => s.key)).toEqual([
      'character:ada',
    ]);
  });
});

describe('setupTokens', () => {
  const slots = startSlots(
    startPicks(['ada', 'bob'], ['gob'], { gob: 2 }, gobNpcs),
    characters,
    gobNpcs,
  );
  const cells = (tokens: { key: string; x: number; y: number }[]) =>
    Object.fromEntries(tokens.map((t) => [t.key, { x: t.x, y: t.y }]));

  it('defaults the party to the left columns and the enemies to the right, one cell each', () => {
    expect(cells(setupTokens(slots, {}, grid))).toEqual({
      'character:ada': { x: 0, y: 0 },
      'character:bob': { x: 0, y: 1 },
      'npc:gob:1': { x: 9, y: 0 },
      'npc:gob:2': { x: 9, y: 1 },
    });
  });

  it('keeps a chosen cell and gives the others a default that avoids it', () => {
    const shown = cells(
      setupTokens(slots, { 'character:bob': { x: 0, y: 0 } }, grid),
    );
    expect(shown['character:bob']).toEqual({ x: 0, y: 0 });
    expect(shown['character:ada']).toEqual({ x: 0, y: 1 });
  });

  it('falls back to the default for a chosen cell out of bounds or already held', () => {
    const shown = cells(
      setupTokens(
        slots,
        {
          'character:ada': { x: 10, y: 0 },
          'npc:gob:1': { x: 5, y: 5 },
          'npc:gob:2': { x: 5, y: 5 },
        },
        grid,
      ),
    );
    expect(shown['character:ada']).toEqual({ x: 0, y: 0 });
    expect(shown['npc:gob:1']).toEqual({ x: 5, y: 5 });
    expect(shown['npc:gob:2']).toEqual({ x: 9, y: 0 });
  });

  it('never puts two tokens on one cell and has a cell for every slot', () => {
    const shown = setupTokens(slots, { 'character:ada': { x: 9, y: 0 } }, grid);
    expect(shown).toHaveLength(4);
    expect(new Set(shown.map((t) => `${t.x},${t.y}`)).size).toBe(4);
  });

  it('ignores chosen cells of slots that no longer exist', () => {
    const shown = setupTokens(
      slots,
      { 'character:ghost': { x: 0, y: 0 } },
      grid,
    );
    expect(shown.map((t) => t.key)).toEqual(slots.map((s) => s.key));
    expect(cells(shown)['character:ada']).toEqual({ x: 0, y: 0 });
  });
});
