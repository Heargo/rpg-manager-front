import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';

import { ClassCatalogueComponent } from './class-catalogue.component';

/** Contract: a `[data-action="import-packs"]` button in the toolbar emits `importPacks`. */
describe('ClassCatalogueComponent import from the packs', () => {
  it('has an "Import from the packs" button that emits importPacks', async () => {
    TestBed.configureTestingModule({ imports: [ClassCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ClassCatalogueComponent);
    fixture.componentRef.setInput('classes', []);
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
