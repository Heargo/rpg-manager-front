import { TestBed } from '@angular/core/testing';
import en from '../../../../../../public/packs/base-en/generators/skills.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { SkillEditorComponent } from './skill-editor.component';

/** `PackBusiness.wordList` is mocked. `[data-action="random"]` fills the form and the JSON. */
describe('SkillEditorComponent Random', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };

  async function setup() {
    TestBed.configureTestingModule({
      imports: [SkillEditorComponent],
      providers: [...TEST_PROVIDERS, { provide: PackBusiness, useValue: { wordList: async () => en, packsFor: async () => ['base-en'], $installed: () => [] } }],
    });
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', world);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { fixture, el, settle };
  }

  it('has a Random button with the sparkles icon next to Save', async () => {
    const { el } = await setup();
    const random = el.querySelector<HTMLElement>('[data-action="random"]')!;
    const save = el.querySelector<HTMLElement>('[data-action="save"]')!;
    expect(random.parentElement).toBe(save.parentElement);
    expect(random.textContent).toContain('Random');
    expect(random.querySelector('.pi-sparkles') ?? (random.className.includes('pi-sparkles') ? random : null)).not.toBeNull();
  });

  it('fills the form with a generated skill on the world attributes, and a new one per click', async () => {
    const { el, settle } = await setup();
    const random = el.querySelector<HTMLElement>('[data-action="random"]')!;
    const json = () => el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value;

    random.click();
    await settle();
    const first = JSON.parse(json());
    expect(first.name).not.toBe('');
    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe(first.name);
    expect(first.effects.length).toBeGreaterThan(0);
    for (const effect of first.effects) expect(['Wit', 'Grit']).toContain(effect.attribute);

    random.click();
    await settle();
    expect(json()).not.toBe(JSON.stringify(first, null, 2));
  });
});
