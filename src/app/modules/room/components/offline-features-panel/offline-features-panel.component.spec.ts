import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { OfflineFeatures } from '../../../world/models/world';
import { OfflineFeaturesPanelComponent } from './offline-features-panel.component';

const features: OfflineFeatures = { dice: true, notes: true, spendStatPoints: false, equip: false, useConsumables: false, sell: false };

/**
 * Contract: one `[data-feature="<key>"]` row per feature (the OfflineFeatures keys), each holding a
 * `p-toggleswitch` whose `input[role="switch"]` is checked when the feature is on. `featuresChange` emits the
 * whole object after each toggle.
 */
async function render() {
  TestBed.configureTestingModule({ imports: [OfflineFeaturesPanelComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(OfflineFeaturesPanelComponent);
  fixture.componentRef.setInput('features', features);
  const changes: OfflineFeatures[] = [];
  fixture.componentInstance.featuresChange.subscribe((value) => changes.push(value));
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, changes };
}

const toggle = (el: HTMLElement, key: string) => el.querySelector(`[data-feature="${key}"] input[role="switch"]`) as HTMLInputElement;

describe('OfflineFeaturesPanelComponent', () => {
  it('shows one switch per feature, set from the current features', async () => {
    const { el } = await render();
    for (const key of Object.keys(features) as (keyof OfflineFeatures)[]) {
      expect(toggle(el, key), key).not.toBeNull();
      expect(toggle(el, key).checked, key).toBe(features[key]);
    }
  });

  it('emits the whole features object with the toggled one changed', async () => {
    const { el, changes } = await render();
    toggle(el, 'spendStatPoints').click();
    expect(changes).toEqual([{ ...features, spendStatPoints: true }]);
  });
});
