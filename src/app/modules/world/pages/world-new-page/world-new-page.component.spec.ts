import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { validateWorldDraft } from '../../helpers/world-draft.rules';
import { WorldNewPageComponent } from './world-new-page.component';

/**
 * Contract (step 2 of the wizard), row index N counted from 0 in the order of the attribute list:
 * - `[data-testid="attribute-row-N"]`: one compact row per attribute, holding every control below except the custom line;
 * - `[data-testid="formula-preset-N"]`: the Optimus `p-select` for the progression (Linear, Steep linear, Diminishing,
 *   Percent, Custom), opened by a click, its options in the overlay (`li[role="option"]`);
 * - `[data-testid="formula-step-N"]`: a `p-inputnumber` for the presets (absent for custom);
 * - `[data-testid="formula-preview-N"]`: short text "max A → B" (levels 0 and 5, rounded), with the full levels 0 to 5
 *   separated by single spaces in its `data-levels` attribute (feeding the tooltip);
 * - `[data-testid="formula-custom-N"]`: the custom line under the row, present only for a Custom row; it holds
 *   `input[data-testid="formula-expression-N"]` and `[data-testid="formula-error-N"]` (only while invalid);
 * - `[data-testid="bar-life-N"]` / `[data-testid="bar-mana-N"]`: per-row toggles (the element or an inner button carries
 *   `aria-pressed` or `aria-checked`), exclusive across rows; Life starts on row 0 and Mana on row 1;
 * - `[data-testid="attributes-next"]` is the Next button of step 2 (or contains it).
 * Default rows in English: Life (base 10, steep linear), Mana (5), Strength (1), Agility (1), Intelligence (1), linear.
 */
async function openAttributesStep() {
  TestBed.configureTestingModule({
    imports: [WorldNewPageComponent],
    providers: [
      ...TEST_PROVIDERS,
      {
        provide: WorldLibraryBusiness,
        useValue: { validateDraft: validateWorldDraft, uploadImage: async () => 'img', create: async () => undefined },
      },
    ],
  });
  const fixture = TestBed.createComponent(WorldNewPageComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const flush = settle;

  const name = el.querySelector('#world-name') as HTMLInputElement;
  name.value = 'Eldoria';
  name.dispatchEvent(new Event('input'));
  await flush();
  const nextButton = Array.from(el.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Next');
  nextButton!.click();
  await flush();

  const field = (selector: string) => el.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
  const byId = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const text = (id: string) => byId(id)?.textContent?.trim().replace(/\s+/g, ' ');
  const preview = (n: number) => text(`formula-preview-${n}`);
  const levels = (n: number) => byId(`formula-preview-${n}`)?.getAttribute('data-levels');
  const presetLabel = (n: number) =>
    byId(`formula-preset-${n}`)?.querySelector('.p-select-label')?.textContent?.trim();
  const stepValue = (n: number) => byId(`formula-step-${n}`)?.querySelector('input')?.value;
  const nextDisabled = () => {
    const host = el.querySelector('[data-testid="attributes-next"]')!;
    const button = host.matches('button') ? host : host.querySelector('button')!;
    return (button as HTMLButtonElement).disabled;
  };
  const type = async (selector: string, value: string) => {
    const input = field(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await flush();
  };
  const typeStep = async (n: number, value: string) => {
    const input = byId(`formula-step-${n}`)!.querySelector('input')!;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await flush();
  };
  const choose = async (n: number, label: string) => {
    byId(`formula-preset-${n}`)!.click();
    await flush();
    const option = Array.from(document.querySelectorAll('li[role="option"]')).find(
      (item) => item.textContent?.trim() === label,
    ) as HTMLElement;
    option.click();
    await flush();
  };
  const toggle = (id: string) => {
    const host = byId(id)!;
    return host.matches('button') ? host : (host.querySelector('button') ?? host);
  };
  const barOn = (id: string) => {
    const target = toggle(id);
    return (target.getAttribute('aria-pressed') ?? target.getAttribute('aria-checked')) === 'true';
  };
  const pick = async (id: string) => {
    toggle(id).click();
    await flush();
  };
  return { el, field, byId, text, preview, levels, presetLabel, stepValue, nextDisabled, type, typeStep, choose, barOn, pick };
}

describe('WorldNewPageComponent attribute rows', () => {
  it('renders one compact row per attribute, with the controls inside it', async () => {
    const { byId, el } = await openAttributesStep();
    for (let n = 0; n < 5; n++) {
      const row = byId(`attribute-row-${n}`)!;
      expect(row).not.toBeNull();
      expect(row.contains(byId(`formula-preset-${n}`))).toBe(true);
      expect(row.contains(byId(`formula-step-${n}`))).toBe(true);
      expect(row.contains(byId(`formula-preview-${n}`))).toBe(true);
    }
    expect(byId('attribute-row-5')).toBeNull();
    expect(el.querySelectorAll('select.native').length).toBe(0);
  });

  it('uses an Optimus select for the progression', async () => {
    const { byId } = await openAttributesStep();
    expect(byId('formula-preset-0')!.tagName.toLowerCase()).toBe('p-select');
  });
});

describe('WorldNewPageComponent formula picker', () => {
  it('starts Life on Steep linear and the others on Linear, with a short max preview', async () => {
    const { presetLabel, stepValue, preview, levels } = await openAttributesStep();
    expect(presetLabel(0)).toBe('Steep linear');
    expect(stepValue(0)).toBe('5');
    expect(preview(0)).toBe('max 10 → 35');
    expect(levels(0)).toBe('10 15 20 25 30 35');
    expect(presetLabel(1)).toBe('Linear');
    expect(stepValue(1)).toBe('1');
    expect(preview(1)).toBe('max 5 → 10');
    expect(levels(1)).toBe('5 6 7 8 9 10');
  });

  it('updates the preview when the step changes', async () => {
    const { typeStep, preview, levels } = await openAttributesStep();
    await typeStep(1, '3');
    expect(preview(1)).toBe('max 5 → 20');
    expect(levels(1)).toBe('5 8 11 14 17 20');
  });

  it('switches preset with its default step and a rounded preview', async () => {
    const { choose, presetLabel, stepValue, preview, levels } = await openAttributesStep();
    await choose(1, 'Diminishing');
    expect(presetLabel(1)).toBe('Diminishing');
    expect(stepValue(1)).toBe('1');
    expect(preview(1)).toBe('max 5 → 9');
    expect(levels(1)).toBe('5 7 8 8 9 9');
    await choose(1, 'Percent');
    expect(stepValue(1)).toBe('10');
    expect(preview(1)).toBe('max 5 → 8');
    expect(levels(1)).toBe('5 6 6 7 7 8');
  });

  it('shows the custom line only for a Custom row and previews it', async () => {
    const { choose, byId, type, preview, levels } = await openAttributesStep();
    expect(byId('formula-custom-1')).toBeNull();
    expect(byId('formula-expression-1')).toBeNull();
    await choose(1, 'Custom');
    expect(byId('formula-custom-1')).not.toBeNull();
    expect(byId('formula-custom-1')!.contains(byId('formula-expression-1'))).toBe(true);
    expect(byId('formula-custom-0')).toBeNull();
    expect(byId('formula-step-1')).toBeNull();
    await type('[data-testid="formula-expression-1"]', 'base + level * 2');
    expect(preview(1)).toBe('max 5 → 15');
    expect(levels(1)).toBe('5 7 9 11 13 15');
    await choose(1, 'Linear');
    expect(byId('formula-custom-1')).toBeNull();
  });

  it('shows a syntax error inline and blocks Next until it is fixed', async () => {
    const { el, choose, type, nextDisabled, byId } = await openAttributesStep();
    expect(nextDisabled()).toBe(false);
    await choose(1, 'Custom');
    await type('[data-testid="formula-expression-1"]', 'base +');
    expect(byId('formula-error-1')?.textContent?.trim()).toBeTruthy();
    expect(byId('formula-custom-1')!.contains(byId('formula-error-1'))).toBe(true);
    expect(el.querySelector('[data-testid="formula-error-0"]')).toBeNull();
    expect(nextDisabled()).toBe(true);
    await type('[data-testid="formula-expression-1"]', 'base + level');
    expect(el.querySelector('[data-testid="formula-error-1"]')).toBeNull();
    expect(nextDisabled()).toBe(false);
  });

  it('reports a name that is not a variable nor an attribute, and accepts an attribute name', async () => {
    const { el, choose, type, nextDisabled } = await openAttributesStep();
    await choose(1, 'Custom');
    await type('[data-testid="formula-expression-1"]', 'base + Luck');
    expect(el.querySelector('[data-testid="formula-error-1"]')).not.toBeNull();
    expect(nextDisabled()).toBe(true);
    await type('[data-testid="formula-expression-1"]', 'base + strength');
    expect(el.querySelector('[data-testid="formula-error-1"]')).toBeNull();
    expect(nextDisabled()).toBe(false);
  });
});

describe('WorldNewPageComponent life and mana bars', () => {
  it('starts with Life on the first row and Mana on the second', async () => {
    const { barOn } = await openAttributesStep();
    expect(barOn('bar-life-0')).toBe(true);
    expect(barOn('bar-mana-1')).toBe(true);
    expect(barOn('bar-life-1')).toBe(false);
    expect(barOn('bar-mana-0')).toBe(false);
    expect(barOn('bar-life-2')).toBe(false);
  });

  it('moves Life off row 0 when it is picked on row 2', async () => {
    const { barOn, pick } = await openAttributesStep();
    await pick('bar-life-2');
    expect(barOn('bar-life-2')).toBe(true);
    expect(barOn('bar-life-0')).toBe(false);
    expect(barOn('bar-mana-1')).toBe(true);
  });

  it('moves Mana to another row the same way', async () => {
    const { barOn, pick } = await openAttributesStep();
    await pick('bar-mana-3');
    expect(barOn('bar-mana-3')).toBe(true);
    expect(barOn('bar-mana-1')).toBe(false);
    expect(barOn('bar-life-0')).toBe(true);
  });

  it('has no select for the bars at the bottom any more', async () => {
    const { el } = await openAttributesStep();
    expect(el.querySelector('#life-bar')).toBeNull();
    expect(el.querySelector('#mana-bar')).toBeNull();
  });
});

/**
 * Contract (step 3, Rules), reached from the attributes step through `[data-testid="attributes-next"]`:
 * - native `select[name="level-curve"]` with the values flat, growing (default), steep, classic, custom;
 * - native `input[name="level-curve-expression"]` for custom only;
 * - `[data-testid="level-curve-preview"]`: XP cost of levels 2 to 6, separated by single spaces;
 * - `[data-testid="level-curve-error"]` present only while a custom curve is invalid, and the Create button is disabled;
 * - `#stat-points-per-level` input, default 3.
 */
describe('WorldNewPageComponent level curve', () => {
  async function openRulesStep() {
    const base = await openAttributesStep();
    const host = base.el.querySelector('[data-testid="attributes-next"]')!;
    (host.matches('button') ? (host as HTMLButtonElement) : host.querySelector('button')!).click();
    await new Promise((resolve) => setTimeout(resolve));
    const text = (selector: string) => base.el.querySelector(selector)?.textContent?.trim().replace(/\s+/g, ' ');
    const choose = async (value: string) => {
      const select = base.field('select[name="level-curve"]')!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await new Promise((resolve) => setTimeout(resolve));
    };
    const createDisabled = () => {
      const button = Array.from(base.el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Create');
      return button!.disabled;
    };
    return { ...base, text, choose, createDisabled };
  }

  it('defaults to Growing, with a preview of levels 2 to 6 and 3 stat points per level', async () => {
    const { field, text } = await openRulesStep();
    expect(field('select[name="level-curve"]')!.value).toBe('growing');
    expect(text('[data-testid="level-curve-preview"]')).toBe('200 300 400 500 600');
    expect((document.querySelector('#stat-points-per-level') as HTMLInputElement).value).toBe('3');
  });

  it.each([
    ['flat', '100 100 100 100 100'],
    ['steep', '100 150 225 338 506'],
    ['classic', '300 600 1800 3800 7500'],
  ])('previews the %s curve', async (preset, expected) => {
    const { choose, text } = await openRulesStep();
    await choose(preset);
    expect(text('[data-testid="level-curve-preview"]')).toBe(expected);
  });

  it('previews a custom curve and blocks Create while it is invalid', async () => {
    const { choose, type, text, el, createDisabled } = await openRulesStep();
    await choose('custom');
    await type('input[name="level-curve-expression"]', 'level * 50');
    expect(text('[data-testid="level-curve-preview"]')).toBe('100 150 200 250 300');
    expect(el.querySelector('[data-testid="level-curve-error"]')).toBeNull();
    expect(createDisabled()).toBe(false);

    await type('input[name="level-curve-expression"]', 'level +');
    expect(el.querySelector('[data-testid="level-curve-error"]')?.textContent?.trim()).toBeTruthy();
    expect(createDisabled()).toBe(true);
  });
});

describe('WorldNewPageComponent switching to Custom', () => {
  it('keeps a valid expression and the same preview when going from Linear to Custom', async () => {
    const { choose, byId, preview, levels, nextDisabled } = await openAttributesStep();
    const before = levels(1);
    await choose(1, 'Custom');
    expect((byId('formula-expression-1') as HTMLInputElement).value).toBe('base + level * 1');
    expect(byId('formula-error-1')).toBeNull();
    expect(levels(1)).toBe(before);
    expect(preview(1)).toBe('max 5 → 10');
    expect(nextDisabled()).toBe(false);
  });
});

describe('WorldNewPageComponent formula chart', () => {
  it('opens a chart of levels 0 to 10 from the max preview, which keeps its levels 0 to 5 data', async () => {
    const { el, byId, pick, levels } = await openAttributesStep();
    expect(byId('formula-preview-0')!.hasAttribute('data-chart-trigger')).toBe(true);
    expect(el.querySelector('app-formula-chart')).toBeNull();
    await pick('formula-preview-0');
    expect(el.querySelectorAll('app-formula-chart svg [data-point]').length).toBe(11);
    expect(levels(0)!.split(' ').length).toBe(6);
    await pick('formula-preview-0');
    expect(el.querySelector('app-formula-chart')).toBeNull();
  });
});
