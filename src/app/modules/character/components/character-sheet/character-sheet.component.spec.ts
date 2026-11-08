import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Character } from '../../../world/models/world';
import { CharacterAction } from '../../helpers/character-actions.rules';
import { CharacterSheetComponent } from './character-sheet.component';

const world = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
    { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
  ],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
};

const character: Character = {
  id: 'c',
  playerId: 'p',
  name: 'Ada',
  statPoints: 2,
  xp: 250,
  level: 2,
  money: 40,
  attributes: [
    { attributeId: 'life', level: 0, current: 6 },
    { attributeId: 'str', level: 0, current: 2 },
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

async function render(inputs: { canPlay: boolean; gameMaster: boolean; locked?: string[]; character?: Character }) {
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
  fixture.componentRef.setInput('character', inputs.character ?? character);
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
    expect(el.querySelector('[data-coin="copper"]')!.textContent).toContain('40');
    expect(el.textContent).toContain('6 / 12');
    expect(el.querySelector('[aria-label="Spend a point on Life"]')).toBeNull();
    expect(el.querySelector('#grant-points')).toBeNull();
  });

  it('shows only the value for a non-bar attribute and current / max for a bar', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    const rows = [...el.querySelectorAll('.stats tbody tr')];
    const text = (name: string) =>
      rows.find((row) => row.querySelector('th')!.textContent!.includes(name))!.textContent!;
    expect(text('Strength')).not.toContain('/');
    expect(text('Strength')).toContain('2');
    expect(text('Life')).toContain('6 / 12');
  });

  it('leaves the current line out of the tooltip of a non-bar attribute', async () => {
    const { fixture } = await render({ canPlay: false, gameMaster: false });
    const tooltip = (id: string) => (fixture.componentInstance as unknown as { tooltip(id: string): string }).tooltip(id);
    expect(tooltip('str')).toContain('Max: 2');
    expect(tooltip('str')).not.toContain('Current');
    expect(tooltip('life')).toContain('Current: 6');
  });

  it('shows an equipment bonus next to the attribute name, with no bonus column', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    const headers = [...el.querySelectorAll('.stats thead th')].map((th) => th.textContent!.trim());
    expect(headers).not.toContain('Bonus');
    const bonus = el.querySelector('.stats tbody th .bonus');
    expect(bonus?.textContent?.trim()).toMatch(/^[+-]\d+$/);
    expect(el.querySelector('.stats-scroll')).toBeNull();
  });

  it('has no Base column and no free current input, even for the game master', async () => {
    const { el } = await render({ canPlay: true, gameMaster: true });
    const headers = [...el.querySelectorAll('.stats thead th')].map((th) => th.textContent!.trim());
    expect(headers).not.toContain('Base');
    expect(el.querySelector('.stats p-inputnumber')).toBeNull();
    expect(el.querySelector('.stats input')).toBeNull();
    expect(el.querySelector('.stats tbody')!.textContent).toContain('6 / 12');
  });

  it('shows the minus button to the game master only, on attributes above level 0', async () => {
    const levelled: Character = {
      ...character,
      attributes: [
        { attributeId: 'life', level: 0, current: 6 },
        { attributeId: 'str', level: 1, current: 3 },
      ],
    };
    const player = await render({ canPlay: true, gameMaster: false, character: levelled });
    expect(player.el.querySelector('[aria-label="Take back a point from Strength"]')).toBeNull();
    TestBed.resetTestingModule();
    const gm = await render({ canPlay: true, gameMaster: true, character: levelled });
    expect(gm.el.querySelector('[aria-label="Take back a point from Life"]')).toBeNull();
    (gm.el.querySelector('[aria-label="Take back a point from Strength"]') as HTMLButtonElement).click();
    expect(gm.actions).toEqual([{ kind: 'refund-stat-point', attributeId: 'str' }]);
  });

  it('shows the plus button to a player with points, none without', async () => {
    const player = await render({ canPlay: true, gameMaster: false });
    expect(player.el.querySelector('[aria-label="Spend a point on Strength"]')).not.toBeNull();
    TestBed.resetTestingModule();
    const broke = await render({ canPlay: true, gameMaster: false, character: { ...character, statPoints: 0 } });
    expect(broke.el.querySelector('[aria-label="Spend a point on Strength"]')).toBeNull();
  });

  it('gives the value a tooltip with the base, level, formula, result, cap, bonus, max and current', async () => {
    const { fixture } = await render({ canPlay: false, gameMaster: false });
    const text = (fixture.componentInstance as unknown as { tooltip(id: string): string }).tooltip('life');
    for (const part of ['Base: 10', 'Level: 0', 'Linear', 'Formula result: 10', 'Bonus: +2', 'Max: 12', 'Current: 6'])
      expect(text).toContain(part);
    expect(text).not.toContain('Cap');
    expect(text.split('\n').length).toBeGreaterThan(5);
  });

  it('shows the level and an XP progress bar', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    expect(el.querySelector('[data-testid="character-level"]')!.textContent).toContain('2');
    const bar = el.querySelector('[data-testid="xp-progress"]')!;
    expect(bar.tagName.toLowerCase()).toBe('p-progressbar');
    expect(bar.getAttribute('aria-valuenow') ?? bar.querySelector('[aria-valuenow]')?.getAttribute('aria-valuenow')).toBe('17');
    expect(el.querySelector('[data-testid="xp-text"]')!.textContent).toContain('50 / 300');
  });

  it('gives the game master a grant XP control that emits grant-xp', async () => {
    const { el, actions, fixture } = await render({ canPlay: true, gameMaster: true });
    const input = el.querySelector('#grant-xp') as HTMLInputElement;
    input.value = '120';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const host = el.querySelector('[data-testid="grant-xp-button"]')!;
    (host.matches('button') ? (host as HTMLButtonElement) : host.querySelector('button')!).click();
    expect(actions).toEqual([{ kind: 'grant-xp', amount: 120 }]);
  });

  it('hides the grant XP control from players', async () => {
    const { el } = await render({ canPlay: true, gameMaster: false });
    expect(el.querySelector('#grant-xp')).toBeNull();
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

  it('renders the character card beside the details, not inside them', async () => {
    const { el } = await render({ canPlay: false, gameMaster: false });
    const card = el.querySelector('app-character-card');
    const details = el.querySelector('[data-testid="character-details"]');
    expect(card).not.toBeNull();
    expect(details).not.toBeNull();
    expect(details!.querySelector('p-tabs')).not.toBeNull();
    expect(details!.contains(card)).toBe(false);
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
      expect(el.querySelector('.slots [data-slot-silhouette="head"]')).toBeNull();
      expect(el.querySelector('.slots')!.textContent).toContain('Iron helm');
      expect(el.querySelectorAll('.slots [data-slot-silhouette]').length).toBe(9);
    });
  });
});
