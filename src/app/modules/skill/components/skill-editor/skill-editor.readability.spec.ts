import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../models/skill';
import { SkillEditorComponent } from './skill-editor.component';

/**
 * Hooks: `[data-section]` = `identity` | `cost` | `roll` | `effects` (roll only for an active skill);
 * `[data-action="toggle-variables"]` opens the `[data-field="variables-help"]` panel (absent until opened), which holds
 * one `[data-variable="<name>"]` per formula variable and `[data-example="success"]` / `[data-example="amount"]`.
 */
describe('SkillEditorComponent readability', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'str', name: 'Strength', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const active: Skill = {
    id: 's1', name: 'Fireball', description: '', rarity: 'rare', type: 'active', maxLevel: 3, pointCost: 2,
    target: 'one-enemy', cooldown: 1,
    effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 4' }],
  };
  const passive: Skill = {
    id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxLevel: 2, pointCost: 1,
    effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel * 2', duration: 0 }],
  };

  async function setup(skill: Skill) {
    TestBed.configureTestingModule({ imports: [SkillEditorComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', world);
    fixture.componentRef.setInput('skill', skill);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const open = async () => {
      el.querySelector<HTMLElement>('[data-action="toggle-variables"]')!.click();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { el, open };
  }

  const sections = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-section]')).map((s) => s.dataset['section']);

  it('groups an active skill form in identity, cost, roll and effects sections', async () => {
    const { el } = await setup(active);
    expect(sections(el)).toEqual(['identity', 'cost', 'roll', 'effects']);
  });

  it('omits the roll section for a passive skill', async () => {
    const { el } = await setup(passive);
    expect(sections(el)).toEqual(['identity', 'cost', 'effects']);
  });

  it('puts each field in its section', async () => {
    const { el } = await setup(active);
    const inSection = (section: string, field: string) =>
      el.querySelector(`[data-section="${section}"] [data-field="${field}"]`) !== null;
    expect(inSection('identity', 'name')).toBe(true);
    expect(inSection('cost', 'max-level')).toBe(true);
    expect(inSection('cost', 'point-cost')).toBe(true);
    expect(inSection('roll', 'roll-faces')).toBe(true);
    expect(inSection('roll', 'success-mode')).toBe(true);
    expect(inSection('effects', 'effect-amount')).toBe(true);
  });

  it('keeps the Variables panel closed until toggled', async () => {
    const { el, open } = await setup(active);
    expect(el.querySelector('[data-field="variables-help"]')).toBeNull();
    await open();
    expect(el.querySelector('[data-field="variables-help"]')).not.toBeNull();
  });

  it('lists the fixed variables, the world attributes and the target form in the panel', async () => {
    const { el, open } = await setup(active);
    await open();
    const names = Array.from(el.querySelectorAll<HTMLElement>('[data-field="variables-help"] [data-variable]')).map(
      (v) => v.dataset['variable'],
    );
    expect(names).toEqual(['roll', 'skillLevel', 'level', 'Life', 'Strength', 'target_Life', 'target_Strength']);
  });

  it('gives an example success formula and an example amount formula', async () => {
    const { el, open } = await setup(active);
    await open();
    expect(el.querySelector('[data-field="variables-help"] [data-example="success"]')!.textContent!.trim()).not.toBe('');
    expect(el.querySelector('[data-field="variables-help"] [data-example="amount"]')!.textContent!.trim()).not.toBe('');
    expect(el.querySelector('[data-field="variables-help"]')!.textContent).toContain('target_Life');
  });
});
