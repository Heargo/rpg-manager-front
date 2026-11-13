import { TestBed } from '@angular/core/testing';
import en from '../../../../../../public/packs/base/generators/en/classes.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { Skill } from '../../../skill/models/skill';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { ClassEditorComponent } from './class-editor.component';

/** `PackBusiness.wordList` is mocked. `[data-action="random"]` fills the form, the JSON and the tree. */
describe('ClassEditorComponent Random', () => {
  const skill = (id: string): Skill => ({
    id, name: id, description: '', rarity: 'common', type: 'passive', maxLevel: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
  });
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'mana', name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
    skills: ['s1', 's2', 's3', 's4'].map(skill),
  };

  async function setup() {
    TestBed.configureTestingModule({
      imports: [ClassEditorComponent],
      providers: [...TEST_PROVIDERS, { provide: PackBusiness, useValue: { wordList: async () => en } }],
    });
    const fixture = TestBed.createComponent(ClassEditorComponent);
    fixture.componentRef.setInput('world', world);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { el, settle };
  }

  it('has a Random button with the sparkles icon next to Save', async () => {
    const { el } = await setup();
    const random = el.querySelector<HTMLElement>('[data-action="random"]')!;
    const save = el.querySelector<HTMLElement>('[data-action="save"]')!;
    expect(random.parentElement).toBe(save.parentElement);
    expect(random.textContent).toContain('Random');
    expect(random.querySelector('.pi-sparkles') ?? (random.className.includes('pi-sparkles') ? random : null)).not.toBeNull();
  });

  it('fills the form with a generated class on the world skills, and a new one per click', async () => {
    const { el, settle } = await setup();
    const random = el.querySelector<HTMLElement>('[data-action="random"]')!;
    const json = () => el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value;

    random.click();
    await settle();
    const first = JSON.parse(json());
    expect(first.name).not.toBe('');
    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe(first.name);
    expect(first.tree.length).toBeGreaterThan(0);
    for (const node of first.tree) expect(['s1', 's2', 's3', 's4']).toContain(node.skillId);
    expect(el.querySelectorAll('[data-node]').length).toBe(first.tree.length);

    random.click();
    await settle();
    expect(json()).not.toBe(JSON.stringify(first, null, 2));
  });
});
