import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldDraft } from '../../models/world';
import { RuleFieldsComponent } from './rule-fields.component';

/**
 * Contract: `app-rule-fields` takes `draft` (a `model` of the WorldDraft rule fields: startingStatPoints, startingMoney,
 * levelCurve, maxLevel, statPointsPerLevel, offlineFeatures) and `errors` (WorldDraftErrors), and keeps the wizard's selectors:
 * `#stat-points`, `#max-level`, `#stat-points-per-level` (p-inputnumber inputIds), `p-select[data-testid="level-curve-select"]`,
 * `input[name="level-curve-expression"]`, `[data-testid="level-curve-preview"]`, `[data-testid="level-curve-error"]`.
 * Sections: `[data-testid="rules-section-progression"]` (stat points, level curve, max level, stat points per level),
 * `[data-testid="rules-section-economy"]` (starting money, `app-coin-input`), `[data-testid="rules-section-offline"]` (toggles
 * `#offline-<feature>`).
 */
const base: WorldDraft = {
  name: 'Eldoria',
  attributes: [],
  startingStatPoints: 5,
  startingMoney: 5000,
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
  statPointsPerLevel: 3,
  offlineFeatures: { dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false, learnSkills: false },
};

async function open(errors: Record<string, string> = {}) {
  TestBed.configureTestingModule({ imports: [RuleFieldsComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(RuleFieldsComponent);
  fixture.componentRef.setInput('draft', base);
  fixture.componentRef.setInput('errors', errors);
  const emitted: WorldDraft[] = [];
  fixture.componentInstance.draft.subscribe((value: WorldDraft) => emitted.push(value));
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  await settle();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, emitted, settle };
}

describe('RuleFieldsComponent', () => {
  it('shows the Progression, Economy and Offline sections with their fields', async () => {
    const { el } = await open();
    const progression = el.querySelector('[data-testid="rules-section-progression"]')!;
    const economy = el.querySelector('[data-testid="rules-section-economy"]')!;
    const offline = el.querySelector('[data-testid="rules-section-offline"]')!;

    expect((progression.querySelector('#stat-points') as HTMLInputElement).value).toBe('5');
    expect(progression.querySelector('[data-testid="level-curve-select"] .p-select-label')!.textContent!.trim()).toBe(
      'Growing (100 x level)',
    );
    expect((progression.querySelector('#max-level') as HTMLInputElement).value).toBe('20');
    expect((progression.querySelector('#stat-points-per-level') as HTMLInputElement).value).toBe('3');
    expect(progression.querySelector('[data-testid="level-curve-preview"]')!.textContent!.trim()).toBe('200 300 400 500 600');
    expect(economy.querySelector('app-coin-input')).not.toBeNull();
    expect(offline.querySelectorAll('input').length).toBe(7);
  });

  it('emits the draft with the new level curve when the preset changes', async () => {
    const { el, emitted, settle } = await open();
    (el.querySelector('[data-testid="level-curve-select"]') as HTMLElement).click();
    await settle();
    const option = Array.from(document.querySelectorAll('li[role="option"]')).find(
      (item) => item.textContent?.trim() === 'Flat (100 XP per level)',
    ) as HTMLElement;
    option.click();
    await settle();

    expect(emitted.at(-1)!.levelCurve).toEqual({ preset: 'flat' });
    expect(el.querySelector('[data-testid="level-curve-preview"]')!.textContent!.trim()).toBe('100 100 100 100 100');
  });

  it('shows the validation error it is given', async () => {
    const { el } = await open({ maxLevel: 'world.errors.maxLevelInvalid' });
    expect(el.textContent).toContain('Max level');
    expect(el.querySelector('.error')).not.toBeNull();
  });

  it('shows the NPCs section with one tick per role and field, from the defaults', async () => {
    const { el } = await open();
    const npcs = el.querySelector('[data-testid="rules-section-npcs"]')!;
    expect(npcs.querySelectorAll('input')).toHaveLength(18);
    const ticked = (role: string, field: string) => (npcs.querySelector(`#npc-${role}-${field}`) as HTMLInputElement).checked;
    expect(ticked('story', 'description')).toBe(true);
    expect(ticked('story', 'lifeBar')).toBe(false);
    expect(ticked('merchant', 'level')).toBe(true);
    expect(ticked('enemy', 'description')).toBe(false);
    expect(ticked('enemy', 'level')).toBe(true);
    expect(ticked('enemy', 'lifeBar')).toBe(true);
    expect(ticked('enemy', 'lifeNumbers')).toBe(false);
    expect(ticked('enemy', 'attributes')).toBe(false);
    expect(ticked('enemy', 'equipment')).toBe(false);
  });

  it('emits the draft with the changed tick, keeping the other defaults', async () => {
    const { el, emitted, settle } = await open();
    (el.querySelector('#npc-enemy-lifeNumbers') as HTMLInputElement).click();
    await settle();

    expect(emitted.at(-1)!.npcVisibility).toEqual({
      story: { description: true, level: true, lifeBar: false, lifeNumbers: false, attributes: false, equipment: false },
      merchant: { description: true, level: true, lifeBar: false, lifeNumbers: false, attributes: false, equipment: false },
      enemy: { description: false, level: true, lifeBar: true, lifeNumbers: true, attributes: false, equipment: false },
    });
  });
});

/**
 * Economy selling settings (draft fields `sellAnywhere`, `sellAnywhereRatio`, `merchantBuyRatio`, `merchantSellRatio`; defaults
 * on / 1 / 1 / 0.5 when omitted): `#sell-anywhere` (toggle switch), `#sell-anywhere-ratio`, `#merchant-buy-ratio`,
 * `#merchant-sell-ratio` (p-inputnumber inputIds), all inside the Economy section.
 */
describe('RuleFieldsComponent economy selling settings', () => {
  it('shows the four settings with their defaults', async () => {
    const { el } = await open();
    const economy = el.querySelector('[data-testid="rules-section-economy"]')!;
    expect((economy.querySelector('#sell-anywhere') as HTMLInputElement).checked).toBe(true);
    expect((economy.querySelector('#sell-anywhere-ratio') as HTMLInputElement).value).toBe('1');
    expect((economy.querySelector('#merchant-buy-ratio') as HTMLInputElement).value).toBe('1');
    expect((economy.querySelector('#merchant-sell-ratio') as HTMLInputElement).value).toBe('0.5');
  });

  it('emits the draft with the changed settings', async () => {
    const { el, emitted, settle } = await open();
    (el.querySelector('#sell-anywhere') as HTMLInputElement).click();
    await settle();
    expect(emitted.at(-1)!.sellAnywhere).toBe(false);

    const sell = el.querySelector('#merchant-sell-ratio') as HTMLInputElement;
    sell.value = '0.75';
    sell.dispatchEvent(new Event('input'));
    sell.dispatchEvent(new Event('blur'));
    await settle();
    expect(emitted.at(-1)!.merchantSellRatio).toBe(0.75);
  });
});

/**
 * Combat section (draft field `combat`: a CombatRules, defaulting to `defaultCombatRules(draft.barAttributes.life)` when
 * omitted), `[data-testid="rules-section-combat"]`, in `sections` 'all' and 'rules'. Input `collapsed` (default false): the
 * section is a `<details>` that is closed when true (the wizard). Controls: `#combat-life-attribute` (p-select inputId),
 * `#combat-initiative-mode` (p-select), `#combat-initiative-count`, `#combat-initiative-faces` (p-inputnumber),
 * `#combat-initiative-formula`, `#combat-movement`, `#combat-basic-attack`, `#combat-defence` (pInputText), `#combat-grid`
 * (toggle), `#combat-grid-columns`, `#combat-grid-rows` (p-inputnumber), action types as rows `[data-testid="combat-action"]`
 * with `input[name="combat-action-name"]` and `input[name="combat-action-count"]`, and `[data-testid="combat-action-add"]`.
 * Live formula validation (from the draft's attribute names, not the `errors` input): `[data-testid="combat-error-<field>"]`
 * for field `initiative`, `movement`, `basic-attack`, `defence`.
 */
describe('RuleFieldsComponent combat settings', () => {
  const withAttributes: WorldDraft = {
    ...base,
    attributes: [
      { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
    barAttributes: { life: 'Life' },
  };

  async function openCombat(collapsed = false) {
    TestBed.configureTestingModule({ imports: [RuleFieldsComponent], providers: TEST_PROVIDERS });
    const fixture = TestBed.createComponent(RuleFieldsComponent);
    fixture.componentRef.setInput('draft', withAttributes);
    fixture.componentRef.setInput('collapsed', collapsed);
    const emitted: WorldDraft[] = [];
    fixture.componentInstance.draft.subscribe((value: WorldDraft) => emitted.push(value));
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };
    await settle();
    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector('[data-testid="rules-section-combat"]') as HTMLElement;
    const type = async (selector: string, text: string) => {
      const input = section.querySelector(selector) as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await settle();
    };
    return { el, section, emitted, settle, type };
  }

  it('shows the defaults from the spec table', async () => {
    const { section } = await openCombat();
    expect((section.querySelector('#combat-initiative-count') as HTMLInputElement).value).toBe('1');
    expect((section.querySelector('#combat-initiative-faces') as HTMLInputElement).value).toBe('20');
    expect((section.querySelector('#combat-initiative-formula') as HTMLInputElement).value).toBe('0');
    expect((section.querySelector('#combat-movement') as HTMLInputElement).value).toBe('6');
    expect((section.querySelector('#combat-grid') as HTMLInputElement).checked).toBe(false);
    expect((section.querySelector('#combat-basic-attack') as HTMLInputElement).value).toBe('');
    expect((section.querySelector('#combat-defence') as HTMLInputElement).value).toBe('');
    const rows = Array.from(section.querySelectorAll('[data-testid="combat-action"]'));
    expect(rows.map((row) => (row.querySelector('input[name="combat-action-name"]') as HTMLInputElement).value)).toEqual([
      'Action',
      'Movement',
    ]);
    expect(section.querySelector('#combat-life-attribute')).not.toBeNull();
  });

  it('is open on the rules page', async () => {
    expect((await openCombat(false)).section.matches('details[open]')).toBe(true);
  });

  it('is collapsed in the wizard', async () => {
    const collapsed = (await openCombat(true)).section;
    expect(collapsed.tagName).toBe('DETAILS');
    expect(collapsed.hasAttribute('open')).toBe(false);
  });

  it('emits the movement, basic attack and defence formulas', async () => {
    const { emitted, type } = await openCombat();
    await type('#combat-movement', 'Mana / 2');
    await type('#combat-basic-attack', 'Life / 2');
    await type('#combat-defence', 'Mana');
    expect(emitted.at(-1)!.combat).toMatchObject({ movement: 'Mana / 2', basicAttack: 'Life / 2', defence: 'Mana' });
  });

  it('emits the initiative dice and formula', async () => {
    const { emitted, type } = await openCombat();
    await type('#combat-initiative-count', '2');
    await type('#combat-initiative-faces', '6');
    await type('#combat-initiative-formula', 'level');
    expect(emitted.at(-1)!.combat!.initiative).toMatchObject({ dice: { count: 2, faces: 6 }, formula: 'level' });
  });

  it('emits the grid switch and size', async () => {
    const { section, emitted, settle, type } = await openCombat();
    (section.querySelector('#combat-grid') as HTMLInputElement).click();
    await settle();
    expect(emitted.at(-1)!.combat!.grid.enabled).toBe(true);
    await type('#combat-grid-columns', '12');
    await type('#combat-grid-rows', '9');
    expect(emitted.at(-1)!.combat!.grid).toMatchObject({ enabled: true, columns: 12, rows: 9 });
  });

  it('adds an action type and edits the existing ones', async () => {
    const { section, emitted, settle } = await openCombat();
    (section.querySelector('[data-testid="combat-action-add"]') as HTMLElement).click();
    await settle();
    expect(emitted.at(-1)!.combat!.actionTypes).toHaveLength(3);
    const first = section.querySelector('[data-testid="combat-action"] input[name="combat-action-name"]') as HTMLInputElement;
    first.value = 'Strike';
    first.dispatchEvent(new Event('input'));
    await settle();
    expect(emitted.at(-1)!.combat!.actionTypes[0]).toEqual({ name: 'Strike', count: 1 });
  });

  it('shows a live error for a broken or unknown-name formula, and none for a good one', async () => {
    const { section, type } = await openCombat();
    expect(section.querySelector('[data-testid="combat-error-defence"]')).toBeNull();
    await type('#combat-defence', 'Armor * 2');
    expect(section.querySelector('[data-testid="combat-error-defence"]')).not.toBeNull();
    await type('#combat-defence', 'Mana * 2');
    expect(section.querySelector('[data-testid="combat-error-defence"]')).toBeNull();
    await type('#combat-movement', '4 +');
    expect(section.querySelector('[data-testid="combat-error-movement"]')).not.toBeNull();
  });

  describe('step switches', () => {
    const steps = ['initiative', 'action-counters', 'gm-validation', 'defence', 'rewards'];
    const toggle = (section: HTMLElement, step: string) =>
      section.querySelector(`#combat-step-${step}`) as HTMLInputElement;

    it('has one switch per step, all on by default', async () => {
      const { section } = await openCombat();
      for (const step of steps) expect(toggle(section, step).checked, step).toBe(true);
    });

    it('turns a step off in the draft', async () => {
      const { section, emitted, settle } = await openCombat();
      toggle(section, 'rewards').click();
      await settle();
      expect(emitted.at(-1)!.combat!.steps).toEqual({
        initiative: true,
        actionCounters: true,
        gmValidation: true,
        defence: true,
        rewards: false,
      });
    });

    it('hides the initiative settings while that step is off', async () => {
      const { section, settle } = await openCombat();
      toggle(section, 'initiative').click();
      await settle();
      for (const id of ['#combat-initiative-mode', '#combat-initiative-count', '#combat-initiative-faces', '#combat-initiative-formula'])
        expect(section.querySelector(id), id).toBeNull();
      expect(section.querySelector('#combat-movement')).not.toBeNull();
    });

    it('hides the action types while that step is off', async () => {
      const { section, settle } = await openCombat();
      toggle(section, 'action-counters').click();
      await settle();
      expect(section.querySelector('[data-testid="combat-action"]')).toBeNull();
      expect(section.querySelector('[data-testid="combat-action-add"]')).toBeNull();
    });

    it('hides the defence formula while that step is off', async () => {
      const { section, settle } = await openCombat();
      toggle(section, 'defence').click();
      await settle();
      expect(section.querySelector('#combat-defence')).toBeNull();
      expect(section.querySelector('#combat-basic-attack')).not.toBeNull();
    });
  });
});
