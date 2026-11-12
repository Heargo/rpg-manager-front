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
