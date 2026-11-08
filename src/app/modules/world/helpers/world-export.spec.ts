import { createWorld } from './world.factory';
import { buildWorldExport, parseWorldExport } from './world-export';

const world = createWorld({ name: 'W', attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }] }, () => crypto.randomUUID(), 5);

describe('world export', () => {
  it('round-trips through JSON', () => {
    const file = buildWorldExport(world, { abc: { type: 'image/webp', data: 'AAAA' } }, 9);
    const parsed = parseWorldExport(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, value: file });
  });

  it('rejects text that is not JSON or not an export', () => {
    expect(parseWorldExport('nope')).toEqual({ ok: false, errors: ['the file is not valid JSON'] });
    expect(parseWorldExport('{"format":"other"}')).toEqual({ ok: false, errors: ['the file is not a world export'] });
  });

  it('round-trips the max level and refuses an invalid one', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport({ ...world, maxLevel: 30 }, {}, 9)));
    expect(file.world.maxLevel).toBe(30);
    expect(parseWorldExport(JSON.stringify(file)).ok).toBe(true);
    for (const bad of [1, 101, 2.5, '20', undefined]) {
      file.world.maxLevel = bad;
      const parsed = parseWorldExport(JSON.stringify(file));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.errors).toContain('world.maxLevel must be an integer from 2 to 100');
    }
  });

  it('refuses fractional money in starting money, character money and item prices', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    file.world.startingMoney = 12.5;
    file.world.items = [{ id: 'i', name: 'Sword', rarity: 'common', type: 'object', price: 1.5, modifiers: [] }];
    file.world.characters = [{ id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, money: 0.5, rev: 0, updatedAt: 0, attributes: [], inventory: [], skillPoints: 0, skills: [] }];

    const parsed = parseWorldExport(JSON.stringify(file));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        'world.startingMoney must be an integer',
        'world.items[0].price must be an integer',
        'world.characters[0].money must be an integer',
      ]),
    );
  });

  it('refuses attributes without a valid formula', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    delete file.world.attributes[0].formula;
    const missing = parseWorldExport(JSON.stringify(file));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors).toContain('world.attributes[0].formula is invalid');

    file.world.attributes[0].formula = { preset: 'custom', expression: 'base +' };
    const broken = parseWorldExport(JSON.stringify(file));
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.errors).toContain('world.attributes[0].formula is invalid');

    file.world.attributes[0].formula = { preset: 'custom', expression: '('.repeat(10000) + '1' + ')'.repeat(10000) };
    const deep = parseWorldExport(JSON.stringify(file));
    expect(deep.ok).toBe(false);
    if (!deep.ok) expect(deep.errors).toContain('world.attributes[0].formula is invalid');

    file.world.attributes[0].formula = { preset: 'diminishing', step: 2 };
    expect(parseWorldExport(JSON.stringify(file)).ok).toBe(true);
  });

  it('round-trips the level curve and refuses an invalid one', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    expect(file.world.levelCurve).toEqual({ preset: 'growing' });
    expect(file.world.statPointsPerLevel).toBe(3);

    file.world.levelCurve = { preset: 'custom', expression: 'level +' };
    const broken = parseWorldExport(JSON.stringify(file));
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.errors).toContain('world.levelCurve is invalid');

    file.world.levelCurve = { preset: 'custom', expression: 'level * 50' };
    file.world.statPointsPerLevel = -2;
    const negative = parseWorldExport(JSON.stringify(file));
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.errors).toContain('world.statPointsPerLevel must be a non-negative integer');

    file.world.statPointsPerLevel = 4;
    expect(parseWorldExport(JSON.stringify(file)).ok).toBe(true);
  });

  it('lists what is wrong in a damaged file', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, { x: { type: 'text/html', data: '' } }, 9)));
    file.version = 3;
    delete file.world.name;
    file.world.items = [{ id: 'i', name: 'Sword', rarity: 'epic', type: 'equipment', modifiers: [] }];

    const parsed = parseWorldExport(JSON.stringify(file));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        'unsupported version 3',
        'world.name must be a string',
        'world.items[0].rarity is unknown',
        'images.x is not an image',
      ]),
    );
  });
});

describe('world import of character xp and level', () => {
  const withCharacter = (changes: Record<string, unknown>) => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    file.world.characters = [
      { id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 0, level: 1, money: 0, rev: 0, updatedAt: 0, attributes: [], inventory: [], skillPoints: 0, skills: [], ...changes },
    ];
    return parseWorldExport(JSON.stringify(file));
  };

  it('accepts a valid xp and level', () => {
    expect(withCharacter({ xp: 250, level: 2 }).ok).toBe(true);
  });

  it.each([-1, 1.5, '3'])('refuses xp %s', (xp) => {
    const result = withCharacter({ xp });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('world.characters[0].xp must be an integer of 0 or more');
  });

  it.each([0, -1, 1.5, '2'])('refuses level %s', (level) => {
    const result = withCharacter({ level });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('world.characters[0].level must be an integer of 1 or more');
  });

  it('refuses formulas that fail when evaluated', () => {
    for (const expression of ['base + level/0', 'level - 5']) {
      const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
      file.world.attributes[0].formula = { preset: 'custom', expression };
      const parsed = parseWorldExport(JSON.stringify(file));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.errors).toContain('world.attributes[0].formula is invalid');
    }
  });
});

describe('world export of attribute caps', () => {
  const capped = createWorld(
    { name: 'W', attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 }, ...({ cap: 1000 } as object) }] },
    () => crypto.randomUUID(),
    5,
  );
  const reparse = (change: (file: any) => void) => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(capped, {}, 9)));
    change(file);
    return parseWorldExport(JSON.stringify(file));
  };

  it('round-trips the cap', () => {
    const file = buildWorldExport(capped, {}, 9);
    expect((file.world.attributes[0] as { cap?: number }).cap).toBe(1000);
    const parsed = parseWorldExport(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, value: file });
  });

  it('refuses a cap that is not an integer of at least 1, or is below the base value', () => {
    for (const cap of [0, -1, 2.5, '100', 9]) {
      const parsed = reparse((file) => (file.world.attributes[0].cap = cap));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.errors).toContain('world.attributes[0].cap is invalid');
    }
  });

  it('accepts an attribute without a cap', () => {
    expect(reparse((file) => delete file.world.attributes[0].cap).ok).toBe(true);
  });
});

describe('world import of sheet skills and class', () => {
  const character = { id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, xp: 0, level: 1, money: 0, rev: 0, updatedAt: 0, attributes: [], inventory: [], skillPoints: 3, skills: [{ skillId: 's1', rank: 2 }], classId: 'warrior' };
  const parse = (changes: Record<string, unknown>, remove: string[] = []) => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    const next: Record<string, unknown> = { ...character, ...changes };
    for (const key of remove) delete next[key];
    file.world.characters = [next];
    return parseWorldExport(JSON.stringify(file));
  };

  it('refuses an old export without skillPoints or skills, and keeps the new fields of a valid one', () => {
    const valid = parse({});
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.value.world.characters[0]).toMatchObject({ classId: 'warrior', skillPoints: 3, skills: [{ skillId: 's1', rank: 2 }] });
    expect(parse({}, ['classId']).ok).toBe(true);
    const noPoints = parse({}, ['skillPoints']);
    expect(noPoints.ok).toBe(false);
    if (!noPoints.ok) expect(noPoints.errors).toContain('world.characters[0].skillPoints must be an integer of 0 or more');
    const noSkills = parse({}, ['skills']);
    expect(noSkills.ok).toBe(false);
    if (!noSkills.ok) expect(noSkills.errors).toContain('world.characters[0].skills must be a list');
  });

  it('refuses a malformed classId, skillPoints or skills entry', () => {
    const badClass = parse({ classId: 5 });
    expect(badClass.ok).toBe(false);
    if (!badClass.ok) expect(badClass.errors).toContain('world.characters[0].classId must be a string');
    const badPoints = parse({ skillPoints: -1 });
    expect(badPoints.ok).toBe(false);
    const badSkill = parse({ skills: [{ skillId: 's1', rank: 0 }] });
    expect(badSkill.ok).toBe(false);
    if (!badSkill.ok) expect(badSkill.errors).toContain('world.characters[0].skills[0].rank must be an integer of 1 or more');
    const noId = parse({ skills: [{ rank: 1 }] });
    expect(noId.ok).toBe(false);
    if (!noId.ok) expect(noId.errors).toContain('world.characters[0].skills[0].skillId must be a string');
  });

  describe('NPCs', () => {
    const goblin = {
      id: 'n1', name: 'Goblin', statPoints: 0, xp: 0, level: 3, money: 5, updatedAt: 1, skillPoints: 0, skills: [],
      attributes: [], inventory: [], roles: ['enemy'], description: 'Green.', xpReward: 20, loot: [],
    };
    const exported = (npcs: unknown) => {
      const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
      if (npcs === undefined) delete file.world.npcs;
      else file.world.npcs = npcs;
      return parseWorldExport(JSON.stringify(file));
    };

    it('round-trips the NPCs, merchant fields included', () => {
      const npcs = [goblin, { ...goblin, id: 'n2', roles: ['merchant'], merchant: { buyRatio: 1.5, sellRatio: 0.25 } }];
      const file = buildWorldExport({ ...world, npcs: npcs as never }, {}, 9);
      expect(parseWorldExport(JSON.stringify(file))).toEqual({ ok: true, value: file });
    });

    it('refuses an export without npcs', () => {
      const parsed = exported(undefined);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.errors).toContain('world.npcs must be a list');
    });

    it('refuses a malformed NPC', () => {
      for (const bad of [
        { ...goblin, roles: [] },
        { ...goblin, roles: ['boss'] },
        { ...goblin, xpReward: -1 },
        { ...goblin, loot: 'sword' },
        { ...goblin, description: undefined },
        { ...goblin, skills: undefined },
        { ...goblin, merchant: { buyRatio: 11 } },
        { ...goblin, name: 3 },
      ]) {
        expect(exported([bad]).ok).toBe(false);
      }
    });
  });
});
