import { TestBed } from '@angular/core/testing';
import { packChoiceProviders, packOptionValues, packSelect, packSelected } from '../../../../../testing/pack-choice-fixtures';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { ItemGeneratorPageComponent } from './item-generator-page.component';

/** Hook: `p-select[data-field="pack"]` next to the seed; options are pack ids, `'random'` first. */
describe('ItemGeneratorPageComponent pack choice', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [ItemGeneratorPageComponent],
      providers: [...TEST_PROVIDERS, packChoiceProviders()],
    });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    await TestBed.inject(PackBusiness).enable('extra');
    const fixture = TestBed.createComponent(ItemGeneratorPageComponent);
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    await settle();
    return { fixture, el: fixture.nativeElement as HTMLElement, settle };
  }

  it('lists Random then the packs with items in the language, defaulting to Random', async () => {
    const { fixture } = await setup();

    expect(packOptionValues(fixture)).toEqual(['random', 'base', 'extra']);
    expect(packSelected(fixture)).toBe('random');
  });

  it('shows an item made of the chosen pack words for the seed', async () => {
    const { fixture, el, settle } = await setup();

    packSelect(fixture).triggerEventHandler('ngModelChange', 'extra');
    await settle();

    expect(el.textContent).toContain('Zircon');
  });

  it('shows Base words when Base is chosen', async () => {
    const { fixture, el, settle } = await setup();

    packSelect(fixture).triggerEventHandler('ngModelChange', 'base');
    await settle();

    expect(el.querySelector('app-item-card')).not.toBeNull();
    expect(el.textContent).not.toContain('Zircon');
  });
});
