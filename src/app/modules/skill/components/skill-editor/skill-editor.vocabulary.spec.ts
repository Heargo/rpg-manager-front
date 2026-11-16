import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { SkillVocabularyBusiness } from '../../../../core/business/skill-vocabulary.business';
import { buildSkillVocabulary } from '../../../../core/generators/skill-vocabulary';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../models/skill';
import { SkillEditorComponent } from './skill-editor.component';

/** One passive kind, "Zircon", always named after its noun. */
const vocabulary = buildSkillVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: { trait: { type: 'passive' }, zircon: { parent: 'trait' } },
    texts: {
      version: 2,
      kinds: {
        zircon: {
          nouns: [{ text: 'Zircon', gender: 'm' }],
          descriptions: ['Brille.'],
          names: ['{noun}'],
        },
      },
    },
    params: {},
  },
]);

describe('SkillEditorComponent with the pooled vocabulary', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const dash: Skill & { kind: string } = {
    id: 's1', name: 'Strike', description: 'Hit.', rarity: 'common', type: 'active', maxLevel: 2, pointCost: 1,
    target: 'one-enemy', cooldown: 0, effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 4' }],
    kind: 'strike',
  };

  async function setup(skill?: Skill) {
    TestBed.configureTestingModule({
      imports: [SkillEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: SkillVocabularyBusiness, useValue: { vocabulary: async () => vocabulary } },
      ],
    });
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (skill) fixture.componentRef.setInput('skill', skill);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const saved: Skill[] = [];
    fixture.componentInstance.save.subscribe((s: Skill) => saved.push(s));
    const click = async (name: string) => {
      el.querySelector<HTMLElement>(`[data-action="${name}"]`)!.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { el, click, saved };
  }

  it('has no Pack select', async () => {
    const { el } = await setup();
    expect(el.querySelector('[data-field="pack"]')).toBeNull();
  });

  it('generates from the pooled vocabulary and keeps the kind on save', async () => {
    const { el, click, saved } = await setup();
    await click('random');

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zircon');
    expect(el.querySelector<HTMLInputElement>('[data-field="description"]')!.value).toBe('Brille.');
    expect(JSON.parse(el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value)).toMatchObject({
      kind: 'zircon',
      type: 'passive',
    });

    await click('save');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Zircon', kind: 'zircon', type: 'passive' });
  });

  it('keeps the kind of the skill being edited when saving', async () => {
    const { click, saved } = await setup(dash);
    await click('save');
    expect(saved[0]).toMatchObject({ id: 's1', kind: 'strike' });
  });
});
