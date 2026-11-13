import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { Skill } from '../../models/skill';
import { SkillCatalogueComponent } from './skill-catalogue.component';

const fireball: Skill = {
  id: 'fb', name: 'Fireball', description: 'Burns everything in a small area.', rarity: 'rare',
  type: 'active', maxLevel: 3, pointCost: 2, target: 'area', cost: { attribute: 'Mana', amount: 7 }, cooldown: 4,
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'skillLevel * 5' }],
};
const toughness: Skill = {
  id: 'tg', name: 'Toughness', description: 'Harder to hurt.', rarity: 'common',
  type: 'passive', maxLevel: 5, pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
};

/**
 * Hooks: one `[data-field="skill"]` row per skill holding `[data-field="skill-name"]`, `skill-type`, `skill-cost`
 * (attribute and amount, active skills with a cost), `skill-cooldown` (turns, active skills), `skill-description`,
 * and the row actions `[data-action]` `edit`, `duplicate`, `delete`. Toolbar: `[data-field="search"]`, `create`.
 */
describe('SkillCatalogueComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [SkillCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(SkillCatalogueComponent);
    fixture.componentRef.setInput('skills', [fireball, toughness]);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const q = (selector: string) => el.querySelectorAll<HTMLElement>(selector);
    return { fixture, el, q, component: fixture.componentInstance };
  }

  it('renders one row per skill with name, type and description', async () => {
    const { q } = await setup();
    const rows = q('[data-field="skill"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('[data-field="skill-name"]')!.textContent).toContain('Fireball');
    expect(rows[0].querySelector('[data-field="skill-type"]')!.textContent!.trim()).not.toBe('');
    expect(rows[0].querySelector('[data-field="skill-description"]')!.textContent).toContain('Burns everything');
    expect(rows[1].querySelector('[data-field="skill-name"]')!.textContent).toContain('Toughness');
  });

  it('shows the cost and cooldown of an active skill', async () => {
    const { q } = await setup();
    const row = q('[data-field="skill"]')[0];
    expect(row.querySelector('[data-field="skill-cost"]')!.textContent).toContain('Mana');
    expect(row.querySelector('[data-field="skill-cost"]')!.textContent).toContain('7');
    expect(row.querySelector('[data-field="skill-cooldown"]')!.textContent).toContain('4');
  });

  it('shows no cost nor cooldown on a passive skill', async () => {
    const { q } = await setup();
    const row = q('[data-field="skill"]')[1];
    expect(row.querySelector('[data-field="skill-cost"]')).toBeNull();
    expect(row.querySelector('[data-field="skill-cooldown"]')).toBeNull();
  });

  it('narrows the list with the search box', async () => {
    const { fixture, q } = await setup();
    const search = q('[data-field="search"]')[0] as HTMLInputElement;
    search.value = 'tough';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(q('[data-field="skill"]')).toHaveLength(1);
    expect(q('[data-field="skill-name"]')[0].textContent).toContain('Toughness');
  });

  it('emits the skill to edit and to duplicate from its row', async () => {
    const { fixture, q, component } = await setup();
    const edited: Skill[] = [];
    const copied: Skill[] = [];
    component.edit.subscribe((s: Skill) => edited.push(s));
    component.duplicate.subscribe((s: Skill) => copied.push(s));
    q('[data-field="skill"]')[1].querySelector<HTMLElement>('[data-action="edit"]')!.click();
    q('[data-field="skill"]')[0].querySelector<HTMLElement>('[data-action="duplicate"]')!.click();
    await fixture.whenStable();
    expect(edited).toEqual([toughness]);
    expect(copied).toEqual([fireball]);
  });

  it('asks for confirmation before emitting delete', async () => {
    const { fixture, q, component } = await setup();
    const confirm = vi
      .spyOn(TestBed.inject(ConfirmationService), 'confirm')
      .mockImplementation(() => TestBed.inject(ConfirmationService));
    const removed: Skill[] = [];
    component.remove.subscribe((s: Skill) => removed.push(s));
    q('[data-field="skill"]')[0].querySelector<HTMLElement>('[data-action="delete"]')!.click();
    await fixture.whenStable();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([]);
    confirm.mock.calls[0][0].accept!();
    expect(removed).toEqual([fireball]);
  });

  it('emits create from the toolbar', async () => {
    const { fixture, q, component } = await setup();
    let fired = 0;
    component.create.subscribe(() => fired++);
    q('[data-action="create"]')[0].click();
    await fixture.whenStable();
    expect(fired).toBe(1);
  });
});
