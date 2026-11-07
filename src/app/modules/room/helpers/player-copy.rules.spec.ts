import { Character } from '../../world/models/world';
import { differingFields, hashPlayerRecord, resolvePick } from './player-copy.rules';

const ada: Character = {
  id: 'c1',
  playerId: 'ada',
  name: 'Ada',
  statPoints: 5,
  money: 20,
  attributes: [{ attributeId: 'life', level: 0, current: 10 }],
  inventory: [],
  rev: 2,
  updatedAt: 1000,
};

describe('player copy rules', () => {
  describe('hashPlayerRecord', () => {
    it('is the same whatever the key order, nested keys included', async () => {
      const shuffled = {
        updatedAt: 1000,
        rev: 2,
        inventory: [],
        attributes: [{ current: 10, level: 0, attributeId: 'life' }],
        money: 20,
        statPoints: 5,
        name: 'Ada',
        playerId: 'ada',
        id: 'c1',
      } as Character;
      expect(await hashPlayerRecord(shuffled)).toBe(await hashPlayerRecord(ada));
    });

    it('ignores rev and updatedAt: equal content, equal hash', async () => {
      expect(await hashPlayerRecord({ ...ada, rev: 9, updatedAt: 5 })).toBe(await hashPlayerRecord(ada));
    });

    it('changes when any content field changes', async () => {
      const base = await hashPlayerRecord(ada);
      expect(await hashPlayerRecord({ ...ada, money: 21 })).not.toBe(base);
      expect(
        await hashPlayerRecord({ ...ada, attributes: [{ attributeId: 'life', level: 1, current: 10 }] }),
      ).not.toBe(base);
    });
  });

  describe('differingFields', () => {
    it('lists the fields that differ, sorted, comparing nested values deeply', () => {
      const other: Character = {
        ...ada,
        money: 99,
        statPoints: 0,
        attributes: [{ attributeId: 'life', level: 1, current: 11 }],
      };
      expect(differingFields(ada, other)).toEqual(['attributes', 'money', 'statPoints']);
    });

    it('is empty for equal records, and ignores rev and updatedAt', () => {
      expect(differingFields(ada, { ...ada })).toEqual([]);
      expect(differingFields(ada, { ...ada, rev: 9, updatedAt: 5 })).toEqual([]);
    });
  });

  describe('resolvePick', () => {
    const player: Character = { ...ada, money: 99, rev: 1, updatedAt: 500 };

    it("keeping the host's version gives it the next rev", () => {
      expect(resolvePick(ada, player, 'host', 7000)).toEqual({ ...ada, rev: 3, updatedAt: 7000 });
    });

    it("using the player's version gives it the next rev", () => {
      expect(resolvePick(ada, player, 'player', 7000)).toEqual({ ...player, rev: 3, updatedAt: 7000 });
    });

    it('goes past the highest rev of the two', () => {
      const ahead: Character = { ...player, rev: 5 };
      expect(resolvePick(ada, ahead, 'host', 7000).rev).toBe(6);
    });
  });
});
