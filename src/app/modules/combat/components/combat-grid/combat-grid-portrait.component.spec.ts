import { combatTable, mount } from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { ImageStorageService } from '../../../../core/services/image-storage.service';
import { WorldSessionBusiness } from '../../../world/business/world-session.business';
import { CombatGridComponent } from './combat-grid.component';

/**
 * Contract: on the GM's `app-combat-grid`, a token whose combatant has a portrait behaves like one with an initial: its image cannot start a native
 * drag (`draggable="false"`, `dragstart` prevented) and a pointer drag (pointerdown, move, up on a free cell) moves it there.
 * Fixture: grid 10x10; Ada has a stored portrait; Ada, Bob and Goblin start at (0,0), (0,1) and (9,0).
 */
describe('CombatGridComponent token with a portrait', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatGridComponent>>>;
  let el: HTMLElement;

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

  beforeEach(async () => {
    URL.createObjectURL = () => 'blob:portrait';
    table = await combatTable('free');
    const portraitId = await table.gm.injector
      .get(ImageStorageService)
      .put(new Blob(['png'], { type: 'image/png' }));
    await table.gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      combat: { ...w.combat, grid: { enabled: true, columns: 10, rows: 10 } },
      characters: w.characters.map((c) =>
        c.playerId === 'ada' ? { ...c, portraitId } : c,
      ),
    }));
    await table.start();
    mounted = await mount(CombatGridComponent, table.gm);
    el = mounted.el;
    await settle();
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  const token = () =>
    el.querySelector<HTMLElement>('[data-testid="token"][data-name="Ada"]')!;

  it('renders an image that cannot start a native drag, and cancels dragstart on the token', () => {
    const img = token().querySelector('img')!;
    expect(img.getAttribute('draggable')).toBe('false');
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    img.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('moves with pointer events like a token with an initial', async () => {
    const board = el.querySelector<HTMLElement>('[data-testid="grid"]')!;
    board.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000,
        right: 1000,
        bottom: 1000,
      }) as DOMRect;

    pointer(token(), 'pointerdown', 50, 50);
    pointer(token(), 'pointermove', 250, 350);
    pointer(token(), 'pointerup', 250, 350);
    await settle();

    expect(table.named(table.gm, 'Ada').position).toEqual({ x: 2, y: 3 });
  });
});
