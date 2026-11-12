import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PublicNpc } from '../../../npc/models/npc';
import { TableNpcsComponent } from './table-npcs.component';

/**
 * Contract: `app-table-npcs` takes `npcs` (PublicNpc[]) and renders one `[data-testid="table-npc"]` per NPC with its name;
 * a field is rendered only when the projection carries it: `[data-field="description"]`, `[data-field="level"]`,
 * `[data-field="life-bar"]` (attribute `data-percent`), `[data-field="life-numbers"]` ("current / max"),
 * `[data-field="attribute"]` (one per attribute, "Name current / max") and `[data-field="equipment"]` (one per item).
 */
async function render(npcs: PublicNpc[]) {
  TestBed.configureTestingModule({ imports: [TableNpcsComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(TableNpcsComponent);
  fixture.componentRef.setInput('npcs', npcs);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { el, cards: () => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="table-npc"]')) };
}

describe('TableNpcsComponent', () => {
  it('shows nothing without NPCs', async () => {
    const { cards } = await render([]);
    expect(cards()).toHaveLength(0);
  });

  it('shows the name only when the projection has nothing else', async () => {
    const { cards } = await render([{ id: 'n1', name: 'Grok' }]);
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain('Grok');
    for (const field of ['description', 'level', 'life-bar', 'life-numbers', 'attribute', 'equipment']) {
      expect(cards()[0].querySelector(`[data-field="${field}"]`)).toBeNull();
    }
  });

  it('shows the fields of the projection', async () => {
    const { cards } = await render([
      {
        id: 'n1', name: 'Grok', description: 'A grumpy ogre.', level: 3, lifeBar: { percent: 40 },
        life: { current: 4, max: 10 },
        attributes: [{ name: 'Life', current: 4, max: 10 }, { name: 'Strength', current: 5, max: 5 }],
        equipment: [{ name: 'Iron Helm' }],
      },
    ]);
    const card = cards()[0];
    expect(card.querySelector('[data-field="description"]')!.textContent).toContain('A grumpy ogre.');
    expect(card.querySelector('[data-field="level"]')!.textContent).toContain('3');
    expect(card.querySelector('[data-field="life-bar"]')!.getAttribute('data-percent')).toBe('40');
    expect(card.querySelector('[data-field="life-numbers"]')!.textContent!.replace(/\s+/g, ' ')).toContain('4 / 10');
    const attributes = Array.from(card.querySelectorAll('[data-field="attribute"]')).map((a) => a.textContent!.replace(/\s+/g, ' ').trim());
    expect(attributes).toEqual(['Life 4 / 10', 'Strength 5 / 5']);
    expect(card.querySelector('[data-field="equipment"]')!.textContent).toContain('Iron Helm');
  });

  it('shows several NPCs at once', async () => {
    const { cards } = await render([{ id: 'n1', name: 'Grok' }, { id: 'n2', name: 'Mira' }]);
    expect(cards().map((c) => c.textContent)).toEqual([expect.stringContaining('Grok'), expect.stringContaining('Mira')]);
  });
});

/**
 * Merchant cards: a PublicNpc with `merchant: true`; inputs `shopsOpen` (npc ids whose shop is open: for the player, open for
 * them; for the GM, open) and `gameMaster` (boolean). A player gets `[data-action="visit-shop"]` on an open merchant card only,
 * which emits `visitShop` with the npc id. The GM gets `[data-action="toggle-shop"]` on every merchant card, which emits
 * `setShop` with `{ npcId, open }` (the opposite of the current state).
 */
describe('TableNpcsComponent merchants', () => {
  const npcs: PublicNpc[] = [
    { id: 'm1', name: 'Mira', merchant: true },
    { id: 'm2', name: 'Orin', merchant: true },
    { id: 'n3', name: 'Grok' },
  ];

  async function renderShops(gameMaster: boolean, shopsOpen: string[]) {
    TestBed.configureTestingModule({ imports: [TableNpcsComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(TableNpcsComponent);
    fixture.componentRef.setInput('npcs', npcs);
    fixture.componentRef.setInput('shopsOpen', shopsOpen);
    fixture.componentRef.setInput('gameMaster', gameMaster);
    const visited: string[] = [];
    const set: { npcId: string; open: boolean }[] = [];
    fixture.componentInstance.visitShop.subscribe((id: string) => visited.push(id));
    fixture.componentInstance.setShop.subscribe((change: { npcId: string; open: boolean }) => set.push(change));
    await fixture.whenStable();
    const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-testid="table-npc"]'));
    return { cards, visited, set };
  }

  it('lets a player visit a merchant only while the shop is open for them', async () => {
    const { cards, visited } = await renderShops(false, ['m1']);
    expect(cards[0].querySelector('[data-action="visit-shop"]')).not.toBeNull();
    expect(cards[1].querySelector('[data-action="visit-shop"]')).toBeNull();
    expect(cards[2].querySelector('[data-action="visit-shop"]')).toBeNull();
    expect(cards[0].querySelector('[data-action="toggle-shop"]')).toBeNull();
    (cards[0].querySelector('[data-action="visit-shop"]') as HTMLElement).click();
    expect(visited).toEqual(['m1']);
  });

  it('gives the GM an open / close control on every merchant card', async () => {
    const { cards, set } = await renderShops(true, ['m1']);
    expect(cards[2].querySelector('[data-action="toggle-shop"]')).toBeNull();
    expect(cards[0].querySelector('[data-action="visit-shop"]')).toBeNull();
    (cards[0].querySelector('[data-action="toggle-shop"]') as HTMLElement).click();
    (cards[1].querySelector('[data-action="toggle-shop"]') as HTMLElement).click();
    expect(set).toEqual([{ npcId: 'm1', open: false }, { npcId: 'm2', open: true }]);
  });
});
