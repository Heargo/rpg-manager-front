import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { validatePack as validate } from './pack';

// Typed loosely: the v2 fields do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);

const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);

const gradient = (...stops: [number, string][]) => ({
  gradient: stops.map(([position, color]) => ({ position, color })),
});

const valid = (): Record<string, any> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des choses',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  tints: {
    fire: gradient([0, '#5a0a0a'], [0.5, '#f97316'], [1, '#fde047']),
  },
  domains: {
    items: {
      kinds: {
        equipment: { type: 'equipment' },
        weapon: { parent: 'equipment', slot: 'weapon1' },
        sword: { parent: 'weapon' },
        rapier: { parent: 'sword' },
        consumable: { type: 'consumable' },
        potion: { parent: 'consumable' },
      },
      texts: 'generators/items.json',
    },
    npcs: { texts: 'generators/npcs.json' },
    skills: { texts: 'generators/skills.json' },
    classes: { texts: 'generators/classes.json' },
  },
  common: 'generators/common.json',
  sprites: [
    { id: 'sword', label: 'Épée', domain: 'items', kinds: ['sword'], kind: 'masked', image: 'sprites/sword.png', materials: 'sprites/sword.json' },
    { id: 'potion', label: 'Potion', domain: 'items', kinds: ['potion'], kind: 'colored', image: 'sprites/potion.png' },
  ],
});

const errorsOf = (json: unknown): string[] => {
  // A rejection only means something if the untouched fixture is accepted.
  expect(validatePack(valid()).ok, 'the baseline fixture must be valid').toBe(true);
  const result = validatePack(json);
  if (result.ok) throw new Error('expected an invalid pack');
  return result.errors;
};

const mentions = (errors: string[], ...words: string[]) =>
  errors.some((e) => words.every((w) => e.includes(w)));

describe('validatePack format 2', () => {
  it('accepts a complete manifest with domains, tints, common and kinded sprites, without warnings', () => {
    const result = validatePack(valid());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
    expect(result.value.format).toBe(2);
    expect(result.value.domains?.items?.kinds?.['rapier']).toEqual({ parent: 'sword' });
    expect(result.value.domains?.items?.texts).toBe('generators/items.json');
    expect(result.value.tints?.['fire'].gradient).toHaveLength(3);
    expect(result.value.sprites[0]).toMatchObject({ domain: 'items', kinds: ['sword'] });
  });

  it('rejects format 1', () => {
    expect(mentions(errorsOf({ ...valid(), format: 1 }), 'format')).toBe(true);
  });

  it('accepts a minimal manifest without tints, domains, common or sprites', () => {
    const json = valid();
    delete json['tints'];
    delete json['domains'];
    delete json['common'];
    json['sprites'] = [];
    expect(validatePack(json).ok).toBe(true);
  });

  it('accepts a domain with kinds only, and a parent that the pack does not declare', () => {
    const json = valid();
    json['domains'] = { items: { kinds: { glowblade: { parent: 'weapon' } } } };
    delete json['common'];
    json['sprites'] = [
      { id: 'glow', label: 'Lueur', domain: 'items', kinds: ['glowblade', 'declared-elsewhere'], kind: 'grayscale', image: 'sprites/glow.png' },
    ];
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects a common path that leaves the pack', () => {
    for (const path of ['/etc/x.json', '../x.json', 'https://evil.test/x.json', 'a\\b.json']) {
      expect(mentions(errorsOf({ ...valid(), common: path }), 'common'), path).toBe(true);
    }
  });

  it('rejects a texts path that leaves the pack', () => {
    for (const path of ['/etc/x.json', '../x.json', 'https://evil.test/x.json']) {
      const json = valid();
      json['domains'].npcs.texts = path;
      expect(mentions(errorsOf(json), 'npcs', 'texts'), path).toBe(true);
    }
  });
});

describe('validatePack neutral packs', () => {
  const neutral = (): Record<string, any> => {
    const json = valid();
    delete json['language'];
    delete json['common'];
    delete json['domains'].items.texts;
    delete json['domains'].npcs;
    delete json['domains'].skills;
    delete json['domains'].classes;
    return json;
  };

  it('accepts a pack without language that holds sprites, kinds and tints', () => {
    const result = validatePack(neutral());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.language).toBeUndefined();
    expect(result.value.sprites).toHaveLength(2);
  });

  it('rejects common in a pack without language', () => {
    expect(mentions(errorsOf({ ...neutral(), common: 'generators/common.json' }), 'common')).toBe(true);
  });

  it('rejects texts in a pack without language', () => {
    const json = neutral();
    json['domains'].items.texts = 'generators/items.json';
    expect(mentions(errorsOf(json), 'texts')).toBe(true);
    const npcs = neutral();
    npcs['domains'].npcs = { texts: 'generators/npcs.json' };
    expect(mentions(errorsOf(npcs), 'texts')).toBe(true);
  });

  it('still rejects a language that is present but unknown', () => {
    expect(mentions(errorsOf({ ...neutral(), language: 'de' }), 'language')).toBe(true);
  });
});

describe('validatePack domains', () => {
  it('ignores a domain the app does not know and warns about it', () => {
    const json = valid();
    json['domains'].vehicles = { kinds: { car: { type: 'wheels' } }, texts: 'generators/vehicles.json' };
    const result = validatePack(json);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('vehicles');
  });

  it('rejects an unknown field inside a known domain', () => {
    const json = valid();
    json['domains'].items.kindz = {};
    expect(mentions(errorsOf(json), 'kindz')).toBe(true);
  });

  it('rejects an unknown field inside a kind', () => {
    const json = valid();
    json['domains'].items.kinds.sword.colour = 'red';
    expect(mentions(errorsOf(json), 'sword', 'colour')).toBe(true);
  });

  it('rejects a kind id that is not kebab-case', () => {
    for (const id of ['Sword', 'war_hammer', '-sword', 'a b']) {
      const json = valid();
      json['domains'].items.kinds[id] = { parent: 'weapon' };
      expect(mentions(errorsOf(json), id), id).toBe(true);
    }
  });

  it('accepts a multi-word kebab-case kind id', () => {
    const json = valid();
    json['domains'].items.kinds['war-hammer'] = { parent: 'weapon' };
    expect(validatePack(json).ok).toBe(true);
  });
});

describe('validatePack item kinds', () => {
  it('rejects a type on a kind that has a parent', () => {
    const json = valid();
    json['domains'].items.kinds.sword.type = 'equipment';
    expect(mentions(errorsOf(json), 'sword', 'type')).toBe(true);
  });

  it('rejects a type that items do not have', () => {
    const json = valid();
    json['domains'].items.kinds.equipment.type = 'spaceship';
    expect(mentions(errorsOf(json), 'equipment', 'type')).toBe(true);
  });

  it('rejects a slot that items do not have', () => {
    const json = valid();
    json['domains'].items.kinds.weapon.slot = 'tail';
    expect(mentions(errorsOf(json), 'weapon', 'slot')).toBe(true);
  });

  it('rejects a slot on a chain that is not equipment', () => {
    const onChild = valid();
    onChild['domains'].items.kinds.potion.slot = 'head';
    expect(mentions(errorsOf(onChild), 'potion', 'slot')).toBe(true);
    const onRoot = valid();
    onRoot['domains'].items.kinds.consumable.slot = 'head';
    expect(mentions(errorsOf(onRoot), 'consumable', 'slot')).toBe(true);
  });

  it('accepts a slot on an equipment root and on an equipment chain', () => {
    const json = valid();
    json['domains'].items.kinds.equipment.slot = 'chest';
    json['domains'].items.kinds.rapier.slot = 'weapon2';
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects a cycle inside the pack, naming a kind of the loop', () => {
    const json = valid();
    json['domains'].items.kinds['ring-a'] = { parent: 'ring-b' };
    json['domains'].items.kinds['ring-b'] = { parent: 'ring-a' };
    const errors = errorsOf(json);
    expect(errors.some((e) => /cycle/i.test(e) && e.includes('ring-a'))).toBe(true);
  });

  it('rejects a kind that is its own parent', () => {
    const json = valid();
    json['domains'].items.kinds.loop = { parent: 'loop' };
    expect(errorsOf(json).some((e) => /cycle/i.test(e) && e.includes('loop'))).toBe(true);
  });
});

describe('validatePack tints', () => {
  const withTint = (tint: unknown, id = 'ember') => {
    const json = valid();
    json['tints'][id] = tint;
    return json;
  };

  it('accepts a gradient of two stops from 0 to 1', () => {
    expect(validatePack(withTint(gradient([0, '#000000'], [1, '#ffffff']))).ok).toBe(true);
  });

  it('rejects a tint id that is not kebab-case', () => {
    expect(mentions(errorsOf(withTint(gradient([0, '#000000'], [1, '#ffffff']), 'Ember')), 'Ember')).toBe(true);
  });

  it('rejects a gradient with fewer than 2 stops', () => {
    expect(mentions(errorsOf(withTint(gradient([0, '#000000']))), 'ember')).toBe(true);
    expect(mentions(errorsOf(withTint({ gradient: [] })), 'ember')).toBe(true);
    expect(mentions(errorsOf(withTint({})), 'ember')).toBe(true);
  });

  it('rejects a stop position outside [0, 1]', () => {
    expect(mentions(errorsOf(withTint(gradient([-0.1, '#000000'], [1, '#ffffff']))), 'ember')).toBe(true);
    expect(mentions(errorsOf(withTint(gradient([0, '#000000'], [1.5, '#ffffff']))), 'ember')).toBe(true);
  });

  it('rejects a colour that is not #rrggbb', () => {
    for (const color of ['red', '#fff', '#12345g', 'rgb(0,0,0)', '000000']) {
      expect(mentions(errorsOf(withTint(gradient([0, '#000000'], [1, color]))), 'ember'), color).toBe(true);
    }
  });
});

describe('validatePack sprites with kinds', () => {
  const withSprite = (patch: Record<string, unknown>) => {
    const json = valid();
    json['sprites'][0] = { ...json['sprites'][0], ...patch };
    return json;
  };

  it('requires a domain the app knows', () => {
    expect(mentions(errorsOf(withSprite({ domain: 'vehicles' })), 'sprite "sword"', 'domain')).toBe(true);
    const json = valid();
    delete json['sprites'][0].domain;
    expect(mentions(errorsOf(json), 'sprite "sword"', 'domain')).toBe(true);
  });

  it('requires a non-empty list of kinds', () => {
    expect(mentions(errorsOf(withSprite({ kinds: [] })), 'sprite "sword"', 'kinds')).toBe(true);
    expect(mentions(errorsOf(withSprite({ kinds: 'sword' })), 'sprite "sword"', 'kinds')).toBe(true);
    const json = valid();
    delete json['sprites'][0].kinds;
    expect(mentions(errorsOf(json), 'sprite "sword"', 'kinds')).toBe(true);
  });

  it('requires kebab-case kinds', () => {
    expect(mentions(errorsOf(withSprite({ kinds: ['Sword'] })), 'sprite "sword"', 'kinds')).toBe(true);
    expect(mentions(errorsOf(withSprite({ kinds: ['sword', 'a b'] })), 'sprite "sword"', 'kinds')).toBe(true);
  });

  it('no longer asks for a type or a slot', () => {
    expect(validatePack(valid()).ok).toBe(true);
  });
});

describe.each(['base-fr', 'base-en'] as const)('the real %s pack in format 2', (id) => {
  const read = (): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  const validated = () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    return result;
  };

  it('is a valid format 2 manifest without warnings', () => {
    const result = validated();
    expect(result.value.format).toBe(2);
    expect(result.warnings).toEqual([]);
    expect(read()['generators']).toBeUndefined();
  });

  it('declares the roots equipment, consumable and item with their type', () => {
    const kinds = validated().value.domains?.items?.kinds ?? {};
    expect(kinds['equipment']).toEqual({ type: 'equipment' });
    expect(kinds['consumable']).toEqual({ type: 'consumable' });
    expect(kinds['item']).toEqual({ type: 'item' });
  });

  it('declares one level per equipment slot under equipment', () => {
    const kinds = validated().value.domains?.items?.kinds ?? {};
    const levels: [string, string][] = [
      ['head', 'head'],
      ['earring', 'earring'],
      ['necklace', 'necklace'],
      ['ring', 'ring'],
      ['chest', 'chest'],
      ['hand', 'hand'],
      ['legs', 'legs'],
      ['foot', 'foot'],
      ['weapon', 'weapon1'],
      ['shield', 'weapon2'],
    ];
    for (const [kind, slot] of levels) {
      expect(kinds[kind], kind).toEqual({ parent: 'equipment', slot });
    }
  });

  it('declares the ten tints: the old presets plus rust, silver and shadow', () => {
    const tints = validated().value.tints ?? {};
    expect(Object.keys(tints).sort()).toEqual(
      ['arcane', 'fire', 'gold', 'ice', 'leaf', 'rust', 'shadow', 'silver', 'steel', 'wood'],
    );
  });

  it('points the four domains at their word lists', () => {
    const domains = validated().value.domains ?? {};
    expect(domains.items?.texts).toBe('generators/items.json');
    expect(domains.npcs?.texts).toBe('generators/npcs.json');
    expect(domains.skills?.texts).toBe('generators/skills.json');
    expect(domains.classes?.texts).toBe('generators/classes.json');
  });

  it('gives every one of the 101 sprites the domain items and kinds that exist in its tree', () => {
    const { value } = validated();
    const kinds = value.domains?.items?.kinds ?? {};
    expect(value.sprites).toHaveLength(101);
    for (const sprite of value.sprites as any[]) {
      expect(sprite.domain, sprite.id).toBe('items');
      expect(sprite.kinds.length, sprite.id).toBeGreaterThan(0);
      for (const kind of sprite.kinds) expect(kinds[kind], `${sprite.id}: ${kind}`).toBeDefined();
      expect(sprite).not.toHaveProperty('type');
      expect(sprite).not.toHaveProperty('slot');
    }
  });

  it('keeps the type and slot of known sprites through their kinds', () => {
    const { value } = validated();
    const kinds = value.domains?.items?.kinds ?? {};
    const resolve = (start: string) => {
      let type: string | undefined;
      let slot = 'none';
      for (let k: string | undefined = start; k; k = kinds[k].parent) {
        if (slot === 'none' && kinds[k].slot) slot = kinds[k].slot as string;
        type ??= kinds[k].type;
      }
      return { type, slot };
    };
    const expected: Record<string, { type: string; slot: string }> = {
      axe: { type: 'equipment', slot: 'weapon1' },
      amulet_1: { type: 'equipment', slot: 'necklace' },
      armor_1: { type: 'equipment', slot: 'chest' },
      apple: { type: 'consumable', slot: 'none' },
    };
    for (const [spriteId, want] of Object.entries(expected)) {
      const sprite = value.sprites.find((s: any) => s.id === spriteId);
      expect(resolve(sprite!.kinds[0]), spriteId).toEqual(want);
    }
  });

  it('lists files that exist on disk', () => {
    const { value } = validated();
    const dir = dirname(BASE_JSON(id));
    const d = value.domains ?? {};
    const files = [d.items?.texts, d.npcs?.texts, d.skills?.texts, d.classes?.texts, value.common].filter(Boolean) as string[];
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) expect(existsSync(join(dir, file)), file).toBe(true);
  });
});

describe('the two real Bases together', () => {
  const read = (id: string): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  it('declare identical item kinds and identical tints, so they merge', () => {
    const fr = read('base-fr');
    const en = read('base-en');
    expect(fr['domains'].items.kinds).toEqual(en['domains'].items.kinds);
    expect(fr['tints']).toEqual(en['tints']);
  });

  it('give each sprite the same kinds in both languages', () => {
    const fr = read('base-fr');
    const en = read('base-en');
    const kindsOf = (pack: Record<string, any>) =>
      Object.fromEntries(pack['sprites'].map((s: any) => [s.id, s.kinds]));
    expect(kindsOf(fr)['axe']).toBeDefined();
    expect(kindsOf(fr)).toEqual(kindsOf(en));
  });
});
