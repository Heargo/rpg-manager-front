import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldDraft } from '../../models/world';
import { RuleFieldsComponent } from './rule-fields.component';

/**
 * Contract: `app-rule-fields` takes `draft` (a `model` of the WorldDraft rule fields: startingStatPoints, startingMoney,
 * levelCurve, maxLevel, statPointsPerLevel, offlineFeatures) and `errors` (WorldDraftErrors), and keeps the wizard's selectors:
 * `#stat-points`, `#max-level`, `#stat-points-per-level` (p-inputnumber inputIds), `select[name="level-curve"]`,
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
  offlineFeatures: { dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false },
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
    expect((progression.querySelector('select[name="level-curve"]') as HTMLSelectElement).value).toBe('growing');
    expect((progression.querySelector('#max-level') as HTMLInputElement).value).toBe('20');
    expect((progression.querySelector('#stat-points-per-level') as HTMLInputElement).value).toBe('3');
    expect(progression.querySelector('[data-testid="level-curve-preview"]')!.textContent!.trim()).toBe('200 300 400 500 600');
    expect(economy.querySelector('app-coin-input')).not.toBeNull();
    expect(offline.querySelectorAll('input').length).toBe(6);
  });

  it('emits the draft with the new level curve when the preset changes', async () => {
    const { el, emitted, settle } = await open();
    const select = el.querySelector('select[name="level-curve"]') as HTMLSelectElement;
    select.value = 'flat';
    select.dispatchEvent(new Event('change'));
    await settle();

    expect(emitted.at(-1)!.levelCurve).toEqual({ preset: 'flat' });
    expect(el.querySelector('[data-testid="level-curve-preview"]')!.textContent!.trim()).toBe('100 100 100 100 100');
  });

  it('shows the validation error it is given', async () => {
    const { el } = await open({ maxLevel: 'world.errors.maxLevelInvalid' });
    expect(el.textContent).toContain('Max level');
    expect(el.querySelector('.error')).not.toBeNull();
  });
});
