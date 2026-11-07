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

  it('refuses fractional money in starting money, character money and item prices', () => {
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    file.world.startingMoney = 12.5;
    file.world.items = [{ id: 'i', name: 'Sword', rarity: 'common', type: 'object', price: 1.5, modifiers: [] }];
    file.world.characters = [{ id: 'c', playerId: 'p', name: 'Ada', statPoints: 0, money: 0.5, rev: 0, updatedAt: 0, attributes: [], inventory: [] }];

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
