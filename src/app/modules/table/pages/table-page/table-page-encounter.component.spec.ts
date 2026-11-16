import { combatTable, click, Device, mount } from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { NpcCatalogueBusiness } from '../../../npc/business/npc-catalogue.business';
import { Npc } from '../../../npc/models/npc';
import { TableBusiness } from '../../business/table.business';
import { TablePageComponent } from './table-page.component';

/**
 * Contract (`TableBusiness`: `$encounter()`, `startEncounter(kind, npcId)`, `endEncounter()`, `$shops()`; see table-encounter.business.spec.ts).
 * - Players' table and the GM's `.scene`: during a story/merchant encounter `[data-testid="encounter-card"]` (an `app-table-npc-card`) replaces
 *   the illustration (no `.illustration` element); it is gone and `.illustration` is back after End. A merchant card carries
 *   `[data-action="visit-shop"]` for a player (opens the `app-merchant-shop` dialog; End closes it). `app-table-npcs`, `[data-testid="shop-target"]`
 *   and `[data-action="toggle-shop"]` no longer exist.
 * - GM tools, panel `[data-panel="combat"]` titled "Encounter": `[data-testid="encounter-kind"]` is a `p-selectbutton` (`.p-togglebutton` items
 *   "Combat", "Story", "Merchant"; Combat by default and today's `[data-testid="start-form"]`). Story / Merchant replace the start form with
 *   `[data-testid="encounter-npc"]` (a `p-select`, options `[data-testid="encounter-npc-option"][data-name]` in the overlay; merchant: merchant-role NPCs only)
 *   and `[data-action="start-encounter"]`. While it runs: `[data-testid="encounter-running"]` (NPC name and kind) and `[data-action="end-encounter"]`.
 */
describe('TablePageComponent story and merchant encounters', () => {
  let t: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<TablePageComponent>>>;
  let el: HTMLElement;
  let sage: Npc;
  let mira: Npc;

  const table = (d: Device) => d.injector.get(TableBusiness);
  const newNpc = (name: string, roles: Npc['roles']): Omit<Npc, 'id'> => ({
    name, statPoints: 0, xp: 0, level: 3, money: 0, updatedAt: 1, skillPoints: 0, skills: [], attributes: [],
    inventory: [{
      id: `${name}-herb`, equipped: false, position: 0,
      item: { id: 'herb', name: 'Herb', description: '', rarity: 'common', type: 'item', slot: 'none', price: 20, modifiers: [] },
    }],
    roles, description: `${name} of the hills.`, xpReward: 0, loot: [],
    ...(roles.includes('merchant') && { merchant: { buyRatio: 1, sellRatio: 0.5 } }),
  });
  const open = async (device: Device) => {
    mounted = await mount(TablePageComponent, device);
    el = mounted.el;
  };
  const card = () => el.querySelector<HTMLElement>('[data-testid="encounter-card"]');
  const kindItem = (label: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-testid="encounter-kind"] .p-togglebutton')).find((b) => b.textContent!.trim() === label)!;
  const npcOptions = async () => {
    await click(el.querySelector('[data-testid="encounter-npc"]'));
    return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="encounter-npc-option"]')).map((o) => o.dataset['name']);
  };

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    }));
    localStorage.removeItem('rpg-table-gm-tools');
    t = await combatTable('free');
    const catalogue = t.gm.injector.get(NpcCatalogueBusiness);
    sage = await catalogue.save(newNpc('Sage', ['story']));
    mira = await catalogue.save(newNpc('Mira', ['merchant']));
    await settle();
  });
  afterEach(() => {
    mounted?.destroy();
    t.destroy();
    vi.unstubAllGlobals();
  });

  describe('players', () => {
    it('shows the NPC card instead of the illustration during a story encounter, and the illustration again after', async () => {
      await open(t.ada);
      expect(el.querySelector('.illustration')).not.toBeNull();
      expect(card()).toBeNull();

      await table(t.gm).startEncounter('story', sage.id);
      await settle();
      expect(card()!.textContent).toContain('Sage');
      expect(card()!.textContent).toContain('Sage of the hills.');
      expect(el.querySelector('.illustration')).toBeNull();
      expect(card()!.querySelector('[data-action="visit-shop"]')).toBeNull();

      await table(t.gm).endEncounter();
      await settle();
      expect(card()).toBeNull();
      expect(el.querySelector('.illustration')).not.toBeNull();
    });

    it('brings the shown illustration back after the encounter, it was kept', async () => {
      await table(t.gm).addQuickImage(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }));
      await settle();
      await open(t.ada);
      expect(el.querySelector('app-stored-image.illustration')).not.toBeNull();

      await table(t.gm).startEncounter('story', sage.id);
      await settle();
      expect(el.querySelector('app-stored-image.illustration')).toBeNull();

      await table(t.gm).endEncounter();
      await settle();
      expect(el.querySelector('app-stored-image.illustration')).not.toBeNull();
    });

    it('offers the Shop button under a merchant card, which opens the shop; ending the encounter closes it', async () => {
      await open(t.ada);
      await table(t.gm).startEncounter('merchant', mira.id);
      await settle();
      expect(card()!.textContent).toContain('Mira');

      await click(card()!.querySelector('[data-action="visit-shop"]'));
      expect(document.querySelector('app-merchant-shop')).not.toBeNull();

      await table(t.gm).endEncounter();
      await settle();
      expect(document.querySelector('app-merchant-shop')).toBeNull();
      expect(card()).toBeNull();
    });

    it('has no strip of shown NPCs', async () => {
      await open(t.ada);
      await table(t.gm).startEncounter('merchant', mira.id);
      await settle();
      expect(el.querySelector('app-table-npcs')).toBeNull();
    });
  });

  describe('game master', () => {
    it('shows the card in the scene instead of the illustration, and drops the old shop controls', async () => {
      await open(t.gm);
      await table(t.gm).startEncounter('merchant', mira.id);
      await settle();

      expect(el.querySelector('.scene [data-testid="encounter-card"]')!.textContent).toContain('Mira');
      expect(el.querySelector('.scene .illustration')).toBeNull();
      expect(el.querySelector('app-table-npcs')).toBeNull();
      expect(el.querySelector('[data-testid="shop-target"]')).toBeNull();
      expect(el.querySelector('[data-action="toggle-shop"]')).toBeNull();

      await table(t.gm).endEncounter();
      await settle();
      expect(el.querySelector('.scene [data-testid="encounter-card"]')).toBeNull();
      expect(el.querySelector('.scene .illustration')).not.toBeNull();
    });

    it('titles the panel Encounter and offers Combat, Story, Merchant with the combat start form by default', async () => {
      await open(t.gm);
      const panel = el.querySelector('[data-testid="gm-tool"][data-panel="combat"]')!;
      expect(panel.querySelector('p-accordion-header')!.textContent!.trim()).toBe('Encounter');
      const labels = Array.from(el.querySelectorAll('[data-testid="encounter-kind"] .p-togglebutton')).map((b) => b.textContent!.trim());
      expect(labels).toEqual(['Combat', 'Story', 'Merchant']);
      expect(el.querySelector('[data-testid="start-form"]')).not.toBeNull();
      expect(el.querySelector('[data-testid="encounter-npc"]')).toBeNull();
    });

    it('lists every NPC for a story encounter and the merchants only for a merchant one', async () => {
      await open(t.gm);
      await click(kindItem('Story'));
      expect(el.querySelector('[data-testid="start-form"]')).toBeNull();
      expect((await npcOptions()).sort()).toEqual(['Goblin', 'Mira', 'Sage']);

      await click(document.querySelector('[data-testid="encounter-npc-option"][data-name="Sage"]'));
      await click(kindItem('Merchant'));
      expect(await npcOptions()).toEqual(['Mira']);
    });

    it('starts a story encounter from the panel, shows its name and kind, and ends it', async () => {
      await open(t.gm);
      await click(kindItem('Story'));
      await npcOptions();
      await click(document.querySelector('[data-testid="encounter-npc-option"][data-name="Sage"]'));
      await click(el.querySelector('[data-action="start-encounter"]'));

      expect(table(t.ada).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id } });
      const running = el.querySelector('[data-testid="encounter-running"]')!;
      expect(running.textContent).toContain('Sage');
      expect(running.textContent).toContain('Story');
      expect(el.querySelector('[data-action="start-encounter"]')).toBeNull();

      await click(el.querySelector('[data-action="end-encounter"]'));
      expect(table(t.ada).$encounter()).toBeNull();
      expect(el.querySelector('[data-testid="encounter-running"]')).toBeNull();
    });

    it('starts a merchant encounter from the panel, which opens the shop for the players', async () => {
      await open(t.gm);
      await click(kindItem('Merchant'));
      await npcOptions();
      await click(document.querySelector('[data-testid="encounter-npc-option"][data-name="Mira"]'));
      await click(el.querySelector('[data-action="start-encounter"]'));

      expect(table(t.ada).$encounter()).toMatchObject({ kind: 'merchant', npc: { id: mira.id } });
      expect(table(t.ada).$shops().map((s) => s.name)).toEqual(['Mira']);
      expect(el.querySelector('[data-testid="encounter-running"]')!.textContent).toContain('Merchant');
    });
  });
});
