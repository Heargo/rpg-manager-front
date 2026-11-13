import { TestBed } from '@angular/core/testing';
import en from '../../../../../../public/packs/base-en/generators/items.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { PackBusiness } from '../../../../core/business/pack.business';
import { RandomItemImageBusiness } from '../../../sprite/business/random-item-image.business';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item, World } from '../../../world/models/world';
import { ItemEditorComponent } from './item-editor.component';

/** Random item images: `[data-action="random"]` and `generate-seed` also draw an image; `random-image` draws only the image. */
describe('ItemEditorComponent random image', () => {
  const world: World = createSandboxWorld((key) => key);
  const charm: Item = {
    id: 'charm',
    imageId: 'img-1',
    name: 'Moon Charm',
    description: 'Glows.',
    rarity: 'rare',
    type: 'item',
    slot: 'none',
    price: 12,
    modifiers: [],
  };

  async function setup(item?: Item, fails = false) {
    let n = 0;
    const create = vi.fn(async (_item: { name: string }, _seed: string) => {
      if (fails) throw new Error('no sprite');
      return `rand-${++n}`;
    });
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: PackBusiness, useValue: { wordList: async () => en, packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: RandomItemImageBusiness, useValue: { create } },
      ],
    });
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (item) fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const click = async (name: string) => {
      el.querySelector<HTMLElement>(`[data-action="${name}"]`)!.click();
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    const saved: Item[] = [];
    fixture.componentInstance.save.subscribe((i: Item) => saved.push(i));
    const name = () => el.querySelector<HTMLInputElement>('[data-field="name"]')!.value;
    return { el, click, saved, create, name };
  }

  it('draws an image for the item the Random button generates, from its seed', async () => {
    const { click, saved, create, name } = await setup(charm);
    await click('random');
    expect(create).toHaveBeenCalledTimes(1);
    const [item, seed] = create.mock.calls[0] as unknown as [{ name: string }, string];
    expect(item.name).toBe(name());
    expect(typeof seed).toBe('string');
    await click('save');
    expect(saved[0].imageId).toBe('rand-1');
  });

  it('re-rolls only the image with the random image button', async () => {
    const { click, saved, create, name } = await setup(charm);
    await click('random-image');
    await click('random-image');
    expect(name()).toBe('Moon Charm');
    expect((create.mock.calls[0] as unknown as [{ name: string }])[0].name).toBe('Moon Charm');
    expect(create.mock.calls[0][1]).not.toBe(create.mock.calls[1][1]);
    await click('save');
    expect(saved[0].imageId).toBe('rand-2');
  });

  it('keeps the current image when no image can be drawn', async () => {
    const { click, saved, name } = await setup(charm, true);
    await click('random');
    expect(name()).not.toBe('Moon Charm');
    await click('save');
    expect(saved[0].imageId).toBe('img-1');
  });
});
