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
const sword = item('sword', 'Iron Sword', 'common');
const potion = item('potion', 'Healing Potion', 'rare');

/**
 * Hooks the template must expose: `[data-action]` on the buttons of a card (`give`, `edit`, `delete`) and of the
 * toolbar (`add-defaults`), and `[data-field="search"]` on the search input.
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

  it('shows one card per catalogue item', async () => {
    const { q, el } = await setup(true);
    expect(q('app-item-card')).toHaveLength(2);
    expect(el.textContent).toContain('Iron Sword');
    expect(el.textContent).toContain('Healing Potion');
  });

  it('narrows the grid with the search box', async () => {
    const { fixture, q } = await setup(true);
    const search = q('[data-field="search"]')[0] as HTMLInputElement;
    search.value = 'potion';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(q('app-item-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Healing Potion');
    expect(fixture.nativeElement.textContent).not.toContain('Iron Sword');
  });

  it('emits the item to give when the GM can give', async () => {
    const { fixture, q, component } = await setup(true);
    const given: Item[] = [];
    component.give.subscribe((i: Item) => given.push(i));
    q('[data-action="give"]')[0].click();
    await fixture.whenStable();
    expect(given).toEqual([sword]);
  });

  it('hides give on a world nobody plays in (sandbox)', async () => {
    const { q } = await setup(false);
    expect(q('[data-action="give"]')).toHaveLength(0);
    expect(q('[data-action="delete"]')).toHaveLength(2);
  });

  it('hides edit until the editor exists', async () => {
    const { q } = await setup(true);
    expect(q('[data-action="edit"]')).toHaveLength(0);
  });

  it('asks for confirmation before emitting delete', async () => {
    const { fixture, q, component } = await setup(true);
    const confirm = vi
      .spyOn(TestBed.inject(ConfirmationService), 'confirm')
      .mockImplementation(() => TestBed.inject(ConfirmationService));
    const removed: Item[] = [];
    component.remove.subscribe((i: Item) => removed.push(i));

    q('[data-action="delete"]')[1].click();
    await fixture.whenStable();
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
