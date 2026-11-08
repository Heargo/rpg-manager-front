import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { createSandboxWorld } from '../../../world/helpers/default-world';
import { World } from '../../../world/models/world';
import { Npc, NpcRole } from '../../models/npc';
import { NpcCatalogueComponent } from './npc-catalogue.component';

const npc = (id: string, name: string, level: number, roles: NpcRole[]): Npc => ({
  id, name, statPoints: 0, xp: 0, level, money: 0, updatedAt: 1, skillPoints: 0, skills: [],
  attributes: [], inventory: [], roles, description: '', xpReward: 0, loot: [],
});
const goblin = npc('n1', 'Goblin', 2, ['enemy']);
const baker = npc('n2', 'Baker', 5, ['story', 'merchant']);
const dragon = npc('n3', 'Dragon', 15, ['enemy']);

/**
 * Hooks: `[data-field="search"]`, `[data-field="level-min"]` and `[data-field="level-max"]` (number inputs),
 * `p-multiselect[data-field="roles"]`, and `[data-action]` `duplicate` / `delete` on each card.
 */
describe('NpcCatalogueComponent', () => {
  const world: World = { ...createSandboxWorld((key) => key), npcs: [goblin, baker, dragon] };

  async function setup() {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    TestBed.configureTestingModule({ imports: [NpcCatalogueComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(NpcCatalogueComponent);
    fixture.componentRef.setInput('world', world);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const q = (selector: string) => el.querySelectorAll<HTMLElement>(selector);
    const type = async (field: string, value: string) => {
      const host = q(`[data-field="${field}"]`)[0];
      // Number fields are p-inputnumber hosts: drive the inner input and commit on blur.
      const input = (host.matches('input') ? host : (host.querySelector('input') ?? host)) as HTMLInputElement;
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    return { fixture, el, q, type, component: fixture.componentInstance };
  }
  afterEach(() => vi.unstubAllGlobals());

  it('shows one card per NPC', async () => {
    const { q, el } = await setup();
    expect(q('app-npc-card')).toHaveLength(3);
    expect(el.textContent).toContain('Goblin');
    expect(el.textContent).toContain('Baker');
  });

  it('narrows the grid with the search box', async () => {
    const { q, type, el } = await setup();
    await type('search', 'bak');
    expect(q('app-npc-card')).toHaveLength(1);
    expect(el.textContent).toContain('Baker');
    expect(el.textContent).not.toContain('Goblin');
  });

  it('narrows the grid with the role multiselect', async () => {
    const { q, fixture, el } = await setup();
    const roles = fixture.debugElement.nativeElement.querySelector('p-multiselect[data-field="roles"]');
    expect(roles).not.toBeNull();
    fixture.debugElement
      .query((d) => d.nativeElement === roles)
      .triggerEventHandler('ngModelChange', ['merchant']);
    await fixture.whenStable();
    expect(q('app-npc-card')).toHaveLength(1);
    expect(el.textContent).toContain('Baker');
  });

  it('narrows the grid with the level range', async () => {
    const { q, type, el } = await setup();
    await type('level-min', '3');
    expect(q('app-npc-card')).toHaveLength(2);
    await type('level-max', '10');
    expect(q('app-npc-card')).toHaveLength(1);
    expect(el.textContent).toContain('Baker');
  });

  it('emits the NPC to duplicate', async () => {
    const { fixture, q, component } = await setup();
    const copied: Npc[] = [];
    component.duplicate.subscribe((n: Npc) => copied.push(n));
    q('[data-action="duplicate"]')[1].click();
    await fixture.whenStable();
    expect(copied).toEqual([baker]);
  });

  it('asks for confirmation before emitting delete', async () => {
    const { fixture, q, component } = await setup();
    const confirm = vi
      .spyOn(TestBed.inject(ConfirmationService), 'confirm')
      .mockImplementation(() => TestBed.inject(ConfirmationService));
    const removed: Npc[] = [];
    component.remove.subscribe((n: Npc) => removed.push(n));

    q('[data-action="delete"]')[2].click();
    await fixture.whenStable();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([]);
    confirm.mock.calls[0][0].accept!();
    expect(removed).toEqual([dragon]);
  });

  it('emits the NPC to edit', async () => {
    const { fixture, q, component } = await setup();
    expect(q('[data-action="edit"]')).toHaveLength(3);
    const edited: Npc[] = [];
    component.edit.subscribe((n: Npc) => edited.push(n));
    q('[data-action="edit"]')[0].click();
    await fixture.whenStable();
    expect(edited).toEqual([goblin]);
  });

  it('offers Show on a hidden NPC and Hide on a shown one, and emits the NPC', async () => {
    const { fixture, q, component } = await setup();
    fixture.componentRef.setInput('shownIds', ['n2']);
    await fixture.whenStable();
    expect(q('[data-action="show"]')).toHaveLength(2);
    expect(q('[data-action="hide"]')).toHaveLength(1);

    const shown: Npc[] = [];
    const hidden: Npc[] = [];
    component.show.subscribe((n: Npc) => shown.push(n));
    component.hide.subscribe((n: Npc) => hidden.push(n));
    q('[data-action="show"]')[0].click();
    q('[data-action="hide"]')[0].click();
    await fixture.whenStable();
    expect(shown).toEqual([goblin]);
    expect(hidden).toEqual([baker]);
  });

  it('disables Show on the other NPCs once 4 are shown', async () => {
    const { fixture, q } = await setup();
    fixture.componentRef.setInput('shownIds', ['n2', 'a', 'b', 'c']);
    await fixture.whenStable();
    const buttons = q('[data-action="show"]');
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect((b.querySelector('button') ?? b).hasAttribute('disabled')).toBe(true));
  });
});
