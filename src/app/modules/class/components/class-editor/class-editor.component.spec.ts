import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../../skill/models/skill';
import { CharacterClass } from '../../models/class';
import { ClassEditorComponent } from './class-editor.component';

/**
 * Hooks (all tab panels rendered). Inputs: `world`, `characterClass` (optional). Output: `save`. `[data-field]`: `name`,
 * `description`, `json` (textarea), `error` (one per validation issue), `palette-search` (input). Board: `[data-board]`,
 * a node per tree skill `[data-node="<skillId>"]` with `data-column` / `data-row`, `data-invalid="true"` when a
 * validation issue involves it, a link per prerequisite `[data-link="<prereqId>><nodeId>"]` (clickable to select it).
 * Palette: `[data-palette-item="<skillId>"]` for skills not in the tree. Clicking a node opens `[data-inspector]` with
 * `[data-field="node-min-level"]` (p-inputnumber), per prerequisite `[data-field="requirement-level"]` (p-inputnumber) and
 * `[data-action="remove-requirement"]`, plus `[data-action="remove-node"]`; a selected link shows
 * `[data-action="delete-link"]`. Public drop handlers: `onPaletteDrop(skillId, cell)`, `onNodeDrop(skillId, cell)`,
 * `onLinkDrop(fromSkillId, toSkillId)`. `[data-action="save"]` emits the class, ignored while issues remain.
 */
describe('ClassEditorComponent', () => {
  const skill = (id: string): Skill => ({
    id, name: id, description: '', rarity: 'common', type: 'passive', maxLevel: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
  });
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    skills: [skill('s1'), skill('s2'), skill('s3')],
  };
  const warrior: CharacterClass = {
    id: 'c1', name: 'Warrior', description: 'Fights.',
    tree: [
      { skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 },
      { skillId: 's2', requires: [{ skillId: 's1', level: 1 }], minLevel: 2, column: 1, row: 0 },
    ],
  };

  async function setup(characterClass?: CharacterClass) {
    TestBed.configureTestingModule({ imports: [ClassEditorComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(ClassEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (characterClass) fixture.componentRef.setInput('characterClass', characterClass);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const node = (id: string) => el.querySelector<HTMLElement>(`[data-node="${id}"]`)!;
    const field = (name: string, scope: ParentNode = el, index = 0) => {
      const host = scope.querySelectorAll<HTMLInputElement>(`[data-field="${name}"]`)[index];
      return host.tagName === 'P-INPUTNUMBER' ? (host.querySelector('input') as HTMLInputElement) : host;
    };
    const type = async (name: string, value: string, scope: ParentNode = el, index = 0) => {
      const input = field(name, scope, index);
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const click = async (selector: string, scope: ParentNode = el) => {
      (selector ? scope.querySelector<HTMLElement>(selector)! : (scope as HTMLElement)).click();
      await fixture.whenStable();
    };
    const saved: CharacterClass[] = [];
    fixture.componentInstance.save.subscribe((c: CharacterClass) => saved.push(c));
    const save = async () => {
      await click('[data-action="save"]');
      await new Promise((resolve) => setTimeout(resolve, 0));
    };
    return { fixture, el, node, field, type, click, saved, save };
  }

  interface Drops {
    onPaletteDrop(skillId: string, cell: { column: number; row: number }): void;
    onNodeDrop(skillId: string, cell: { column: number; row: number }): void;
    onLinkDrop(fromSkillId: string, toSkillId: string): void;
  }
  // Not on the component yet.
  const drops = (fixture: { componentInstance: unknown }) => fixture.componentInstance as Drops;
  const cell = (column: number, row: number) => ({ column, row });

  it('fills the form and the JSON from the class and draws a node per skill and a link per prerequisite', async () => {
    const { field, node, el } = await setup(warrior);
    expect(field('name').value).toBe('Warrior');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Warrior', tree: [{ skillId: 's1' }, { skillId: 's2' }] });
    expect(node('s1').dataset['column']).toBe('0');
    expect(node('s2').dataset['column']).toBe('1');
    expect(node('s2').dataset['row']).toBe('0');
    expect(el.querySelectorAll('[data-link]')).toHaveLength(1);
    expect(el.querySelector('[data-link="s1>s2"]')).not.toBeNull();
    expect(el.querySelector('[data-field="error"]')).toBeNull();
  });

  it('lists in the palette only the skills not in the tree, filtered by its search', async () => {
    const { el, type } = await setup(warrior);
    expect(el.querySelector('[data-palette-item="s1"]')).toBeNull();
    expect(el.querySelector('[data-palette-item="s3"]')).not.toBeNull();
    await type('palette-search', 'zzz');
    expect(el.querySelector('[data-palette-item="s3"]')).toBeNull();
    await type('palette-search', 's3');
    expect(el.querySelector('[data-palette-item="s3"]')).not.toBeNull();
  });

  it('adds a palette skill at the dropped cell', async () => {
    const { fixture, el, save, saved } = await setup(warrior);
    drops(fixture).onPaletteDrop('s3', cell(3, 2));
    await fixture.whenStable();
    expect(el.querySelector('[data-palette-item="s3"]')).toBeNull();
    expect(el.querySelector<HTMLElement>('[data-node="s3"]')!.dataset['column']).toBe('3');
    await save();
    expect(saved[0].tree[2]).toMatchObject({ skillId: 's3', requires: [], minLevel: 1, column: 3, row: 2 });
  });

  it('moves a node to the dropped cell, and swaps with the node already there', async () => {
    const { fixture, save, saved } = await setup(warrior);
    drops(fixture).onNodeDrop('s2', cell(3, 2));
    drops(fixture).onNodeDrop('s1', cell(3, 2));
    await fixture.whenStable();
    await save();
    expect(saved[0].tree[0]).toMatchObject({ skillId: 's1', column: 3, row: 2 });
    expect(saved[0].tree[1]).toMatchObject({ skillId: 's2', column: 0, row: 0 });
  });

  it('makes a prerequisite of level 1 when a node is dropped on another, and draws the link', async () => {
    const { fixture, el, save, saved } = await setup(warrior);
    drops(fixture).onPaletteDrop('s3', cell(2, 0));
    drops(fixture).onLinkDrop('s2', 's3');
    await fixture.whenStable();
    expect(el.querySelector('[data-link="s2>s3"]')).not.toBeNull();
    await save();
    expect(saved[0].tree[2].requires).toEqual([{ skillId: 's2', level: 1 }]);
  });

  it('refuses a drop link that would make a cycle', async () => {
    const { fixture, el } = await setup(warrior);
    drops(fixture).onLinkDrop('s2', 's1');
    await fixture.whenStable();
    expect(el.querySelector('[data-link="s2>s1"]')).toBeNull();
    expect(el.querySelector('[data-field="error"]')).toBeNull();
  });

  it('opens the inspector on a selected node and edits its min level and prerequisite level', async () => {
    const { el, node, click, type, save, saved } = await setup(warrior);
    expect(el.querySelector('[data-inspector]')).toBeNull();
    await click('', node('s2'));
    const inspector = el.querySelector<HTMLElement>('[data-inspector]')!;
    expect(inspector.querySelector<HTMLInputElement>('[data-field="node-min-level"] input')!.value).toBe('2');
    await type('node-min-level', '4', inspector);
    await type('requirement-level', '3', inspector);
    await save();
    expect(saved[0].tree[1]).toMatchObject({ skillId: 's2', requires: [{ skillId: 's1', level: 3 }], minLevel: 4 });
  });

  it('removes a prerequisite from the inspector', async () => {
    const { el, node, click, save, saved } = await setup(warrior);
    await click('', node('s2'));
    await click('[data-action="remove-requirement"]', el.querySelector('[data-inspector]')!);
    expect(el.querySelector('[data-link]')).toBeNull();
    await save();
    expect(saved[0].tree[1].requires).toEqual([]);
  });

  it('removes a node from the tree from the inspector, with its links, and gives it back to the palette', async () => {
    const { el, node, click, save, saved } = await setup(warrior);
    await click('', node('s1'));
    await click('[data-action="remove-node"]', el.querySelector('[data-inspector]')!);
    expect(el.querySelector('[data-node="s1"]')).toBeNull();
    expect(el.querySelector('[data-link]')).toBeNull();
    expect(el.querySelector('[data-palette-item="s1"]')).not.toBeNull();
    await save();
    expect(saved[0].tree).toMatchObject([{ skillId: 's2', requires: [] }]);
  });

  it('selects a link by clicking it and deletes it', async () => {
    const { el, click, save, saved } = await setup(warrior);
    await click('', el.querySelector<HTMLElement>('[data-link="s1>s2"]')!);
    await click('[data-action="delete-link"]');
    expect(el.querySelector('[data-link]')).toBeNull();
    await save();
    expect(saved[0].tree[1].requires).toEqual([]);
  });

  it('highlights the nodes involved in a validation error and does not save', async () => {
    const outside: CharacterClass = {
      ...warrior,
      tree: [warrior.tree[0], { ...warrior.tree[1], requires: [{ skillId: 's3', level: 1 }] }],
    };
    const { el, node, save, saved } = await setup(outside);
    expect(el.querySelector('[data-field="error"]')).not.toBeNull();
    expect(node('s2').dataset['invalid']).toBe('true');
    expect(node('s1').dataset['invalid']).toBeUndefined();
    await save();
    expect(saved).toEqual([]);
  });

  it('shows a validation error and does not save while the tree has a cycle', async () => {
    const cycle: CharacterClass = {
      ...warrior,
      tree: [
        { skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 },
        { skillId: 's2', requires: [{ skillId: 's3', level: 1 }], minLevel: 1, column: 1, row: 0 },
        { skillId: 's3', requires: [{ skillId: 's2', level: 1 }], minLevel: 1, column: 2, row: 0 },
      ],
    };
    const { el, save, saved } = await setup(cycle);
    expect(el.querySelector('[data-field="error"]')).not.toBeNull();
    await save();
    expect(saved).toEqual([]);
  });

  it('does not save a class without a name', async () => {
    const { el, type, save, saved } = await setup(warrior);
    await type('name', '');
    expect(el.querySelector('[data-field="error"]')).not.toBeNull();
    await save();
    expect(saved).toEqual([]);
  });

  it('emits the edited class with its id from the form, and the form follows valid JSON', async () => {
    const { type, field, save, saved } = await setup(warrior);
    await type('name', 'Paladin');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Paladin' });
    await save();
    expect(saved[0]).toMatchObject({ id: 'c1', name: 'Paladin', description: 'Fights.' });
    await type('json', JSON.stringify({ ...saved[0], name: 'Knight' }));
    expect(field('name').value).toBe('Knight');
  });
});
