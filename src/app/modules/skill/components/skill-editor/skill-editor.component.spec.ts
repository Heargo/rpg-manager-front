import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Skill } from '../../models/skill';
import { SkillEditorComponent } from './skill-editor.component';

/**
 * Hooks (all tab panels rendered). `[data-field]`: `name`, `description`, `max-rank`, `point-cost` (p-inputnumber
 * hosts), `type` (p-select, ngModelChange with 'active' | 'passive'), `target`, `cooldown` (active only, absent for
 * passive), `json` (textarea), `json-error` (only while invalid). Per effect (`[data-field="effect"]`): `effect-amount`
 * input, `effect-preview` (text with the rank 1 then the max rank value), `effect-error` (only while the formula is
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
    id: 's1', name: 'Fireball', description: 'Boom.', rarity: 'rare', type: 'active', maxRank: 3, pointCost: 2,
    target: 'one-enemy', cooldown: 1,
    effects: [{ kind: 'damage', attribute: 'Life', amount: 'rank * 4' }],
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
    expect(field('max-rank').value).toBe('3');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Fireball', maxRank: 3, pointCost: 2 });
  });

  it('shows the amount at rank 1 and at max rank', async () => {
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
      id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxRank: 2, pointCost: 1,
      effects: [{ kind: 'modify', attribute: 'Life', amount: 'rank * 2', duration: 0 }],
    };
    const { el } = await setup(passive);
    expect(el.querySelector('[data-field="target"]')).toBeNull();
    expect(el.querySelector('[data-field="cooldown"]')).toBeNull();
  });

  it('emits the edited skill with its id on save, from the form and from valid JSON', async () => {
    const { el, type, field, saved } = await setup(fireball);
    await type('name', 'Inferno');
    await type('max-rank', '5');
    expect(JSON.parse(field('json').value)).toMatchObject({ name: 'Inferno', maxRank: 5 });
    el.querySelector<HTMLElement>('[data-action="save"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: 's1', name: 'Inferno', maxRank: 5, pointCost: 2, type: 'active' });

    await type('json', JSON.stringify({ ...saved[0], name: 'Meteor' }));
    expect(field('name').value).toBe('Meteor');
  });
});
