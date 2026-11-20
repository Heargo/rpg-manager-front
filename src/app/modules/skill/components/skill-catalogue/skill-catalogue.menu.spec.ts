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
 * Hooks: each skill row has a "…" button `[data-test="card-menu-<id>"]` (with an aria-label) instead of the row of
 * `[data-action]` buttons. It opens a popup menu (appended to the body) with entries `[data-automationid]` = `edit`
 * ("Edit"), `duplicate` ("Duplicate") and `delete` ("Delete"), same actions as the old buttons.
 */
describe('SkillCatalogueComponent card menu', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [SkillCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(SkillCatalogueComponent);
    fixture.componentRef.setInput('skills', [fireball, toughness]);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, component: fixture.componentInstance };
  }
  const settle = async (fixture: { whenStable(): Promise<unknown> }) => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();
    }
  };
  const entry = (action: string) => document.body.querySelector<HTMLElement>(`[data-automationid="${action}"]`);
  const button = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-test="card-menu-${id}"]`)!;

  afterEach(() => {
    document.body.querySelectorAll('.p-menu, .p-menu-overlay').forEach((n) => n.remove());
    document.body.querySelectorAll('app-skill-catalogue').forEach((n) => n.remove());
  });

  it('shows a labelled "…" button per card and no row of action buttons', async () => {
    const { el } = await setup();
    expect(button(el, 'fb')).not.toBeNull();
    expect(button(el, 'tg')).not.toBeNull();
    expect(button(el, 'fb').getAttribute('aria-label')!.trim()).not.toBe('');
    expect(el.querySelectorAll('[data-field="skill"] [data-action]')).toHaveLength(0);
    expect(entry('edit')).toBeNull();
  });

  it('opens a menu with Edit, Duplicate and Delete', async () => {
    const { fixture, el } = await setup();
    button(el, 'fb').click();
    await settle(fixture);
    expect(entry('edit')!.textContent).toContain('Edit');
    expect(entry('duplicate')!.textContent).toContain('Duplicate');
    expect(entry('delete')!.textContent).toContain('Delete');
  });

  it('emits the skill of the card the menu was opened from on Edit and Duplicate', async () => {
    const { fixture, el, component } = await setup();
    const edited: Skill[] = [];
    const copied: Skill[] = [];
    component.edit.subscribe((s: Skill) => edited.push(s));
    component.duplicate.subscribe((s: Skill) => copied.push(s));
    button(el, 'tg').click();
    await settle(fixture);
    entry('edit')!.click();
    await settle(fixture);
    button(el, 'fb').click();
    await settle(fixture);
    entry('duplicate')!.click();
    await settle(fixture);
    expect(edited).toEqual([toughness]);
    expect(copied).toEqual([fireball]);
  });

  it('asks for confirmation on Delete before emitting remove', async () => {
    const { fixture, el, component } = await setup();
    const confirm = vi
      .spyOn(TestBed.inject(ConfirmationService), 'confirm')
      .mockImplementation(() => TestBed.inject(ConfirmationService));
    const removed: Skill[] = [];
    component.remove.subscribe((s: Skill) => removed.push(s));
    button(el, 'fb').click();
    await settle(fixture);
    entry('delete')!.click();
    await settle(fixture);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([]);
    confirm.mock.calls[0][0].accept!();
    expect(removed).toEqual([fireball]);
  });

  it('closes on Escape and gives focus back to the "…" button', async () => {
    const { fixture, el } = await setup();
    const trigger = button(el, 'fb');
    trigger.focus();
    trigger.click();
    await settle(fixture);
    expect(entry('edit')).not.toBeNull();
    const target = (document.activeElement as HTMLElement) ?? document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(fixture);
    expect(entry('edit')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
