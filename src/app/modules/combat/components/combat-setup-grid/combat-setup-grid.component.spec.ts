import { ImageStorageService } from '../../../../core/services/image-storage.service';
import { combatTable, mount } from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { WorldSessionBusiness } from '../../../world/business/world-session.business';
import { Cell } from '../../helpers/combat-grid.rules';
import { StartSlot } from '../../helpers/combat-start.rules';
import { CombatSetupGridComponent } from './combat-setup-grid.component';

/**
 * Contract: `app-combat-setup-grid` (components/combat-setup-grid/combat-setup-grid.component.ts) is the start form's placement grid, on the GM's
 * device. Inputs: `slots` (required, `StartSlot[]` from `startSlots`) and `positions` (optional `Record<slotKey, Cell>`, the cells chosen so far).
 * Output `positionsChange` emits a `Record<slotKey, Cell>` holding a cell for **every** slot (what is shown) after each successful `place`.
 * The grid size comes from the world's grid (`CombatBusiness.$grid`).
 * - Nothing is rendered (no `[data-testid="setup-grid"]`) while the world's grid is off.
 * - `[data-testid="setup-grid"]` (`data-columns`, `data-rows`) holds one `[data-testid="setup-cell"]` per cell (`data-x`, `data-y`) and one
 *   `[data-testid="setup-token"]` per slot (`data-key`, `data-name`, `data-x`, `data-y`, `data-enemy="true"` on enemies only).
 * - Tokens without a chosen cell are at their default (party left, enemies right, no overlap).
 * - `[data-testid="grid-map"]` (`data-image-id`) only when the world's grid has a map image.
 * - Public method `place(key, { x, y })` (what the drag calls): moves the token to a free in-bounds cell and emits; an occupied or out-of-bounds cell,
 *   or an unknown key, changes and emits nothing.
 * Fixture: grid 6x4.
 */
const slots: StartSlot[] = [
  { key: 'character:ada', name: 'Ada', side: 'party' },
  { key: 'character:bob', name: 'Bob', side: 'party', portraitId: 'img-bob' },
  { key: 'npc:gob:1', name: 'Goblin 1', side: 'enemy' },
];

describe('CombatSetupGridComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatSetupGridComponent>>>;
  let el: HTMLElement;
  let emitted: Record<string, Cell>[];

  const setGrid = (grid: {
    enabled: boolean;
    columns: number;
    rows: number;
    imageId?: string;
  }) =>
    table.gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      combat: { ...w.combat, grid },
    }));

  const open = async (inputs: Record<string, unknown> = {}) => {
    mounted = await mount(CombatSetupGridComponent, table.gm, {
      slots,
      ...inputs,
    });
    el = mounted.el;
    emitted = [];
    mounted.ref.instance.positionsChange.subscribe((p) => emitted.push(p));
  };
  const token = (key: string) =>
    el.querySelector<HTMLElement>(
      `[data-testid="setup-token"][data-key="${key}"]`,
    )!;
  const at = (key: string) => [
    token(key).dataset['x'],
    token(key).dataset['y'],
  ];

  beforeEach(async () => {
    table = await combatTable('free');
    await setGrid({ enabled: true, columns: 6, rows: 4 });
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  it('shows nothing while the grid is off', async () => {
    await setGrid({ enabled: false, columns: 6, rows: 4 });
    await settle();
    await open();
    expect(el.querySelector('[data-testid="setup-grid"]')).toBeNull();
  });

  it('draws the cells and a token per slot at its default cell', async () => {
    await open();
    const grid = el.querySelector<HTMLElement>('[data-testid="setup-grid"]')!;
    expect([grid.dataset['columns'], grid.dataset['rows']]).toEqual(['6', '4']);
    expect(el.querySelectorAll('[data-testid="setup-cell"]')).toHaveLength(24);
    expect(el.querySelectorAll('[data-testid="setup-token"]')).toHaveLength(3);
    expect(at('character:ada')).toEqual(['0', '0']);
    expect(at('character:bob')).toEqual(['0', '1']);
    expect(at('npc:gob:1')).toEqual(['5', '0']);
    expect(token('npc:gob:1').dataset['enemy']).toBe('true');
    expect(token('character:ada').dataset['enemy']).toBeUndefined();
    expect(token('character:ada').dataset['name']).toBe('Ada');
  });

  it('shows the map image only when the grid has one', async () => {
    await open();
    expect(el.querySelector('[data-testid="grid-map"]')).toBeNull();
    mounted.destroy();
    await setGrid({ enabled: true, columns: 6, rows: 4, imageId: 'map-1' });
    await settle();
    await open();
    expect(
      el.querySelector<HTMLElement>('[data-testid="grid-map"]')!.dataset[
        'imageId'
      ],
    ).toBe('map-1');
  });

  it('starts from the cells already chosen', async () => {
    await open({ positions: { 'character:bob': { x: 3, y: 2 } } });
    expect(at('character:bob')).toEqual(['3', '2']);
    expect(at('character:ada')).toEqual(['0', '0']);
  });

  it('moves a token to a free cell and emits a cell for every slot', async () => {
    await open();
    mounted.ref.instance.place('character:ada', { x: 2, y: 3 });
    await settle();
    expect(at('character:ada')).toEqual(['2', '3']);
    expect(emitted).toEqual([
      {
        'character:ada': { x: 2, y: 3 },
        'character:bob': { x: 0, y: 1 },
        'npc:gob:1': { x: 5, y: 0 },
      },
    ]);
  });

  it('ignores a drop on an occupied cell', async () => {
    await open();
    mounted.ref.instance.place('character:ada', { x: 0, y: 1 });
    await settle();
    expect(at('character:ada')).toEqual(['0', '0']);
    expect(emitted).toEqual([]);
  });

  it('ignores a drop out of bounds', async () => {
    await open();
    mounted.ref.instance.place('character:ada', { x: 6, y: 0 });
    mounted.ref.instance.place('character:ada', { x: 0, y: -1 });
    await settle();
    expect(at('character:ada')).toEqual(['0', '0']);
    expect(emitted).toEqual([]);
  });
  describe('a token with a portrait', () => {
    const pointer = (target: Element, type: string, x: number, y: number) =>
      target.dispatchEvent(
        Object.assign(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          }),
          { pointerId: 1 },
        ),
      );

    const openWithPortrait = async () => {
      URL.createObjectURL = () => 'blob:portrait';
      const id = await table.gm.injector
        .get(ImageStorageService)
        .put(new Blob(['png'], { type: 'image/png' }));
      await open({
        slots: slots.map((s) => (s.portraitId ? { ...s, portraitId: id } : s)),
      });
      await settle();
    };

    it('renders an image that cannot start a native drag, and cancels dragstart on the token', async () => {
      await openWithPortrait();

      const img = token('character:bob').querySelector('img')!;
      expect(img.getAttribute('draggable')).toBe('false');
      const event = new Event('dragstart', { bubbles: true, cancelable: true });
      img.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('moves with pointer events like a token with an initial', async () => {
      await openWithPortrait();
      const board = el.querySelector<HTMLElement>(
        '[data-testid="setup-grid"]',
      )!;
      board.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 600,
          height: 400,
          right: 600,
          bottom: 400,
        }) as DOMRect;

      pointer(token('character:bob'), 'pointerdown', 50, 150);
      pointer(token('character:bob'), 'pointermove', 250, 250);
      pointer(token('character:bob'), 'pointerup', 250, 250);
      await settle();

      expect(at('character:bob')).toEqual(['2', '2']);
      expect(emitted).toHaveLength(1);
      expect(emitted[0]['character:bob']).toEqual({ x: 2, y: 2 });
    });
  });
});
