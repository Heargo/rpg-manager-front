import { Npc } from '../../npc/models/npc';
import { startPicks } from './combat-start.rules';

const npcs = [
  { id: 'gob', name: 'Goblin', roles: ['enemy'] },
  { id: 'elf', name: 'Elf', roles: ['story'] },
  { id: 'mix', name: 'Mix', roles: ['merchant', 'enemy'] },
] as Npc[];

describe('startPicks', () => {
  it('builds the payload with the characters and the NPCs with their counts', () => {
    expect(startPicks(['a', 'b'], ['gob', 'elf'], { gob: 3, elf: 2 }, npcs)).toEqual({
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
