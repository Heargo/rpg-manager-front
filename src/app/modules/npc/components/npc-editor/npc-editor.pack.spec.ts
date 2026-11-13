import { TestBed } from '@angular/core/testing';
import { packChoiceProviders, packOptionValues, packSelect, packSelected } from '../../../../../testing/pack-choice-fixtures';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { NpcEditorComponent } from './npc-editor.component';

/** Hook: `p-select[data-field="pack"]` next to the seed; options are pack ids, `'random'` first. */
describe('NpcEditorComponent pack choice', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [...TEST_PROVIDERS, packChoiceProviders()],
    });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    await TestBed.inject(PackBusiness).enable('extra');
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    await settle();
    return { fixture, el: fixture.nativeElement as HTMLElement, settle };
  }

  it('lists Random then the packs with NPC names in the language, defaulting to Random', async () => {
    const { fixture } = await setup();

    expect(packOptionValues(fixture)).toEqual(['random', 'base-fr', 'extra']);
    expect(packSelected(fixture)).toBe('random');
  });

  it('generates from the seed with the chosen pack names', async () => {
    const { fixture, el, settle } = await setup();
    packSelect(fixture).triggerEventHandler('ngModelChange', 'extra');
    const seed = el.querySelector<HTMLInputElement>('[data-field="seed"]')!;
    seed.value = 'fixed-seed';
    seed.dispatchEvent(new Event('input'));
    await settle();

    el.querySelector<HTMLElement>('[data-action="generate-seed"]')!.click();
    await settle();

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zorg');
  });
});
