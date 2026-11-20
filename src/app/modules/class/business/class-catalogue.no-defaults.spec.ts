import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { SandboxClassCatalogueBusiness } from '../../tools/business/sandbox-class-catalogue.business';
import { ClassCatalogueComponent } from '../components/class-catalogue/class-catalogue.component';
import { ClassCatalogueBusiness } from './class-catalogue.business';

describe('the class catalogue has no "Add default classes and skills" any more', () => {
  it('shows no add-defaults button, only "Import from the packs"', async () => {
    TestBed.configureTestingModule({ imports: [ClassCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ClassCatalogueComponent);
    fixture.componentRef.setInput('classes', []);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-action="add-defaults"]')).toBeNull();
    expect(root.querySelector('[data-action="import-packs"]')).not.toBeNull();
  });

  it('has no addDefaults on the game master business', () => {
    TestBed.configureTestingModule({ providers: TEST_PROVIDERS });

    expect('addDefaults' in TestBed.inject(ClassCatalogueBusiness)).toBe(false);
  });

  it('has no addDefaults on the sandbox business', () => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS, SandboxClassCatalogueBusiness] });

    expect('addDefaults' in TestBed.inject(SandboxClassCatalogueBusiness)).toBe(false);
  });
});
