import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { ItemCatalogueComponent } from './item-catalogue.component';

/**
 * Contract (ticket ML05): no "Add the default items" button (`[data-action="add-defaults"]`) at any width, and no
 * `addDefaults` output; the toolbar exposes `[data-field="filters"]` holding `[data-field="rarity-filter"]` and
 * `[data-field="type-filter"]` (the phone layout puts them 50 % each on one line), `[data-field="price-filter"]`
 * holding the slider, and the `[data-action="create"]` button, in that order after `[data-field="search"]`.
 */
describe('ItemCatalogueComponent phone toolbar', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [ItemCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ItemCatalogueComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { el, component: fixture.componentInstance as any, q: (s: string) => el.querySelector<HTMLElement>(s) };
  }

  it('has no "Add the default items" button and no addDefaults output', async () => {
    const { el, component } = await setup();
    expect(el.querySelector('[data-action="add-defaults"]')).toBeNull();
    expect(el.textContent).not.toContain('Add the default items');
    expect(component.addDefaults).toBeUndefined();
    expect(el.querySelector('[data-action="import-packs"]')).not.toBeNull();
  });

  it('puts the rarity and type filters together in one filters row', async () => {
    const { q } = await setup();
    const row = q('[data-field="filters"]');
    expect(row).not.toBeNull();
    expect(row!.querySelector('[data-field="rarity-filter"]')).not.toBeNull();
    expect(row!.querySelector('[data-field="type-filter"]')).not.toBeNull();
    expect(row!.querySelector('[data-field="search"]')).toBeNull();
    expect(row!.querySelector('[data-field="price-filter"]')).toBeNull();
  });

  it('orders the toolbar: search, filters row, price slider, New item', async () => {
    const { q } = await setup();
    const order = ['[data-field="search"]', '[data-field="filters"]', '[data-field="price-filter"]', '[data-action="create"]'].map(
      (s) => q(s),
    );
    order.forEach((n) => expect(n).not.toBeNull());
    expect(order[2]!.querySelector('p-slider')).not.toBeNull();
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i]!.compareDocumentPosition(order[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
