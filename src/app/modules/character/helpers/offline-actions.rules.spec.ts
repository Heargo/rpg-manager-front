import {
  OfflineFeatures,
  Character,
  WorldAttribute,
} from '../../world/models/world';
import {
  applyOffline,
  applyOfflineNotes,
  isOfflineAllowed,
  isValidQueue,
  replayQueue,
} from './offline-actions.rules';

const bars = { life: 'life' };
const attributes: WorldAttribute[] = [
  { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
  { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
];

const none: OfflineFeatures = {
  dice: true,
  notes: false,
  spendStatPoints: false,
  equip: false,
  useConsumables: false,
  sell: false,
};
const all: OfflineFeatures = {
  dice: true,
  notes: true,
  spendStatPoints: true,
  equip: true,
  useConsumables: true,
  sell: true,
};

const helm = {
  id: 'inv-helm',
  equipped: false,
  position: 0,
  item: {
    id: 'i1',
    name: 'Helm',
    description: '',
    rarity: 'common' as const,
    type: 'equipment' as const,
    slot: 'head' as const,
    price: 10,
    modifiers: [],
  },
};
const potion = {
  id: 'inv-potion',
  equipped: false,
  position: 1,
  item: {
    id: 'i2',
    name: 'Potion',
    description: '',
    rarity: 'common' as const,
    type: 'consumable' as const,
    slot: 'none' as const,
    price: 25,
    modifiers: [{ attribute: 'Life', value: 6 }],
  },
};

const ada: Character = {
  id: 'c1',
  playerId: 'ada',
  name: 'Ada',
  statPoints: 2,
  xp: 0,
  level: 1,
  money: 40,
  attributes: [
    { attributeId: 'life', level: 0, current: 4 },
    { attributeId: 'str', level: 0, current: 2 },
  ],
  inventory: [helm, potion],
  rev: 3,
  updatedAt: 1000,
  skillPoints: 0,
  skills: [],
};

describe('isOfflineAllowed', () => {
  it('maps each action to its offline feature', () => {
    const only = (key: keyof OfflineFeatures): OfflineFeatures => ({
      ...none,
      [key]: true,
    });
    expect(isOfflineAllowed(only('spendStatPoints'), 'spend-stat-point')).toBe(
      true,
    );
    expect(isOfflineAllowed(only('equip'), 'equip')).toBe(true);
    expect(isOfflineAllowed(only('equip'), 'unequip')).toBe(true);
    expect(isOfflineAllowed(only('useConsumables'), 'use')).toBe(true);
    expect(isOfflineAllowed(only('sell'), 'sell')).toBe(true);
  });

  it('refuses every action whose feature is off', () => {
    for (const kind of [
      'spend-stat-point',
      'equip',
      'unequip',
      'use',
      'sell',
    ] as const) {
      expect(isOfflineAllowed(none, kind)).toBe(false);
    }
  });

  it('never allows the game master actions offline', () => {
    expect(isOfflineAllowed(all, 'grant-stat-points')).toBe(false);
    expect(isOfflineAllowed(all, 'set-current')).toBe(false);
    expect(isOfflineAllowed(all, 'refund-stat-point')).toBe(false);
  });
});

describe('applyOffline', () => {
  it('applies a spent point with the host reducer and queues the request', () => {
    const result = applyOffline(
      attributes,
      ada,
      [],
      { kind: 'spend-stat-point', attributeId: 'str' },
      all, bars);
    expect(result).toEqual({
      ok: true,
      character: {
        ...ada,
        statPoints: 1,
        attributes: [
          ada.attributes[0],
          { attributeId: 'str', level: 1, current: 3 },
        ],
      },
      queue: [
        {
          route: 'character/spend-stat-point',
          payload: { characterId: 'c1', attributeId: 'str' },
        },
      ],
    });
  });

  it('keeps the queue in order', () => {
    const first = applyOffline(
      attributes,
      ada,
      [],
      { kind: 'equip', inventoryId: 'inv-helm' },
      all, bars);
    if (!first.ok) throw new Error('expected ok');
    const second = applyOffline(
      attributes,
      first.character,
      first.queue,
      { kind: 'sell', inventoryId: 'inv-potion' },
      all, bars);
    expect(second).toMatchObject({
      ok: true,
      character: { money: 65, inventory: [{ id: 'inv-helm', equipped: true }] },
      queue: [
        {
          route: 'character/equip',
          payload: { characterId: 'c1', inventoryId: 'inv-helm' },
        },
        {
          route: 'character/sell',
          payload: { characterId: 'c1', inventoryId: 'inv-potion' },
        },
      ],
    });
  });

  it('refuses an action whose feature is off and leaves the queue alone', () => {
    const queue = [
      {
        route: 'character/equip',
        payload: { characterId: 'c1', inventoryId: 'inv-helm' },
      },
    ];
    const result = applyOffline(
      attributes,
      ada,
      queue,
      { kind: 'sell', inventoryId: 'inv-potion' },
      { ...all, sell: false }, bars);
    expect(result).toEqual({
      ok: false,
      error: 'character.errors.offlineNotAllowed',
    });
  });

  it("passes on the reducer's refusal without queueing", () => {
    const result = applyOffline(
      attributes,
      { ...ada, statPoints: 0 },
      [],
      { kind: 'spend-stat-point', attributeId: 'str' },
      all, bars);
    expect(result).toEqual({
      ok: false,
      error: 'character.errors.noStatPoints',
    });
  });
});

describe('applyOfflineNotes', () => {
  it('sets the notes on the local copy and queues the save', () => {
    expect(applyOfflineNotes(ada, [], 'The key is under the mat', all)).toEqual(
      {
        ok: true,
        character: { ...ada, notes: 'The key is under the mat' },
        queue: [
          {
            route: 'character/save-notes',
            payload: { characterId: 'c1', notes: 'The key is under the mat' },
          },
        ],
      },
    );
  });

  it('refuses when notes are not allowed offline', () => {
    expect(applyOfflineNotes(ada, [], 'x', none)).toEqual({
      ok: false,
      error: 'character.errors.offlineNotAllowed',
    });
  });
});

describe('applyOfflineNotes queue', () => {
  it('keeps a single notes entry: the last edit wins', () => {
    const first = applyOfflineNotes(ada, [], 'one', all);
    if (!first.ok) throw new Error('expected ok');
    const second = applyOfflineNotes(first.character, first.queue, 'two', all);
    expect(second).toMatchObject({
      ok: true,
      queue: [
        {
          route: 'character/save-notes',
          payload: { characterId: 'c1', notes: 'two' },
        },
      ],
    });
  });
});

describe('isValidQueue', () => {
  const spend = {
    route: 'character/spend-stat-point',
    payload: { characterId: 'c1', attributeId: 'str' },
  };
  const notes = (text: string) => ({
    route: 'character/save-notes',
    payload: { characterId: 'c1', notes: text },
  });

  it('accepts player actions and one notes entry on that character', () => {
    expect(isValidQueue([spend, notes('x')], 'c1')).toBe(true);
    expect(isValidQueue([], 'c1')).toBe(true);
  });

  it('refuses an unknown route, a game master action, another character, junk and a payload that does not fit', () => {
    expect(
      isValidQueue(
        [{ route: 'character/delete', payload: { characterId: 'c1' } }],
        'c1',
      ),
    ).toBe(false);
    expect(
      isValidQueue(
        [
          {
            route: 'character/grant-stat-points',
            payload: { characterId: 'c1', amount: 5 },
          },
        ],
        'c1',
      ),
    ).toBe(false);
    expect(
      isValidQueue(
        [
          {
            route: 'character/set-current',
            payload: { characterId: 'c1', attributeId: 'str', value: 9 },
          },
        ],
        'c1',
      ),
    ).toBe(false);
    expect(
      isValidQueue(
        [{ ...spend, payload: { ...spend.payload, characterId: 'c2' } }],
        'c1',
      ),
    ).toBe(false);
    expect(
      isValidQueue(
        [
          {
            route: 'character/spend-stat-point',
            payload: { characterId: 'c1' },
          },
        ],
        'c1',
      ),
    ).toBe(false);
    expect(isValidQueue(['nope', null], 'c1')).toBe(false);
    expect(isValidQueue('nope', 'c1')).toBe(false);
  });

  it('refuses more than 200 entries, two notes entries and oversize notes', () => {
    expect(
      isValidQueue(
        Array.from({ length: 200 }, () => spend),
        'c1',
      ),
    ).toBe(true);
    expect(
      isValidQueue(
        Array.from({ length: 201 }, () => spend),
        'c1',
      ),
    ).toBe(false);
    expect(isValidQueue([notes('a'), notes('b')], 'c1')).toBe(false);
    expect(isValidQueue([notes('x'.repeat(5001))], 'c1')).toBe(false);
  });
});

describe('replayQueue', () => {
  it('replays the queue on the host record in order and applies notes', () => {
    const queue = [
      {
        route: 'character/spend-stat-point',
        payload: { characterId: 'c1', attributeId: 'str' },
      },
      {
        route: 'character/sell',
        payload: { characterId: 'c1', inventoryId: 'inv-potion' },
      },
      {
        route: 'character/save-notes',
        payload: { characterId: 'c1', notes: 'hi' },
      },
    ];
    const { character, refused } = replayQueue(attributes, ada, queue, all, bars);
    expect(refused).toEqual([]);
    expect(character).toMatchObject({
      statPoints: 1,
      money: 65,
      notes: 'hi',
      inventory: [{ id: 'inv-helm' }],
    });
  });

  it('lists refused entries (feature off, reducer refusal, junk) and keeps going', () => {
    const queue = [
      {
        route: 'character/sell',
        payload: { characterId: 'c1', inventoryId: 'inv-potion' },
      },
      {
        route: 'character/sell',
        payload: { characterId: 'c1', inventoryId: 'missing' },
      },
      {
        route: 'character/grant-stat-points',
        payload: { characterId: 'c1', amount: 9 },
      },
      {
        route: 'character/spend-stat-point',
        payload: { characterId: 'c1', attributeId: 'str' },
      },
    ];
    const { character, refused } = replayQueue(attributes, ada, queue, {
      ...all,
      spendStatPoints: false,
    }, bars);
    expect(refused).toEqual([
      { route: 'character/sell', error: 'character.errors.unknownItem' },
      {
        route: 'character/grant-stat-points',
        error: 'character.errors.invalid',
      },
      {
        route: 'character/spend-stat-point',
        error: 'character.errors.offlineNotAllowed',
      },
    ]);
    expect(character.money).toBe(65);
  });
});
