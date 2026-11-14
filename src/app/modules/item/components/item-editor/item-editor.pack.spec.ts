import { openWorldWithPacks } from '../../../../../testing/active-packs';
import { TestBed } from '@angular/core/testing';
import { packChoiceProviders, packOptionValues, packSelect, packSelected } from '../../../../../testing/pack-choice-fixtures';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { ItemEditorComponent } from './item-editor.component';

/** Hook: `p-select[data-field="pack"]` next to the seed; options are pack ids, `'random'` first. */
describe('ItemEditorComponent pack choice', () => {
  async function setup(worldPacks?: string[]) {
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [...TEST_PROVIDERS, packChoiceProviders()],
    });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    await TestBed.inject(PackBusiness).enable('extra');
    if (worldPacks) await openWorldWithPacks(worldPacks);
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', createSandboxWorld((key) => key));
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    await settle();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, settle };
  }

  it('lists Random then the world packs with items, defaulting to Random', async () => {
    const { fixture } = await setup(['base-fr', 'extra']);

    expect(packOptionValues(fixture)).toEqual(['random', 'base-fr', 'extra']);
    expect(packSelected(fixture)).toBe('random');
  });

  it('lists Random and the Base of the app language when no world is open, even with a pack downloaded', async () => {
    const { fixture } = await setup();

    expect(packOptionValues(fixture)).toEqual(['random', 'base-fr']);
  });

  it('lists the world packs whatever their language and the app language', async () => {
    const { fixture, settle } = await setup(['base-en', 'extra']);
    TestBed.inject(LanguageBusiness).setLanguage('en');
    await settle();

    expect(packOptionValues(fixture)).toEqual(['random', 'base-en', 'extra']);
  });

  it('generates from the seed with the chosen pack words', async () => {
    const { fixture, el, settle } = await setup(['base-fr', 'extra']);
    packSelect(fixture).triggerEventHandler('ngModelChange', 'extra');
    const seed = el.querySelector<HTMLInputElement>('[data-field="seed"]')!;
    seed.value = 'fixed-seed';
    seed.dispatchEvent(new Event('input'));
    await settle();

    el.querySelector<HTMLElement>('[data-action="generate-seed"]')!.click();
    await settle();

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zircon');
  });

  it('generates with Base words when Base is chosen', async () => {
    const { fixture, el, settle } = await setup(['base-fr', 'extra']);
    packSelect(fixture).triggerEventHandler('ngModelChange', 'base-fr');
    const seed = el.querySelector<HTMLInputElement>('[data-field="seed"]')!;
    seed.value = 'fixed-seed';
    seed.dispatchEvent(new Event('input'));
    await settle();

    el.querySelector<HTMLElement>('[data-action="generate-seed"]')!.click();
    await settle();

    const name = el.querySelector<HTMLInputElement>('[data-field="name"]')!.value;
    expect(name).not.toBe('');
    expect(name).not.toContain('Zircon');
  });
});
