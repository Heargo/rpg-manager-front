import { TestBed } from '@angular/core/testing';
import { baseWordSources } from '../../../../../testing/base-words';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ItemVocabularyBusiness } from '../../../../core/business/item-vocabulary.business';
import { PackBusiness } from '../../../../core/business/pack.business';
import { buildItemVocabulary } from '../../../../core/generators/item-vocabulary';
import { ITEM_RARITIES } from '../../../../core/models/item';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item } from '../../../world/models/world';
import { ItemEditorComponent } from './item-editor.component';

const perRarity = <T>(value: T) => Object.fromEntries(ITEM_RARITIES.map((r) => [r, [value]]));

/** One sword kind named "Zircon", always with the tinted adjective "ardent" (fire). */
const vocabulary = buildItemVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: { equipment: { type: 'equipment' }, weapon: { parent: 'equipment', slot: 'weapon1' }, sword: { parent: 'weapon' } },
    texts: {
      version: 2,
      kinds: { sword: { nouns: [{ text: 'Zircon', gender: 'm' }] } },
      tints: { fire: { adjectives: perRarity({ m: 'ardent', f: 'ardente' }) } },
      templates: perRarity('{base} {adjective}'),
    },
    tints: { fire: { gradient: [{ position: 0, color: '#5a0a0a' }, { position: 1, color: '#fde047' }] } },
    params: {},
  },
]);

describe('ItemEditorComponent with the pooled vocabulary', () => {
  const world = createSandboxWorld((key) => key);
  const charm: Item = {
    id: 'charm',
    name: 'Épée ardente',
    description: 'Glows.',
    rarity: 'rare',
    type: 'equipment',
    slot: 'weapon1',
    price: 12,
    modifiers: [],
    kind: 'sword',
    tints: ['fire'],
  };

  async function setup(item?: Item) {
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { ...baseWordSources('en'), packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => vocabulary } },
      ],
    });
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (item) fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const saved: Item[] = [];
    fixture.componentInstance.save.subscribe((i: Item) => saved.push(i));
    const click = async (name: string) => {
      el.querySelector<HTMLElement>(`[data-action="${name}"]`)!.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    return { fixture, el, click, saved };
  }

  it('has no Pack select next to the seed', async () => {
    const { el } = await setup();
    expect(el.querySelector('[data-field="pack"]')).toBeNull();
  });

  it('generates from the pooled vocabulary and keeps the kind and tints', async () => {
    const { el, click, saved } = await setup();
    await click('generate-seed');

    expect(el.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Zircon ardent');
    expect(JSON.parse(el.querySelector<HTMLTextAreaElement>('[data-field="json"]')!.value)).toMatchObject({
      kind: 'sword',
      tints: ['fire'],
    });

    await click('save');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Zircon ardent', kind: 'sword', tints: ['fire'] });
  });

  it('keeps the kind and tints of the item being edited when saving', async () => {
    const { click, saved } = await setup(charm);
    await click('save');
    expect(saved).toEqual([charm]);
  });
});
