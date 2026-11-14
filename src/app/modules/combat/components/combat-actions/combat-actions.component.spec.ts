import {
  click,
  combatTable,
  mount,
  pickTarget,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { SkillCatalogueBusiness } from '../../../skill/business/skill-catalogue.business';
import { CombatTargetingBusiness } from '../../business/combat-targeting.business';
import { CharacterBusiness } from '../../../character/business/character.business';
import { CombatActionsComponent } from './combat-actions.component';

/**
 * Contract: tabs are `[role="tab"]` labelled `Name (left/count)`; the open panel lists `[data-testid="skill"]` / `[data-testid="item"]`
 * (their `[data-action="use-skill"]` / `[data-action="use-item"]` buttons disabled at 0), then `[data-action="tick"]` (Use) and, for the GM only,
 * `[data-action="untick"]` (the "-"). Without counters: no tab, flat lists.
 */
describe('CombatActionsComponent tabs', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatActionsComponent>>>;

  afterEach(() => {
    mounted?.destroy();
    table?.destroy();
  });

  async function open(who: 'gm' | 'ada', dashSkill = true) {
    const sheetSkills = [{ skillId: table.fireballId, level: 1 }];
    if (dashSkill) {
      const dashId = (
        await table.gm.injector.get(SkillCatalogueBusiness).save({
          name: 'Dash',
          description: '',
          rarity: 'common',
          type: 'active',
          maxLevel: 1,
          pointCost: 1,
          target: 'self',
          actionType: 'Movement',
          roll: { count: 1, faces: 1 },
          effects: [],
        })
      ).id;
      await table.gm.injector
        .get(CharacterBusiness)
        .act(table.record('ada').id, {
          kind: 'set-skill',
          skillId: dashId,
          level: 1,
        });
      sheetSkills.push({ skillId: dashId, level: 1 });
      await settle();
    }
    await table.start();
    const ada = table.named(table.gm, 'Ada');
    const device = table[who];
    mounted = await mount(CombatActionsComponent, device, {
      combatantId: ada.id,
      characterId: table.record('ada').id,
      sheetSkills,
      level: ada.level,
      attributes: ada.attributes,
      actions: ada.actions,
    });
    return ada;
  }

  const tabs = () =>
    Array.from(mounted.el.querySelectorAll('[role="tab"]')) as HTMLElement[];
  const names = (testid: string) =>
    Array.from(mounted.el.querySelectorAll(`[data-testid="${testid}"]`)).map(
      (e) => e.getAttribute('data-name'),
    );

  it('shows one tab per action type labelled with what is left', async () => {
    table = await combatTable('free');
    await open('gm');
    expect(
      tabs().map((t) => t.textContent!.replace(/\s+/g, ' ').trim()),
    ).toEqual(['Action (1/1)', 'Movement (1/1)']);
  });

  it('lists the first tab skills and the items, and the other tab skills once selected', async () => {
    table = await combatTable('free');
    await open('gm');
    expect(names('skill')).toEqual(['Fireball']);
    expect(names('item')).toEqual(['Potion']);
    await click(tabs()[1]);
    expect(names('skill')).toEqual(['Dash']);
    expect(names('item')).toEqual([]);
  });

  it('updates the label and disables the entries of a tab at 0', async () => {
    table = await combatTable('free');
    const ada = await open('gm');
    await click(mounted.el.querySelector('[data-action="tick"]'));
    expect(tabs()[0].textContent).toContain('Action (0/1)');
    const buttons = mounted.el.querySelectorAll<HTMLButtonElement>(
      '[data-action="use-skill"], [data-action="use-item"], [data-action="tick"]',
    );
    expect(buttons.length).toBe(3);
    buttons.forEach((b) => expect(b.disabled).toBe(true));
    expect(table.named(table.gm, 'Ada').actions[0].used).toBe(1);
    expect(ada.id).toBe(table.named(table.gm, 'Ada').id);
  });

  it('lets the GM give one back with the minus button', async () => {
    table = await combatTable('free');
    await open('gm');
    const minus = () =>
      mounted.el.querySelector<HTMLButtonElement>('[data-action="untick"]')!;
    expect(minus().disabled).toBe(true);
    await click(mounted.el.querySelector('[data-action="tick"]'));
    expect(minus().disabled).toBe(false);
    await click(minus());
    expect(table.named(table.gm, 'Ada').actions[0].used).toBe(0);
    expect(tabs()[0].textContent).toContain('Action (1/1)');
  });

  it('offers no minus button to a player', async () => {
    table = await combatTable('free');
    await open('ada', false);
    expect(tabs()).toHaveLength(2);
    expect(mounted.el.querySelector('[data-action="tick"]')).not.toBeNull();
    expect(mounted.el.querySelector('[data-action="untick"]')).toBeNull();
  });

  it('shows flat lists and no tabs when the action counters step is off', async () => {
    table = await combatTable('free', {
      steps: {
        initiative: true,
        actionCounters: false,
        gmValidation: true,
        defence: true,
        rewards: true,
      },
    });
    await open('gm');
    expect(tabs()).toEqual([]);
    expect(names('skill')).toEqual(['Fireball', 'Dash']);
    expect(names('item')).toEqual(['Potion']);
  });
});

/**
 * Contract: after `use-skill`, the targets are one Optimus UI multi-select `[data-testid="targets"]` (no target button). Its overlay is in the document:
 * group labels `.p-multiselect-option-group` ("Enemies", "Allies") and options `[data-testid="target"]` (`data-name`); picked ones are chips
 * `.p-multiselect-chip` in the component. For `self` / `all-*` skills the targets are preset and the multi-select can't be opened.
 */
describe('CombatActionsComponent target multi-select', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatActionsComponent>>>;

  afterEach(() => {
    mounted?.destroy();
    table?.destroy();
    document.body
      .querySelectorAll('.p-multiselect-overlay')
      .forEach((e) => e.remove());
  });

  async function aim(skillName: string, extra?: Record<string, unknown>) {
    const id = (
      await table.gm.injector.get(SkillCatalogueBusiness).save({
        name: skillName,
        description: '',
        rarity: 'common',
        type: 'active',
        maxLevel: 1,
        pointCost: 1,
        roll: { count: 1, faces: 1 },
        effects: [],
        ...extra,
      })
    ).id;
    await table.gm.injector
      .get(CharacterBusiness)
      .act(table.record('ada').id, {
        kind: 'set-skill',
        skillId: id,
        level: 1,
      });
    await settle();
    await table.start();
    const ada = table.named(table.gm, 'Ada');
    mounted = await mount(CombatActionsComponent, table.gm, {
      combatantId: ada.id,
      characterId: table.record('ada').id,
      sheetSkills: [{ skillId: id, level: 1 }],
      level: ada.level,
      attributes: ada.attributes,
      actions: ada.actions,
    });
    await click(
      mounted.el.querySelector(
        '[data-testid="skill"] [data-action="use-skill"]',
      ),
    );
  }

  const open = () => click(mounted.el.querySelector('[data-testid="targets"]'));
  const text = (e: Element) => e.textContent!.replace(/\s+/g, ' ').trim();
  const groups = () =>
    Array.from(document.querySelectorAll('.p-multiselect-option-group')).map(
      text,
    );
  const options = () =>
    Array.from(document.querySelectorAll('[data-testid="target"]')).map((e) =>
      e.getAttribute('data-name'),
    );
  const chips = () =>
    Array.from(mounted.el.querySelectorAll('.p-multiselect-chip')).map(text);
  const casting = () =>
    table.gm.injector.get(CombatTargetingBusiness).$casting();

  it('replaces the target buttons with a multi-select', async () => {
    table = await combatTable('free');
    await aim('Zap', { target: 'one-enemy' });
    expect(mounted.el.querySelector('[data-testid="targets"]')).not.toBeNull();
    expect(mounted.el.querySelector('button[data-testid="target"]')).toBeNull();
  });

  it('lists enemies first for a harmful skill', async () => {
    table = await combatTable('free');
    await aim('Zap', { target: 'one-enemy' });
    await open();
    expect(groups()).toEqual(['Enemies', 'Allies']);
    expect(options()).toEqual(['Goblin', 'Ada', 'Bob']);
  });

  it('lists allies first for a healing skill', async () => {
    table = await combatTable('free');
    await aim('Mend', {
      target: 'one-ally',
      effects: [{ kind: 'heal', attribute: 'Life', amount: '3' }],
    });
    await open();
    expect(groups()).toEqual(['Allies', 'Enemies']);
    expect(options()).toEqual(['Ada', 'Bob', 'Goblin']);
  });

  it('sets the casting targets when an option is picked, shows a chip, and confirm sends them', async () => {
    table = await combatTable('free');
    await aim('Zap', { target: 'one-enemy' });
    await pickTarget(mounted.el, 'Goblin');
    const goblin = table.named(table.gm, 'Goblin');
    expect(casting()?.targets).toEqual([goblin.id]);
    expect(chips()).toEqual(['Goblin']);
    await click(mounted.el.querySelector('[data-action="confirm-skill"]'));
    expect(table.state(table.gm).pending.map((p) => p.targetId)).toEqual([
      goblin.id,
    ]);
  });

  it('follows a pick made on the grid', async () => {
    table = await combatTable('free');
    await aim('Zap', { target: 'one-enemy' });
    table.gm.injector
      .get(CombatTargetingBusiness)
      .toggle(table.named(table.gm, 'Goblin').id);
    await settle();
    expect(chips()).toEqual(['Goblin']);
  });

  it('presets the whole camp for an all-enemies skill and does not open', async () => {
    table = await combatTable('free');
    await aim('Quake', { target: 'all-enemies' });
    expect(chips()).toEqual(['Goblin']);
    await open();
    expect(options()).toEqual([]);
    expect(casting()?.targets).toEqual([table.named(table.gm, 'Goblin').id]);
  });
});
