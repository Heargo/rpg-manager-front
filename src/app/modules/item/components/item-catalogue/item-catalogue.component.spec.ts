import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item, World } from '../../../world/models/world';
import { ItemCatalogueComponent } from './item-catalogue.component';

const item = (id: string, name: string, rarity: Item['rarity']): Item => ({
  id,
  name,
  description: '',
  rarity,
  type: 'item',
  slot: 'none',
  price: 5,
  modifiers: [],
});
const sword: Item = { ...item('sword', 'Iron Sword', 'common'), imageId: 'img-sword' };
const potion = item('potion', 'Healing Potion', 'rare');

/**
 * Hooks the template must expose: an inventory grid of `[data-field="slot"]` buttons, one per item, each with
 * `[data-rarity="<rarity>"]`, the name, `[data-field="slot-price"]`, and either an `app-stored-image` (item has an
 * imageId) or a `[data-field="slot-kind-icon"]`. Selecting (clicking) a slot shows one `[data-field="slot-actions"]`
 * panel with `[data-action]` buttons `view` (shows an `app-item-card` of the item), `give` (only when `canGive`),
 * `edit` and `delete`; none are shown before a selection. The toolbar keeps `add-defaults` and
 * `[data-field="search"]`.
 * Adapted from the card contract: the per-card `app-item-card` list and per-card action buttons are replaced.
 */
describe('ItemCatalogueComponent', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    items: [sword, potion],
  };

  async function setup(canGive: boolean) {
    TestBed.configureTestingModule({
      imports: [ItemCatalogueComponent],
      providers: TEST_PROVIDERS,
    });
    const fixture = TestBed.createComponent(ItemCatalogueComponent);
    fixture.componentRef.setInput('world', world);
    fixture.componentRef.setInput('canGive', canGive);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const q = (selector: string) => el.querySelectorAll<HTMLElement>(selector);
    return { fixture, el, q, component: fixture.componentInstance };
  }

  async function select(ctx: Awaited<ReturnType<typeof setup>>, index: number) {
    ctx.q('[data-field="slot"]')[index].click();
    await ctx.fixture.whenStable();
  }

  it('shows one inventory slot per catalogue item, with name and price', async () => {
    const { q, el } = await setup(true);
    expect(q('[data-field="slot"]')).toHaveLength(2);
    expect(q('[data-field="slot-price"]')).toHaveLength(2);
    expect(q('app-item-card')).toHaveLength(0);
    expect(el.textContent).toContain('Iron Sword');
    expect(el.textContent).toContain('Healing Potion');
  });

  it('marks the rarity of each slot', async () => {
    const { q } = await setup(true);
    const slots = q('[data-field="slot"]');
    expect(slots[0].getAttribute('data-rarity')).toBe('common');
    expect(slots[1].getAttribute('data-rarity')).toBe('rare');
  });

  it('shows the image when the item has one, the kind icon otherwise', async () => {
    const { q } = await setup(true);
    const slots = q('[data-field="slot"]');
    expect(slots[0].querySelector('app-stored-image')).not.toBeNull();
    expect(slots[0].querySelector('[data-field="slot-kind-icon"]')).toBeNull();
    expect(slots[1].querySelector('[data-field="slot-kind-icon"]')).not.toBeNull();
  });

  it('narrows the grid with the search box', async () => {
    const { fixture, q } = await setup(true);
    const search = q('[data-field="search"]')[0] as HTMLInputElement;
    search.value = 'potion';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(q('[data-field="slot"]')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Healing Potion');
    expect(fixture.nativeElement.textContent).not.toContain('Iron Sword');
  });

  it('shows no actions until a slot is selected', async () => {
    const ctx = await setup(true);
    expect(ctx.q('[data-field="slot-actions"]')).toHaveLength(0);
    expect(ctx.q('[data-action="edit"]')).toHaveLength(0);
    await select(ctx, 0);
    expect(ctx.q('[data-field="slot-actions"]')).toHaveLength(1);
    expect(ctx.q('[data-action="view"]')).toHaveLength(1);
    expect(ctx.q('[data-action="edit"]')).toHaveLength(1);
  });

  it('view shows the item card of the selected item', async () => {
    const ctx = await setup(true);
    await select(ctx, 1);
    ctx.q('[data-action="view"]')[0].click();
    await ctx.fixture.whenStable();
    expect(ctx.q('app-item-card')).toHaveLength(1);
    expect(ctx.q('app-item-card')[0].textContent).toContain('Healing Potion');
  });

  it('emits the item to give when the GM can give', async () => {
    const ctx = await setup(true);
    const given: Item[] = [];
    ctx.component.give.subscribe((i: Item) => given.push(i));
    await select(ctx, 0);
    ctx.q('[data-action="give"]')[0].click();
    await ctx.fixture.whenStable();
    expect(given).toEqual([sword]);
  });

  it('hides give on a world nobody plays in (sandbox)', async () => {
    const ctx = await setup(false);
    await select(ctx, 0);
    expect(ctx.q('[data-action="give"]')).toHaveLength(0);
    expect(ctx.q('[data-action="delete"]')).toHaveLength(1);
  });

  it('emits the item to edit', async () => {
    const ctx = await setup(true);
    const edited: Item[] = [];
    ctx.component.edit.subscribe((i: Item) => edited.push(i));
    await select(ctx, 0);
    ctx.q('[data-action="edit"]')[0].click();
    await ctx.fixture.whenStable();
    expect(edited).toEqual([sword]);
  });

  it('asks for confirmation before emitting delete', async () => {
    const ctx = await setup(true);
    const confirm = vi
      .spyOn(TestBed.inject(ConfirmationService), 'confirm')
      .mockImplementation(() => TestBed.inject(ConfirmationService));
    const removed: Item[] = [];
    ctx.component.remove.subscribe((i: Item) => removed.push(i));

    await select(ctx, 1);
    ctx.q('[data-action="delete"]')[0].click();
    await ctx.fixture.whenStable();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([]);

    confirm.mock.calls[0][0].accept!();
    expect(removed).toEqual([potion]);
  });

  it('emits addDefaults from the toolbar', async () => {
    const { fixture, q, component } = await setup(true);
    let fired = 0;
    component.addDefaults.subscribe(() => fired++);
    q('[data-action="add-defaults"]')[0].click();
    await fixture.whenStable();
    expect(fired).toBe(1);
  });
});
