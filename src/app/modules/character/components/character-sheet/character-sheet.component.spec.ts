import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Character } from '../../../world/models/world';
import { CharacterAction } from '../../helpers/character-actions.rules';
import { CharacterSheetComponent } from './character-sheet.component';

const world = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10 },
    { id: 'str', name: 'Strength', baseValue: 2 },
  ],
  barAttributes: { life: 'life' },
  moneyFormat: { kind: 'coins' as const },
};

const character: Character = {
  id: 'c',
  playerId: 'p',
  name: 'Ada',
  statPoints: 2,
  money: 40,
  attributes: [
    { attributeId: 'life', points: 0, current: 6 },
    { attributeId: 'str', points: 0, current: 2 },
  ],
  inventory: [
    {
      id: 'inv-1',
      equipped: true,
      position: 0,
      item: {
        id: 'i1',
        name: 'Iron helm',
        description: '',
        rarity: 'common',
        type: 'equipment',
        slot: 'head',
        price: 10,
        modifiers: [{ attribute: 'Life', value: 2 }],
      },
    },
  ],
  rev: 1,
  updatedAt: 0,
};

async function render(inputs: { canPlay: boolean; gameMaster: boolean; locked?: string[] }) {
  // jsdom has no matchMedia nor ResizeObserver; the tabs use them.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  TestBed.configureTestingModule({
    imports: [CharacterSheetComponent],
    providers: TEST_PROVIDERS,
  });
  const fixture = TestBed.createComponent(CharacterSheetComponent);
  fixture.componentRef.setInput('character', character);
  fixture.componentRef.setInput('world', world);
  fixture.componentRef.setInput('canPlay', inputs.canPlay);
  fixture.componentRef.setInput('gameMaster', inputs.gameMaster);
  if (inputs.locked) fixture.componentRef.setInput('lockedActions', inputs.locked);
  const actions: CharacterAction[] = [];
  fixture.componentInstance.act.subscribe((action) => actions.push(action));
  await fixture.whenStable();
  return { fixture, actions, el: fixture.nativeElement as HTMLElement };
}

describe('CharacterSheetComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows stats with equipment bonus, the life bar and money', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    expect(el.textContent).toContain('Ada');
    expect(el.textContent).toContain('40 coins');
    expect(el.textContent).toContain('6 / 12');
    expect(el.querySelector('[aria-label="Spend a point on Life"]')).toBeNull();
    expect(el.querySelector('#grant-points')).toBeNull();
  });

  it('lets the player spend a point', async () => {
    const { el, actions } = await render({ canPlay: true, gameMaster: false });
    (
      el.querySelector(
        '[aria-label="Spend a point on Strength"]',
      ) as HTMLButtonElement
    ).click();
    expect(actions).toEqual([{ kind: 'spend-stat-point', attributeId: 'str' }]);
  });

  it('gives the game master the grant form', async () => {
    const { el } = await render({ canPlay: true, gameMaster: true });
    expect(el.querySelector('#grant-points')).not.toBeNull();
  });

  it('disables the spend buttons with a tooltip when the action is locked (host offline)', async () => {
    const { el, actions } = await render({ canPlay: true, gameMaster: false, locked: ['spend-stat-point'] });
    const button = el.querySelector('[aria-label="Spend a point on Strength"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(actions).toEqual([]);
    // Contract: a wrapper around the disabled button carries the tooltip text as its aria-label.
    expect(el.querySelector('[data-locked="spend-stat-point"]')!.getAttribute('aria-label')).toBe(
      'Not available while the host is offline',
    );
  });

  it('keeps unlocked actions enabled', async () => {
    const { el } = await render({ canPlay: true, gameMaster: false, locked: ['sell'] });
    expect((el.querySelector('[aria-label="Spend a point on Strength"]') as HTMLButtonElement).disabled).toBe(false);
    expect(el.querySelector('[data-locked="spend-stat-point"]')).toBeNull();
  });

  describe('equipment slot silhouettes', () => {
    const labels: Record<string, string> = {
      head: 'Head',
      earring: 'Earring',
      necklace: 'Necklace',
      ring: 'Ring',
      chest: 'Chest',
      hand: 'Hands',
      legs: 'Legs',
      foot: 'Feet',
      weapon1: 'Weapon 1',
      weapon2: 'Weapon 2',
    };
    const emptySlots = Object.keys(labels).filter((slot) => slot !== 'head');

    async function openEquipment() {
      const rendered = await render({ canPlay: false, gameMaster: false });
      const tab = Array.from(rendered.el.querySelectorAll('p-tab')).find((t) =>
        t.textContent?.includes('Equipment'),
      ) as HTMLElement;
      tab.click();
      rendered.fixture.detectChanges();
      await rendered.fixture.whenStable();
      return rendered;
    }

    it.each(emptySlots)('shows the %s silhouette, labelled, in the empty slot', async (slot) => {
      const { el } = await openEquipment();
      const silhouette = el.querySelector(`[data-slot-silhouette="${slot}"]`);
      expect(silhouette).not.toBeNull();
      expect(silhouette!.getAttribute('role')).toBe('img');
      expect(silhouette!.getAttribute('aria-label')).toBe(labels[slot]);
      expect(silhouette!.querySelector('svg')).not.toBeNull();
    });

    it('no longer shows the "-" icon in empty slots', async () => {
      const { el } = await openEquipment();
      expect(el.querySelector('.tile.empty .pi-minus')).toBeNull();
    });

    it('shows the item, not a silhouette, in a filled slot', async () => {
      const { el } = await openEquipment();
      expect(el.querySelector('[data-slot-silhouette="head"]')).toBeNull();
      expect(el.querySelector('.slots')!.textContent).toContain('Iron helm');
      expect(el.querySelectorAll('[data-slot-silhouette]').length).toBe(9);
    });
  });
});
