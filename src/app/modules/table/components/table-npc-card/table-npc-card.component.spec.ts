import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PublicNpc } from '../../../npc/models/npc';
import { TableNpcCardComponent } from './table-npc-card.component';

/**
 * Contract: `app-table-npc-card` (replaces `app-table-npcs`) takes `npc` (PublicNpc, required) and `shopOpen` (boolean, default false) and renders
 * one `[data-testid="table-npc"]` with the name and, only when the projection carries it: `[data-field="description"]`, `[data-field="level"]`,
 * `[data-field="life-bar"]` (`data-percent`, with "current / max" when the numbers are shown), `[data-field="attribute"]` (one per attribute,
 * "Name current / max"), `[data-field="equipment"]` (one per item). `[data-action="visit-shop"]` (label "Shop" / "Boutique") exists only
 * when the NPC is a merchant and `shopOpen` is true; its click emits `visitShop` with the npc id. No toggle-shop control any more.
 */
async function render(npc: PublicNpc, shopOpen?: boolean) {
  TestBed.configureTestingModule({ imports: [TableNpcCardComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(TableNpcCardComponent);
  fixture.componentRef.setInput('npc', npc);
  if (shopOpen !== undefined) fixture.componentRef.setInput('shopOpen', shopOpen);
  const visited: string[] = [];
  fixture.componentInstance.visitShop.subscribe((id: string) => visited.push(id));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { el, card: el.querySelector<HTMLElement>('[data-testid="table-npc"]'), visited };
}

describe('TableNpcCardComponent', () => {
  it('shows the name only when the projection has nothing else', async () => {
    const { card } = await render({ id: 'n1', name: 'Grok' });
    expect(card!.textContent).toContain('Grok');
    for (const field of ['description', 'level', 'life-bar', 'attribute', 'equipment']) {
      expect(card!.querySelector(`[data-field="${field}"]`)).toBeNull();
    }
  });

  it('shows the fields of the projection', async () => {
    const { card } = await render({
      id: 'n1', name: 'Grok', description: 'A grumpy ogre.', level: 3, lifeBar: { percent: 40 },
      life: { current: 4, max: 10 },
      attributes: [{ name: 'Life', current: 4, max: 10 }, { name: 'Strength', current: 5, max: 5 }],
      equipment: [{ name: 'Iron Helm' }],
    });
    expect(card!.querySelector('[data-field="description"]')!.textContent).toContain('A grumpy ogre.');
    expect(card!.querySelector('[data-field="level"]')!.textContent).toContain('3');
    expect(card!.querySelector('[data-field="life-bar"]')!.getAttribute('data-percent')).toBe('40');
    expect(card!.querySelector('[data-field="life-bar"]')!.textContent!.replace(/\s+/g, ' ')).toContain('4 / 10');
    const attributes = Array.from(card!.querySelectorAll('[data-field="attribute"]')).map((a) =>
      Array.from(a.children).map((part) => part.textContent!.trim()).join(' '),
    );
    expect(attributes).toEqual(['Life 4 / 10', 'Strength 5 / 5']);
    // The description sits under the card, in its own box.
    expect(card!.querySelector('app-portrait-card [data-field="description"]')).toBeNull();
    expect(card!.querySelector('[data-field="equipment"]')!.textContent).toContain('Iron Helm');
  });

  it('offers the Shop button for a merchant whose shop is open, and emits the visit', async () => {
    const { card, visited } = await render({ id: 'm1', name: 'Mira', merchant: true }, true);
    const button = card!.querySelector<HTMLElement>('[data-action="visit-shop"]')!;
    expect(button.textContent!.trim()).toBe('Shop');
    button.click();
    expect(visited).toEqual(['m1']);
  });

  it('has no Shop button while the shop is closed', async () => {
    const { card } = await render({ id: 'm1', name: 'Mira', merchant: true }, false);
    expect(card!.querySelector('[data-action="visit-shop"]')).toBeNull();
  });

  it('has no Shop button for an NPC that is not a merchant, even with the shop flag on', async () => {
    const { card } = await render({ id: 'n1', name: 'Grok' }, true);
    expect(card!.querySelector('[data-action="visit-shop"]')).toBeNull();
  });

  it('has no open / close control for the GM any more', async () => {
    const { card } = await render({ id: 'm1', name: 'Mira', merchant: true }, true);
    expect(card!.querySelector('[data-action="toggle-shop"]')).toBeNull();
  });

  it('offers the eye button to the game master only, and emits the npc id', async () => {
    const player = await render({ id: 'n1', name: 'Grok' });
    expect(player.card!.querySelector('[data-action="view-sheet"]')).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TableNpcCardComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(TableNpcCardComponent);
    fixture.componentRef.setInput('npc', { id: 'n1', name: 'Grok' });
    fixture.componentRef.setInput('canView', true);
    const viewed: string[] = [];
    fixture.componentInstance.view.subscribe((id: string) => viewed.push(id));
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-action="view-sheet"]')!.click();
    expect(viewed).toEqual(['n1']);
  });

  it('shows the life bar without numbers when only the bar is allowed', async () => {
    const { card } = await render({ id: 'n1', name: 'Grok', lifeBar: { percent: 40 } });
    const bar = card!.querySelector('[data-field="life-bar"]')!;
    expect(bar.getAttribute('data-percent')).toBe('40');
    expect(bar.textContent).not.toContain('/');
  });

  it('colours the level badge by rarity when the world\'s max level is known', async () => {
    TestBed.configureTestingModule({ imports: [TableNpcCardComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(TableNpcCardComponent);
    fixture.componentRef.setInput('npc', { id: 'n1', name: 'Grok', level: 20 });
    fixture.componentRef.setInput('maxLevel', 20);
    await fixture.whenStable();
    const level = (fixture.nativeElement as HTMLElement).querySelector('[data-field="level"]')!;
    expect(level.getAttribute('data-rarity')).toBe('legendary');
    expect(level.textContent).toContain('Level 20');
  });
});
