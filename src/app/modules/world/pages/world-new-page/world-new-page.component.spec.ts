import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { validateWorldDraft } from '../../helpers/world-draft.rules';
import { WorldNewPageComponent } from './world-new-page.component';

/**
 * Contract (step 2 of the wizard), row index N counted from 0 in the order of the attribute list:
 * - native `select[name="formula-preset-N"]` with the values linear, steep-linear, diminishing, percent, custom;
 * - native `input[name="formula-step-N"]` for the presets (hidden for custom);
 * - native `input[name="formula-expression-N"]` for custom only;
 * - `[data-testid="formula-preview-N"]`: max at levels 0 to 5, rounded, separated by single spaces;
 * - `[data-testid="formula-error-N"]` present only while that attribute's formula is invalid;
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
  const flush = () => fixture.whenStable();

  const name = el.querySelector('#world-name') as HTMLInputElement;
  name.value = 'Eldoria';
  name.dispatchEvent(new Event('input'));
  await flush();
  const nextButton = Array.from(el.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Next');
  nextButton!.click();
  await flush();

  const field = (selector: string) => el.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
  const preview = (n: number) =>
    el.querySelector(`[data-testid="formula-preview-${n}"]`)?.textContent?.trim().replace(/\s+/g, ' ');
  const nextDisabled = () => {
    const host = el.querySelector('[data-testid="attributes-next"]')!;
    const button = host.matches('button') ? host : host.querySelector('button')!;
    return (button as HTMLButtonElement).disabled;
  };
  const type = async (selector: string, text: string) => {
    const input = field(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await flush();
  };
  const choose = async (n: number, preset: string) => {
    const select = field(`select[name="formula-preset-${n}"]`)!;
    select.value = preset;
    select.dispatchEvent(new Event('change'));
    await flush();
  };
  return { el, field, preview, nextDisabled, type, choose };
}

describe('WorldNewPageComponent formula picker', () => {
  it('starts Life on Steep linear and the others on Linear, with a preview at levels 0 to 5', async () => {
    const { field, preview } = await openAttributesStep();
    expect(field('select[name="formula-preset-0"]')!.value).toBe('steep-linear');
    expect(field('input[name="formula-step-0"]')!.value).toBe('5');
    expect(preview(0)).toBe('10 15 20 25 30 35');
    expect(field('select[name="formula-preset-1"]')!.value).toBe('linear');
    expect(field('input[name="formula-step-1"]')!.value).toBe('1');
    expect(preview(1)).toBe('5 6 7 8 9 10');
  });

  it('updates the preview when the step changes', async () => {
    const { type, preview } = await openAttributesStep();
    await type('input[name="formula-step-1"]', '3');
    expect(preview(1)).toBe('5 8 11 14 17 20');
  });

  it('switches preset with its default step and a rounded preview', async () => {
    const { choose, field, preview } = await openAttributesStep();
    await choose(1, 'diminishing');
    expect(field('input[name="formula-step-1"]')!.value).toBe('1');
    expect(preview(1)).toBe('5 7 8 8 9 9');
    await choose(1, 'percent');
    expect(field('input[name="formula-step-1"]')!.value).toBe('10');
    expect(preview(1)).toBe('5 6 6 7 7 8');
  });

  it('shows an expression field for Custom and previews it', async () => {
    const { choose, field, type, preview } = await openAttributesStep();
    expect(field('input[name="formula-expression-1"]')).toBeNull();
    await choose(1, 'custom');
    expect(field('input[name="formula-step-1"]')).toBeNull();
    await type('input[name="formula-expression-1"]', 'base + level * 2');
    expect(preview(1)).toBe('5 7 9 11 13 15');
  });

  it('shows a syntax error inline and blocks Next until it is fixed', async () => {
    const { el, choose, type, nextDisabled } = await openAttributesStep();
    expect(nextDisabled()).toBe(false);
    await choose(1, 'custom');
    await type('input[name="formula-expression-1"]', 'base +');
    expect(el.querySelector('[data-testid="formula-error-1"]')?.textContent?.trim()).toBeTruthy();
    expect(el.querySelector('[data-testid="formula-error-0"]')).toBeNull();
    expect(nextDisabled()).toBe(true);
    await type('input[name="formula-expression-1"]', 'base + level');
    expect(el.querySelector('[data-testid="formula-error-1"]')).toBeNull();
    expect(nextDisabled()).toBe(false);
  });

  it('reports a name that is not a variable nor an attribute, and accepts an attribute name', async () => {
    const { el, choose, type, nextDisabled } = await openAttributesStep();
    await choose(1, 'custom');
    await type('input[name="formula-expression-1"]', 'base + Luck');
    expect(el.querySelector('[data-testid="formula-error-1"]')).not.toBeNull();
    expect(nextDisabled()).toBe(true);
    await type('input[name="formula-expression-1"]', 'base + strength');
    expect(el.querySelector('[data-testid="formula-error-1"]')).toBeNull();
    expect(nextDisabled()).toBe(false);
  });
});
