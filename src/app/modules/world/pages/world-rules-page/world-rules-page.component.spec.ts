import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldSessionBusiness } from '../../business/world-session.business';
import { createWorld } from '../../helpers/world.factory';
import { World } from '../../models/world';
import { WorldRulesPageComponent } from './world-rules-page.component';

/**
 * Contract: `WorldRulesPageComponent` edits the open world of `WorldSessionBusiness` (`$world`) and saves through
 * `WorldSessionBusiness.saveRules(rules: WorldRules)`. It renders one `app-rule-fields` (Progression, Economy, Offline sections)
 * and an attribute table that reuses the wizard's `attribute-row-N` and `formula-cap-N` test ids, plus
 * `attribute-name-N` and `attribute-base-N` (inputs), `attribute-remove-N` (button or contains it), `attribute-add` (button or
 * contains it), `rules-save` (button or contains it) and `rules-error-attributes` (present while the attributes are invalid).
 * Removing an attribute calls `ConfirmationService.confirm` and only drops it when `accept` runs.
 */
function makeWorld(): World {
  let n = 0;
  return createWorld(
    {
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
        { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      ],
      startingStatPoints: 5,
      startingMoney: 100,
    },
    () => `id${++n}`,
    1,
  );
}

async function open() {
  const world = makeWorld();
  const saveRules = vi.fn(async () => world);
  TestBed.configureTestingModule({
    imports: [WorldRulesPageComponent],
    providers: [...TEST_PROVIDERS, { provide: WorldSessionBusiness, useValue: { $world: signal(world), saveRules } }],
  });
  const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  const fixture = TestBed.createComponent(WorldRulesPageComponent);
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  await settle();
  const byId = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const inputOf = (id: string) => {
    const host = byId(id)!;
    return (host.matches('input') ? host : host.querySelector('input')!) as HTMLInputElement;
  };
  const click = async (id: string) => {
    const host = byId(id)!;
    (host.matches('button') ? host : host.querySelector('button')!).click();
    await settle();
  };
  const type = async (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await settle();
  };
  return { world, saveRules, confirm, el, byId, inputOf, click, type, settle };
}

describe('WorldRulesPageComponent', () => {
  it('shows the wizard rule fields with the world values, and one row per attribute', async () => {
    const { el, byId, inputOf } = await open();
    expect(el.querySelectorAll('app-rule-fields').length).toBe(1);
    expect(el.querySelector('[data-testid="rules-section-progression"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="rules-section-economy"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="rules-section-offline"]')).not.toBeNull();
    expect((el.querySelector('#stat-points') as HTMLInputElement).value).toBe('5');
    expect(inputOf('attribute-name-0').value).toBe('Life');
    expect(inputOf('attribute-base-1').value).toBe('5');
    expect(byId('attribute-row-2')).toBeNull();
  });

  it('saves the edited rules and attributes (rename, base, cap, add)', async () => {
    const { world, saveRules, inputOf, type, click, byId } = await open();
    await type(inputOf('attribute-name-0'), 'Vitality');
    await type(inputOf('attribute-base-0'), '12');
    await type(inputOf('formula-cap-0'), '40');
    await click('attribute-add');
    await type(inputOf('attribute-name-2'), 'Luck');
    expect(byId('attribute-row-2')).not.toBeNull();
    await click('rules-save');

    expect(saveRules).toHaveBeenCalledTimes(1);
    const saved = (saveRules.mock.calls as unknown as [any][])[0][0];
    expect(saved.attributes[0]).toMatchObject({ id: world.attributes[0].id, name: 'Vitality', baseValue: 12, cap: 40 });
    expect(saved.attributes[1]).toMatchObject({ id: world.attributes[1].id, name: 'Mana' });
    expect(saved.attributes[2].name).toBe('Luck');
    expect(saved.attributes[2].id).toBeUndefined();
    expect(saved.startingStatPoints).toBe(5);
  });

  it('shows the wizard validation error and does not save while attributes are invalid', async () => {
    const { saveRules, inputOf, type, click, byId } = await open();
    await type(inputOf('attribute-name-1'), 'life');
    expect(byId('rules-error-attributes')).not.toBeNull();
    await click('rules-save');
    expect(saveRules).not.toHaveBeenCalled();
  });

  it('removes an attribute only after confirmation', async () => {
    const { confirm, saveRules, click, byId } = await open();
    await click('attribute-remove-1');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(byId('attribute-row-1')).not.toBeNull();

    (confirm.mock.calls[0][0] as { accept: () => void }).accept();
    await click('rules-save');

    expect(byId('attribute-row-1')).toBeNull();
    const saved = (saveRules.mock.calls as unknown as [any][])[0][0];
    expect(saved.attributes.map((a: { name: string }) => a.name)).toEqual(['Life']);
  });

  it('saves the offline features toggled in its offline section with the other rules', async () => {
    const { el, saveRules, click, settle } = await open();
    const toggle = el.querySelector('#offline-equip') as HTMLInputElement;
    toggle.click();
    await settle();
    await click('rules-save');

    expect(saveRules).toHaveBeenCalledTimes(1);
    const saved = (saveRules.mock.calls as unknown as [any][])[0][0];
    expect(saved.offlineFeatures.equip).toBe(true);
  });
});
