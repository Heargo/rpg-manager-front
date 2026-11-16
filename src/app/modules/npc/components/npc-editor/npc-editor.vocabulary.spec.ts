import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { NpcVocabularyBusiness } from '../../../../core/business/npc-vocabulary.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { buildNpcVocabulary } from '../../../../core/generators/npc-vocabulary';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Npc } from '../../models/npc';
import { NpcEditorComponent } from './npc-editor.component';

/** One creature kind, "Zircon", always named after its noun. */
const vocabulary = buildNpcVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: { beast: { roles: ['enemy'], person: false }, zircon: { parent: 'beast' } },
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

describe('NpcEditorComponent with the pooled vocabulary', () => {
  const world = createSandboxWorld((key) => key);
  const goblin = {
    id: 'n1', name: 'Goblin', description: 'Sneaky.', roles: ['enemy'], level: 2, xp: 100, statPoints: 0, money: 15,
    updatedAt: 1, skillPoints: 0, skills: [], xpReward: 30, loot: [], attributes: [], inventory: [], kind: 'wolf',
  } as Npc & { kind: string };

  async function setup(npc?: Npc) {
    TestBed.configureTestingModule({
      imports: [NpcEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: NpcVocabularyBusiness, useValue: { vocabulary: async () => vocabulary } },
      ],
    });
    const fixture = TestBed.createComponent(NpcEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (npc) fixture.componentRef.setInput('npc', npc);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const saved: Npc[] = [];
    fixture.componentInstance.save.subscribe((n: Npc) => saved.push(n));
    const click = async (name: string) => {
      el.querySelector<HTMLElement>(`[data-action="${name}"]`)!.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { el, click, saved };
  }

  it('has no Pack select next to the seed', async () => {
    const { el } = await setup();
    expect(el.querySelector('[data-field="pack"]')).toBeNull();
  });

  it('generates from the pooled vocabulary and keeps the kind on save', async () => {
    const { el, click, saved } = await setup();
    await click('generate-seed');

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zircon');
    expect(el.querySelector<HTMLInputElement>('[data-field="description"]')!.value).toBe('Brille.');
    expect(JSON.parse(el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value)).toMatchObject({
      kind: 'zircon',
      roles: ['enemy'],
    });

    await click('save');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Zircon', kind: 'zircon', roles: ['enemy'] });
  });

  it('keeps the kind of the NPC being edited when saving', async () => {
    const { click, saved } = await setup(goblin);
    await click('save');
    expect(saved[0]).toMatchObject({ id: 'n1', kind: 'wolf' });
  });
});
