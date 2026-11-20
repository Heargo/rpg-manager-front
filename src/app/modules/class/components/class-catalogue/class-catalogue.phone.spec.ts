import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ClassCatalogueComponent } from './class-catalogue.component';

/**
 * Contract (ticket ML01): the toolbar is `[data-field="toolbar"]` and holds, as direct children and in this order,
 * the search input (`[data-field="search"]`), "New class" (`[data-action="create"]`) and "Import from the packs"
 * (`[data-action="import-packs"]`), so the phone layout can stack search and New class at full width. The removal of
 * "Add the default classes and skills" is already covered by `class-catalogue.no-defaults.spec.ts`.
 */
describe('ClassCatalogueComponent phone toolbar', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [ClassCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ClassCatalogueComponent);
    fixture.componentRef.setInput('classes', []);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { q: (s: string) => el.querySelector<HTMLElement>(s) };
  }

  it('has a toolbar holding search, New class and Import from the packs as direct children, in order', async () => {
    const { q } = await setup();
    const toolbar = q('[data-field="toolbar"]');
    expect(toolbar).not.toBeNull();
    const kids = Array.from(toolbar!.children);
    expect(kids.map((k) => k.getAttribute('data-field') ?? k.getAttribute('data-action'))).toEqual([
      'search',
      'create',
      'import-packs',
    ]);
  });

  it('marks search and New class with the classes the phone layout targets', async () => {
    const { q } = await setup();
    expect(q('[data-field="search"]')!.classList.contains('search')).toBe(true);
    expect(q('[data-action="create"]')!.classList.contains('create')).toBe(true);
  });
});
