import { ITEM_KIND_SCHEMA } from './pack-kinds';
import { PooledSource, poolDomain, poolParams, poolTints } from './pooled-domain';

const base = (extra: Partial<PooledSource> = {}): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: {
    equipment: { type: 'equipment' },
    weapon: { parent: 'equipment', slot: 'weapon1' },
    sword: { parent: 'weapon' },
    consumable: { type: 'consumable' },
  },
  ...extra,
});

const pack = (packId: string, extra: Partial<PooledSource> = {}): PooledSource => ({
  packId,
  isBase: false,
  language: 'fr',
  ...extra,
});

describe('poolDomain (items schema)', () => {
  it('resolves type and slot of a kind whose parent is declared in another pack', () => {
    const pooled = poolDomain(
      [base(), pack('extra', { kinds: { rapier: { parent: 'sword' } } })],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['rapier']).toMatchObject({
      type: 'equipment',
      slot: 'weapon1',
      chain: ['rapier', 'sword', 'weapon', 'equipment'],
    });
    expect(pooled.conflicts).toEqual([]);
  });

  it('resolves a child declared in a pack that comes before its parent', () => {
    const pooled = poolDomain(
      [pack('extra', { kinds: { rapier: { parent: 'sword' } } }), base()],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['rapier'].chain).toEqual(['rapier', 'sword', 'weapon', 'equipment']);
  });

  it('keeps the Base declaration of a conflicting kind, wherever the Base is in the order, and reports it', () => {
    const pooled = poolDomain(
      [pack('extra', { kinds: { sword: { parent: 'consumable' } } }), base()],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['sword'].chain).toEqual(['sword', 'weapon', 'equipment']);
    expect(pooled.conflicts).toHaveLength(1);
    expect(pooled.conflicts[0]).toContain('sword');
  });

  it('keeps the first pack of the order when no Base takes part in the conflict', () => {
    const pooled = poolDomain(
      [
        base(),
        pack('first', { kinds: { dagger: { parent: 'weapon' } } }),
        pack('second', { kinds: { dagger: { parent: 'consumable' } } }),
      ],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['dagger'].chain).toEqual(['dagger', 'weapon', 'equipment']);
    expect(pooled.conflicts).toHaveLength(1);
    expect(pooled.conflicts[0]).toContain('dagger');
  });

  it('merges identical declarations of a kind silently', () => {
    const pooled = poolDomain(
      [base(), pack('en', { kinds: { sword: { parent: 'weapon' } }, language: 'en' })],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['sword'].chain).toEqual(['sword', 'weapon', 'equipment']);
    expect(pooled.conflicts).toEqual([]);
  });

  it('reports a cycle across packs and drops the kinds in it, leaving the others', () => {
    const pooled = poolDomain(
      [
        base(),
        pack('one', { kinds: { ping: { parent: 'pong' } } }),
        pack('two', { kinds: { pong: { parent: 'ping' } } }),
      ],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['ping']).toBeUndefined();
    expect(pooled.kinds['pong']).toBeUndefined();
    expect(pooled.kinds['sword']).toBeDefined();
    expect(pooled.conflicts.some((c) => c.includes('ping') || c.includes('pong'))).toBe(true);
  });

  it('drops a kind that does not reach a typed root, with its descendants, and reports it', () => {
    const pooled = poolDomain(
      [
        base(),
        pack('extra', { kinds: { ghost: { parent: 'nowhere' }, ghostling: { parent: 'ghost' } } }),
      ],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.kinds['ghost']).toBeUndefined();
    expect(pooled.kinds['ghostling']).toBeUndefined();
    expect(pooled.conflicts.some((c) => c.includes('ghost'))).toBe(true);
  });

  it('concatenates the texts of a kind across packs, in pack order', () => {
    const pooled = poolDomain(
      [
        base({
          texts: {
            version: 2,
            kinds: { sword: { nouns: [{ text: 'Épée' }], names: { rare: ['{base} rare'] } } },
          },
        }),
        pack('extra', {
          texts: {
            version: 2,
            kinds: { sword: { nouns: [{ text: 'Glaive' }], names: { rare: ['{base} unique'] } } },
          },
        }),
      ],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.texts['sword']['nouns']).toEqual([{ text: 'Épée' }, { text: 'Glaive' }]);
    expect(pooled.texts['sword']['names']).toEqual({ rare: ['{base} rare', '{base} unique'] });
  });

  it('concatenates the top-level sections across packs', () => {
    const pooled = poolDomain(
      [
        base({ texts: { version: 2, adjectives: { rare: ['usé'] }, templates: { common: ['{base}'] } } }),
        pack('extra', { texts: { version: 2, adjectives: { rare: ['rouillé'], common: ['simple'] } } }),
      ],
      ITEM_KIND_SCHEMA,
    );

    expect(pooled.sections['adjectives']).toEqual({ rare: ['usé', 'rouillé'], common: ['simple'] });
    expect(pooled.sections['templates']).toEqual({ common: ['{base}'] });
  });
});

const gradient = (from: string, to: string) => [
  { position: 0, color: from },
  { position: 1, color: to },
];

describe('poolTints', () => {
  it('keeps every gradient of a tint id as a variant, in pack order', () => {
    const tints = poolTints([
      pack('a', { tints: { fire: { gradient: gradient('#5a0a0a', '#fde047') }, ice: { gradient: gradient('#000000', '#ffffff') } } }),
      pack('b', { tints: { fire: { gradient: gradient('#111111', '#ff0000') } } }),
    ]);

    expect(tints['fire']).toEqual([gradient('#5a0a0a', '#fde047'), gradient('#111111', '#ff0000')]);
    expect(tints['ice']).toEqual([gradient('#000000', '#ffffff')]);
  });

  it('keeps one variant when packs declare the same gradient', () => {
    const same = { fire: { gradient: gradient('#5a0a0a', '#fde047') } };

    const tints = poolTints([pack('a', { tints: same }), pack('b', { tints: same })]);

    expect(tints['fire']).toEqual([gradient('#5a0a0a', '#fde047')]);
  });
});

describe('poolParams', () => {
  it('concatenates the lists of a param across packs', () => {
    const params = poolParams([
      pack('a', { params: { maker: ['un forgeron'], place: ['Eldoria'] } }),
      pack('b', { params: { maker: ['une naine'] } }),
    ]);

    expect(params).toEqual({ maker: ['un forgeron', 'une naine'], place: ['Eldoria'] });
  });
});
