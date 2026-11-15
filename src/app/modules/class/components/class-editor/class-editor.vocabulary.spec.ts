import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ClassVocabularyBusiness } from '../../../../core/business/class-vocabulary.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { SkillVocabularyBusiness } from '../../../../core/business/skill-vocabulary.business';
import { buildClassVocabulary } from '../../../../core/generators/class-vocabulary';
import { buildSkillVocabulary } from '../../../../core/generators/skill-vocabulary';
import { Skill } from '../../../skill/models/skill';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { CharacterClass } from '../../models/class';
import { ClassEditorComponent } from './class-editor.component';

/** One class kind, "Zircon", favouring the "trait" skill kinds, always named after its noun. */
const classVocabulary = buildClassVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: { gem: { skills: ['trait'] }, zircon: { parent: 'gem' } },
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
const skillVocabulary = buildSkillVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: { trait: { type: 'passive' }, sturdy: { parent: 'trait' }, attack: { type: 'active' } },
    texts: { version: 2 },
    params: {},
  },
]);

describe('ClassEditorComponent with the pooled vocabularies', () => {
  const skill = (id: string, kind?: string): Skill => ({
    id, name: id, description: '', rarity: 'common', type: 'passive', maxLevel: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
    ...(kind ? { kind } : {}),
  });
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'mana', name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
    skills: [skill('s1', 'sturdy'), skill('s2', 'sturdy'), skill('s3', 'sturdy'), skill('s4', 'attack'), skill('s5')],
  };
  const existing: CharacterClass & { kind: string } = {
    id: 'c1', name: 'Gardien', description: 'Garde.', kind: 'zircon',
    tree: [{ skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 }],
  };

  async function setup(characterClass?: CharacterClass) {
    TestBed.configureTestingModule({
      imports: [ClassEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: ClassVocabularyBusiness, useValue: { vocabulary: async () => classVocabulary } },
        { provide: SkillVocabularyBusiness, useValue: { vocabulary: async () => skillVocabulary } },
      ],
    });
    const fixture = TestBed.createComponent(ClassEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (characterClass) fixture.componentRef.setInput('characterClass', characterClass);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const saved: CharacterClass[] = [];
    fixture.componentInstance.save.subscribe((c: CharacterClass) => saved.push(c));
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

  it('generates from the pooled vocabularies, on the world skills of the favoured kinds, and keeps the kind on save', async () => {
    const { el, click, saved } = await setup();
    await click('random');

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zircon');
    expect(el.querySelector<HTMLInputElement>('[data-field="description"]')!.value).toBe('Brille.');
    const json = JSON.parse(el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value);
    expect(json.kind).toBe('zircon');
    expect(json.tree.map((n: { skillId: string }) => n.skillId).sort()).toEqual(['s1', 's2', 's3']);

    await click('save');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Zircon', kind: 'zircon' });
  });

  it('keeps the kind of the class being edited when saving', async () => {
    const { click, saved } = await setup(existing);
    await click('save');
    expect(saved[0]).toMatchObject({ id: 'c1', kind: 'zircon' });
  });
});
