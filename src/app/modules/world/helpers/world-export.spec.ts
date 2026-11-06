import { createWorld } from './world.factory';
import { buildWorldExport, parseWorldExport } from './world-export';

const world = createWorld({ name: 'W', attributes: [{ name: 'Life', baseValue: 10 }] }, () => crypto.randomUUID(), 5);

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
