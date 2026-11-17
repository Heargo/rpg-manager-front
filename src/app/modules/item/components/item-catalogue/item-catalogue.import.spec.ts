import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { ItemCatalogueComponent } from './item-catalogue.component';

/** Contract: a `[data-action="import-packs"]` button in the toolbar emits `importPacks`. */
describe('ItemCatalogueComponent import from the packs', () => {
  it('has an "Import from the packs" button that emits importPacks', async () => {
    TestBed.configureTestingModule({ imports: [ItemCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ItemCatalogueComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    const emitted: unknown[] = [];
    (fixture.componentInstance as any).importPacks.subscribe((v: unknown) => emitted.push(v));
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-action="import-packs"]');

    expect(button).not.toBeNull();
    expect(button!.textContent!.trim()).not.toBe('');
    button!.click();
    await fixture.whenStable();

    expect(emitted).toHaveLength(1);
  });
});
