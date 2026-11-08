import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../../skill/models/skill';
import { CharacterClass } from '../../models/class';
import { ClassEditorComponent } from './class-editor.component';

/**
 * Hooks (all tab panels rendered). Inputs: `world`, `characterClass` (optional, a new class when absent). Output:
 * `save`. `[data-field]`: `name`, `description` (pInputText / textarea), `json` (textarea), `error` (one per
 * validation issue, absent while valid). Catalogue skills not yet in the tree: `[data-action="add-node"]` buttons with
 * `data-skill-id`. Each tree node is `[data-node="<skillId>"]` and holds `[data-field]` `node-column`, `node-row`,
 * `node-min-level` (p-inputnumber hosts), `[data-action="add-requirement"]`, and per requirement
 * `[data-field="requirement-skill"]` (p-select bound with ngModel; ngModelChange gives the skill id) and
 * `requirement-rank` (p-inputnumber). `[data-action="save"]` emits the class, disabled / ignored while issues remain.
 */
describe('ClassEditorComponent', () => {
  const skill = (id: string): Skill => ({
    id, name: id, description: '', rarity: 'common', type: 'passive', maxRank: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'rank', duration: 0 }],
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
      { skillId: 's2', requires: [{ skillId: 's1', rank: 1 }], minLevel: 2, column: 1, row: 0 },
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
      scope.querySelector<HTMLElement>(selector)!.click();
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

  it('fills the form and the JSON from the class and shows its nodes', async () => {
    const { field, node, el } = await setup(warrior);
    expect(field('name').value).toBe('Warrior');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Warrior', tree: [{ skillId: 's1' }, { skillId: 's2' }] });
    expect(node('s1')).not.toBeNull();
    expect(field('node-column', node('s2')).value).toBe('1');
    expect(field('node-min-level', node('s2')).value).toBe('2');
    expect(el.querySelector('[data-field="error"]')).toBeNull();
  });

  it('offers only the catalogue skills that are not in the tree, and adds one as a node', async () => {
    const { el, click, save, saved } = await setup(warrior);
    expect(el.querySelector('[data-action="add-node"][data-skill-id="s1"]')).toBeNull();
    await click('[data-action="add-node"][data-skill-id="s3"]');
    expect(el.querySelector('[data-node="s3"]')).not.toBeNull();
    expect(el.querySelector('[data-action="add-node"][data-skill-id="s3"]')).toBeNull();
    await save();
    expect(saved[0].tree.map((n) => n.skillId)).toEqual(['s1', 's2', 's3']);
    expect(saved[0].tree[2]).toMatchObject({ skillId: 's3', requires: [], minLevel: 1 });
  });

  it('sets the cell of a node', async () => {
    const { node, type, save, saved } = await setup(warrior);
    await type('node-column', '3', node('s2'));
    await type('node-row', '2', node('s2'));
    await save();
    expect(saved[0].tree[1]).toMatchObject({ skillId: 's2', column: 3, row: 2 });
  });

  it('sets prerequisites with a required rank and the min level of a node', async () => {
    const { fixture, node, click, type, save, saved } = await setup(warrior);
    await click('[data-action="add-node"][data-skill-id="s3"]');
    await click('[data-action="add-requirement"]', node('s3'));
    fixture.debugElement
      .query(By.css('[data-node="s3"] [data-field="requirement-skill"]'))
      .triggerEventHandler('ngModelChange', 's2');
    await fixture.whenStable();
    await type('requirement-rank', '2', node('s3'));
    await type('node-min-level', '4', node('s3'));
    await save();
    expect(saved[0].tree[2]).toMatchObject({ skillId: 's3', requires: [{ skillId: 's2', rank: 2 }], minLevel: 4 });
  });

  it('shows a validation error and does not save while the tree has a cycle', async () => {
    const { fixture, el, node, click, save, saved } = await setup(warrior);
    await click('[data-action="add-requirement"]', node('s1'));
    fixture.debugElement
      .query(By.css('[data-node="s1"] [data-field="requirement-skill"]'))
      .triggerEventHandler('ngModelChange', 's2');
    await fixture.whenStable();
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
