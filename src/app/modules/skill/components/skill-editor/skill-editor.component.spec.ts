import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../models/skill';
import { SkillEditorComponent } from './skill-editor.component';

/**
 * Hooks (all tab panels rendered). `[data-field]`: `name`, `description`, `max-level`, `point-cost` (p-inputnumber
 * hosts), `type` (p-select, ngModelChange with 'active' | 'passive'), `target`, `cooldown` (active only, absent for
 * passive), `json` (textarea), `json-error` (only while invalid). Per effect (`[data-field="effect"]`): `effect-amount`
 * input, `effect-preview` (text with the level 1 then the max level value), `effect-error` (only while the formula is
 * invalid). `[data-action]`: `add-effect`, `save`. Output: `save`.
 */
describe('SkillEditorComponent', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'str', name: 'Strength', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const fireball: Skill = {
    id: 's1', name: 'Fireball', description: 'Boom.', rarity: 'rare', type: 'active', maxLevel: 3, pointCost: 2,
    target: 'one-enemy', cooldown: 1,
    effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 4' }],
  };

  async function setup(skill?: Skill) {
    TestBed.configureTestingModule({ imports: [SkillEditorComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(SkillEditorComponent);
    fixture.componentRef.setInput('world', world);
    if (skill) fixture.componentRef.setInput('skill', skill);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const field = (name: string, index = 0) => {
      const host = el.querySelectorAll<HTMLInputElement>(`[data-field="${name}"]`)[index];
      return host.tagName === 'P-INPUTNUMBER' ? (host.querySelector('input') as HTMLInputElement) : host;
    };
    const type = async (name: string, value: string, index = 0) => {
      const input = field(name, index);
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const saved: Skill[] = [];
    fixture.componentInstance.save.subscribe((s: Skill) => saved.push(s));
    return { fixture, el, field, type, saved };
  }

  it('fills the form and the JSON from the skill', async () => {
    const { field } = await setup(fireball);
    expect(field('name').value).toBe('Fireball');
    expect(field('max-level').value).toBe('3');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Fireball', maxLevel: 3, pointCost: 2 });
  });

  it('shows the amount at level 1 and at max level', async () => {
    const { el } = await setup(fireball);
    const preview = el.querySelector('[data-field="effect-preview"]')!.textContent!;
    expect(preview).toContain('4');
    expect(preview).toContain('12');
  });

  it('shows a formula error and does not save while the formula is invalid', async () => {
    const { el, type, saved } = await setup(fireball);
    await type('effect-amount', 'Luck * 2');
    expect(el.querySelector('[data-field="effect-error"]')).not.toBeNull();
    el.querySelector<HTMLElement>('[data-action="save"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toEqual([]);
  });

  it('hides the active-only fields for a passive skill', async () => {
    const passive: Skill = {
      id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxLevel: 2, pointCost: 1,
      effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel * 2', duration: 0 }],
    };
    const { el } = await setup(passive);
    expect(el.querySelector('[data-field="target"]')).toBeNull();
    expect(el.querySelector('[data-field="cooldown"]')).toBeNull();
  });

  it('emits the edited skill with its id on save, from the form and from valid JSON', async () => {
    const { el, type, field, saved } = await setup(fireball);
    await type('name', 'Inferno');
    await type('max-level', '5');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Inferno', maxLevel: 5 });
    el.querySelector<HTMLElement>('[data-action="save"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: 's1', name: 'Inferno', maxLevel: 5, pointCost: 2, type: 'active' });

    await type('json', JSON.stringify({ ...saved[0], name: 'Meteor' }));
    expect(field('name').value).toBe('Meteor');
  });

  describe('dice rolls', () => {
    const withMode = (success: Skill['success']): Skill => ({ ...fireball, roll: { count: 2, faces: 6 }, success });

    it('shows 1d20 and always for a skill without a roll config', async () => {
      const { field, el } = await setup(fireball);
      expect(field('roll-count').value).toBe('1');
      expect(field('roll-faces').value).toBe('20');
      expect(el.querySelector('[data-field="success-formula"]')).toBeNull();
      expect(el.querySelector('[data-field="success-value"]')).toBeNull();
    });

    it('hides the roll fields for a passive skill', async () => {
      const passive: Skill = {
        id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxLevel: 2, pointCost: 1,
        effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel * 2', duration: 0 }],
      };
      const { el } = await setup(passive);
      expect(el.querySelector('[data-field="roll-count"]')).toBeNull();
      expect(el.querySelector('[data-field="roll-faces"]')).toBeNull();
    });

    it('saves the edited dice and a threshold', async () => {
      const { el, type, saved } = await setup(withMode({ mode: 'threshold', value: 10 }));
      await type('roll-count', '3');
      await type('roll-faces', '8');
      await type('success-value', '12');
      el.querySelector<HTMLElement>('[data-action="save"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(saved[0]).toMatchObject({ roll: { count: 3, faces: 8 }, success: { mode: 'threshold', value: 12 } });
    });

    it('validates the success formula live: target_<name> and roll are known, unknown names are errors', async () => {
      const { el, type, saved } = await setup(withMode({ mode: 'formula', formula: 'roll + Strength - target_Life' }));
      expect(el.querySelector('[data-field="success-error"]')).toBeNull();

      await type('success-formula', 'roll - Luck');
      expect(el.querySelector('[data-field="success-error"]')).not.toBeNull();
      el.querySelector<HTMLElement>('[data-action="save"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(saved).toEqual([]);

      await type('success-formula', 'roll - target_Strength');
      expect(el.querySelector('[data-field="success-error"]')).toBeNull();
    });
  });
});
