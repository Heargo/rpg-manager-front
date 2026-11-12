import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { Item } from '../../../world/models/world';
import { Skill } from '../../../skill/models/skill';
import { CharacterClass } from '../../models/class';
import { ClassCatalogueComponent } from './class-catalogue.component';

/**
 * Hooks: each card (`[data-field="class"]`) has `[data-action="view"]`. It opens a dialog (queried on the document)
 * `[data-field="class-details"]` holding the name (`[data-field="details-name"]`), description
 * (`[data-field="details-description"]`), one `[data-field="details-bonus"]` per bonus, one
 * `[data-field="details-item"]` per starting item (by item name), the read-only `app-skill-tree`, and a
 * `[data-skill="<skillId>"]` block per tree skill with its name and description. Clicking a tree node
 * (`[data-tree-node]`) scrolls its `[data-skill]` block into view. Inputs added: `skills` and `items` (catalogues).

 * Row contract (list rework): each `[data-field="class"]` is one row with `[data-field="class-name"]`,
 * `[data-field="class-bonuses"]` (summary, e.g. "Life +5"), `[data-field="class-skill-count"]` (tree length) and an
 * `app-stored-image` when the class has an imageId. The View/Edit/Delete hooks are unchanged.
 */
describe('ClassCatalogueComponent', () => {
  const skill = (id: string, name: string, description: string): Skill => ({
    id, name, description, rarity: 'common', type: 'passive', maxRank: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'rank', duration: 0 }],
  });
  const skills = [skill('s1', 'Slash', 'A fast cut.'), skill('s2', 'Parry', 'Turns a blow aside.')];
  const items: Item[] = [
    { id: 'i1', name: 'Iron Sword', description: '', rarity: 'common', type: 'item', slot: 'none', price: 5, modifiers: [] },
  ];
  const warrior: CharacterClass = {
    id: 'c1', name: 'Warrior', description: 'Fights in melee.',
    bonuses: [{ attribute: 'Life', value: 5 }],
    startingItems: ['i1'],
    tree: [
      { skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 },
      { skillId: 's2', requires: [{ skillId: 's1', rank: 1 }], minLevel: 2, column: 1, row: 0 },
    ],
  };
  const mage: CharacterClass = { id: 'c2', name: 'Mage', description: 'Casts.', tree: [], imageId: 'img-mage' };

  async function setup() {
    TestBed.configureTestingModule({ imports: [ClassCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(ClassCatalogueComponent);
    fixture.componentRef.setInput('classes', [warrior, mage]);
    fixture.componentRef.setInput('skills', skills);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const view = async (index: number) => {
      el.querySelectorAll<HTMLElement>('[data-field="class"]')[index].querySelector<HTMLElement>('[data-action="view"]')!.click();
      await fixture.whenStable();
      return document.body.querySelector<HTMLElement>('[data-field="class-details"]');
    };
    return { fixture, el, view };
  }

  it('gives every card a View button', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('[data-field="class"] [data-action="view"]')).toHaveLength(2);
  });

  it('shows no details until View is pressed', async () => {
    await setup();
    expect(document.body.querySelector('[data-field="class-details"]')).toBeNull();
  });

  it('opens the details with the name, description, bonuses and starting items', async () => {
    const { view } = await setup();
    const details = (await view(0))!;
    expect(details).not.toBeNull();
    expect(details.querySelector('[data-field="details-name"]')!.textContent).toContain('Warrior');
    expect(details.querySelector('[data-field="details-description"]')!.textContent).toContain('Fights in melee.');
    expect(details.querySelectorAll('[data-field="details-bonus"]')).toHaveLength(1);
    expect(details.querySelector('[data-field="details-bonus"]')!.textContent).toContain('Life');
    expect(details.querySelector('[data-field="details-bonus"]')!.textContent).toContain('5');
    expect(details.querySelector('[data-field="details-item"]')!.textContent).toContain('Iron Sword');
  });

  it('shows the read-only tree and the skills of the class with their descriptions', async () => {
    const { view } = await setup();
    const details = (await view(0))!;
    expect(details.querySelector('app-skill-tree')).not.toBeNull();
    expect(details.querySelectorAll('[data-skill]')).toHaveLength(2);
    expect(details.querySelector('[data-skill="s1"]')!.textContent).toContain('Slash');
    expect(details.querySelector('[data-skill="s1"]')!.textContent).toContain('A fast cut.');
    expect(details.querySelector('[data-skill="s2"]')!.textContent).toContain('Turns a blow aside.');
  });

  it('scrolls to a skill when its tree node is tapped', async () => {
    const { fixture, view } = await setup();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const details = (await view(0))!;
    details.querySelector<HTMLElement>('[data-tree-node="s2"]')!.click();
    await fixture.whenStable();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(details.querySelector('[data-skill="s2"]'));
  });

  it('renders one row per class with name, bonuses summary and skill count', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll<HTMLElement>('[data-field="class"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[data-field="class-name"]')!.textContent).toContain('Warrior');
    expect(rows[0].querySelector('[data-field="class-bonuses"]')!.textContent).toContain('Life');
    expect(rows[0].querySelector('[data-field="class-bonuses"]')!.textContent).toContain('+5');
    expect(rows[0].querySelector('[data-field="class-skill-count"]')!.textContent).toContain('2');
    expect(rows[1].querySelector('[data-field="class-skill-count"]')!.textContent).toContain('0');
  });

  it('shows the class image in its row when it has one', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll<HTMLElement>('[data-field="class"]');
    expect(rows[0].querySelector('app-stored-image')).toBeNull();
    expect(rows[1].querySelector('app-stored-image')).not.toBeNull();
  });

  it('keeps Edit and Delete on each row', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('[data-field="class"] [data-action="edit"]')).toHaveLength(2);
    expect(el.querySelectorAll('[data-field="class"] [data-action="delete"]')).toHaveLength(2);
  });
});
