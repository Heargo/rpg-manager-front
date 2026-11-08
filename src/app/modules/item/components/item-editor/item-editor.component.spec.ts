import { TestBed } from '@angular/core/testing';
import en from '../../../../../../public/i18n/generators/en/items.json';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WordListService } from '../../../../core/services/word-list.service';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item, World } from '../../../world/models/world';
import { ItemEditorComponent } from './item-editor.component';

/**
 * Hooks the template must expose (all tab panels rendered, hidden or not): form fields `[data-field]` =
 * `name`, `description`, `price` (the coin input: gold, silver and copper fields inside), `json` (textarea), `seed` (input); buttons `[data-action]` =
 * `generate`, `reroll`, `copy-prompt`, `save`; `[data-field="json-error"]` shown only while the JSON is invalid.
 */
describe('ItemEditorComponent', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const charm: Item = {
    id: 'charm',
    imageId: 'img-1',
    name: 'Moon Charm',
    description: 'Glows.',
    rarity: 'rare',
    type: 'item',
    slot: 'none',
    price: 12,
    modifiers: [{ attribute: 'Wit', value: 2 }],
  };

  async function setup(item?: Item) {
    TestBed.configureTestingModule({
      imports: [ItemEditorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: WordListService, useValue: { loadItemWords: async () => en } },
      ],
    });
    const fixture = TestBed.createComponent(ItemEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (item) fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    // The price is a coin input: its copper field stands for it in these tests.
    const field = (name: string) =>
      el.querySelector<HTMLInputElement>(
        name === 'price'
          ? '[data-field="price"] input[name="copper"]'
          : `[data-field="${name}"]`,
      )!;
    const action = (name: string) =>
      el.querySelector<HTMLElement>(`[data-action="${name}"]`)!;
    const type = async (name: string, value: string) => {
      const host = field(name);
      // Number fields are p-inputnumber hosts: drive the inner input and commit on blur.
      const input = host.matches('input') ? host : ((host as HTMLElement).querySelector('input') ?? host);
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const click = async (name: string) => {
      action(name).click();
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await fixture.whenStable();
      }
    };
    const saved: Item[] = [];
    fixture.componentInstance.save.subscribe((i: Item) => saved.push(i));
    return { fixture, el, field, action, type, click, saved };
  }

  it('fills the form and the JSON from the item being edited', async () => {
    const { field } = await setup(charm);
    expect(field('name').value).toBe('Moon Charm');
    expect(field('price').value).toBe('12');
    expect(JSON.parse(field('json').value)).toMatchObject({
      name: 'Moon Charm',
      modifiers: [{ attribute: 'Wit', value: 2 }],
    });
  });

  it('keeps the JSON in sync with the form', async () => {
    const { field, type } = await setup(charm);
    await type('name', 'Sun Charm');
    expect(JSON.parse(field('json').value).name).toBe('Sun Charm');
  });

  it('keeps the form in sync with valid JSON', async () => {
    const { field, type } = await setup(charm);
    await type('json', JSON.stringify({ ...JSON.parse(field('json').value), name: 'Star Charm', price: 7 }));
    expect(field('name').value).toBe('Star Charm');
    expect(field('price').value).toBe('7');
  });

  it('blocks saving while the JSON is invalid', async () => {
    const { field, click, type, el, saved } = await setup(charm);
    await type('json', '{ nope');
    expect(el.querySelector('[data-field="json-error"]')).not.toBeNull();
    await click('save');
    expect(saved).toEqual([]);

    await type('json', JSON.stringify({ ...charm, id: undefined, imageId: undefined }));
    expect(el.querySelector('[data-field="json-error"]')).toBeNull();
  });

  it('blocks saving a modifier on an attribute the world does not have', async () => {
    const { field, click, type, saved } = await setup(charm);
    const json = JSON.parse(field('json').value);
    await type('json', JSON.stringify({ ...json, modifiers: [{ attribute: 'Luck', value: 1 }] }));
    await click('save');
    expect(saved).toEqual([]);
  });

  it('emits the edited item with its id and image', async () => {
    const { type, click, saved } = await setup(charm);
    await type('name', 'Sun Charm');
    await click('save');
    expect(saved).toEqual([{ ...charm, name: 'Sun Charm' }]);
  });

  it('emits a new item without an id when creating', async () => {
    const { type, click, saved } = await setup();
    await type('name', 'Fresh Blade');
    await type('price', '30');
    await click('save');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Fresh Blade', price: 30 });
    expect(saved[0].id).toBeUndefined();
  });

  it('generates an item from the visible seed on the world attributes', async () => {
    const { field, type, click } = await setup();
    await type('seed', 'fixed-seed');
    await click('generate');
    const first = field('name').value;
    expect(first).not.toBe('');
    const json = JSON.parse(field('json').value);
    expect(
      json.modifiers.every((m: { attribute: string }) => ['Wit', 'Grit'].includes(m.attribute)),
    ).toBe(true);

    await type('name', 'changed');
    await click('generate');
    expect(field('name').value).toBe(first);
  });

  it('rerolls to a new visible seed and another item', async () => {
    const { field, type, click } = await setup();
    await type('seed', 'fixed-seed');
    await click('generate');
    const first = field('name').value;

    await click('reroll');
    expect(field('seed').value).not.toBe('fixed-seed');
    expect(field('seed').value).not.toBe('');
    expect(field('name').value).not.toBe(first);
  });

  it('copies a prompt that names the world attributes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { click } = await setup();
    await click('copy-prompt');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Wit');
    expect(writeText.mock.calls[0][0]).toContain('Grit');
  });
});
