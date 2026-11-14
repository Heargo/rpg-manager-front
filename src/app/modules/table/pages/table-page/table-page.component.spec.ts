import 'fake-indexeddb/auto';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { combatTable, click, mount } from '../../../../../testing/combat-table';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { RoomBusiness, RoomStatus } from '../../../room/business/room.business';
import { TablePageComponent } from './table-page.component';

async function render(status: RoomStatus) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  }));
  const room = {
    $status: signal<RoomStatus>(status),
    $room: signal(null),
    $isHost: signal(false),
    whenReady: () => Promise.resolve(),
    describeError: (e: unknown) => String(e),
  };
  TestBed.configureTestingModule({ imports: [TablePageComponent], providers: [...TEST_PROVIDERS, { provide: RoomBusiness, useValue: room }] });
  const fixture = TestBed.createComponent(TablePageComponent);
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, $status: room.$status };
}

describe('TablePageComponent host-offline icon', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the host-offline icon on the table when the host channel closes, and hides it when connected', async () => {
    const { el, fixture, $status } = await render('connected');
    expect(el.querySelector('.host-offline-icon')).toBeNull();

    $status.set('host-offline');
    await fixture.whenStable();
    expect(el.querySelector('.host-offline-icon')).not.toBeNull();

    $status.set('connected');
    await fixture.whenStable();
    expect(el.querySelector('.host-offline-icon')).toBeNull();
  });
});

/**
 * Contract: as the game master on desktop, the tools column is a `p-accordion` (multiple) of panels `p-accordion-panel[data-testid="gm-tool"]`
 * with `data-panel` `dice`, `combat`, `notes` in that order. A panel is open when its `data-p-active` is "true"; clicking its `p-accordion-header` toggles it.
 * All open by default; the open panels are remembered in `localStorage['rpg-table-gm-tools']` (JSON array of `data-panel` values); a missing or bad value means all open.
 * `app-combat-order` sits in the scene (`.scene`) while a combat runs without grid, else in the combat panel above `app-combat-gm-panel`
 * (with a grid, `app-combat-grid` is in the scene); `app-combat-gm-panel` is only in the combat panel.
 */
describe('TablePageComponent GM tools accordion', () => {
  const KEY = 'rpg-table-gm-tools';
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<TablePageComponent>>>;
  let el: HTMLElement;

  const open = async (extra: Parameters<typeof combatTable>[1] = {}, running = true) => {
    table = await combatTable('free', extra);
    if (running) await table.start();
    mounted = await mount(TablePageComponent, table.gm);
    el = mounted.el;
  };
  const panel = (name: string) =>
    el.querySelector<HTMLElement>(`[data-testid="gm-tool"][data-panel="${name}"]`)!;
  const openPanels = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-testid="gm-tool"]'))
      .filter((p) => p.getAttribute('data-p-active') === 'true')
      .map((p) => p.dataset['panel']);

  beforeEach(() => {
    localStorage.removeItem(KEY);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    }));
  });
  afterEach(() => {
    mounted?.destroy();
    table?.destroy();
    localStorage.removeItem(KEY);
    vi.unstubAllGlobals();
  });

  it('lists the panels Dice, Combat, Notes in that order', async () => {
    await open();
    expect(
      Array.from(el.querySelectorAll<HTMLElement>('[data-testid="gm-tool"]')).map((p) => p.dataset['panel']),
    ).toEqual(['dice', 'combat', 'notes']);
  });

  it('holds the dice roller, the combat panel and the notes in their panels', async () => {
    await open();
    expect(panel('dice').querySelector('app-dice-roller')).not.toBeNull();
    expect(panel('combat').querySelector('app-combat-gm-panel')).not.toBeNull();
    expect(panel('notes').querySelector('textarea#gm-notes')).not.toBeNull();
  });

  it('opens every panel by default', async () => {
    await open();
    expect(openPanels()).toEqual(['dice', 'combat', 'notes']);
  });

  it('restores the open panels from the device', async () => {
    localStorage.setItem(KEY, JSON.stringify(['notes']));
    await open();
    expect(openPanels()).toEqual(['notes']);
  });

  it('opens every panel when the stored value is not valid', async () => {
    localStorage.setItem(KEY, 'not json');
    await open();
    expect(openPanels()).toEqual(['dice', 'combat', 'notes']);
  });

  it('opens every panel when the stored value is not an array', async () => {
    localStorage.setItem(KEY, '{"dice":true}');
    await open();
    expect(openPanels()).toEqual(['dice', 'combat', 'notes']);
  });

  it('closes a panel on a click on its header and remembers it', async () => {
    await open();
    await click(panel('dice').querySelector('p-accordion-header'));

    expect(openPanels()).toEqual(['combat', 'notes']);
    expect(JSON.parse(localStorage.getItem(KEY)!).sort()).toEqual(['combat', 'notes']);
  });

  it('shows the turn order in the scene, not in the combat panel, when the world has no grid', async () => {
    await open();
    expect(el.querySelector('.scene app-combat-order')).not.toBeNull();
    expect(panel('combat').querySelector('app-combat-order')).toBeNull();
    expect(el.querySelector('.scene app-combat-grid')).toBeNull();
    expect(el.querySelectorAll('[data-testid="combatant"]')).toHaveLength(3);
  });

  it('shows the grid in the scene and the turn order in the combat panel when the world has a grid', async () => {
    await open({ grid: { enabled: true, columns: 10, rows: 10 } });
    expect(el.querySelector('.scene app-combat-grid')).not.toBeNull();
    expect(el.querySelector('.scene app-combat-order')).toBeNull();
    expect(panel('combat').querySelector('app-combat-order')).not.toBeNull();
  });

  it('keeps the combat controls out of the scene', async () => {
    await open();
    expect(el.querySelector('.scene app-combat-gm-panel')).toBeNull();
    expect(el.querySelector('.scene .combat')).toBeNull();
  });

  it('shows the start form in the combat panel and no turn order while no combat runs', async () => {
    await open({}, false);
    expect(panel('combat').querySelector('[data-testid="start-form"]')).not.toBeNull();
    expect(el.querySelector('app-combat-order [data-testid="combatant"]')).toBeNull();
    expect(el.querySelector('.scene [data-testid="combatant"]')).toBeNull();
  });
});
