import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { FormulaChartComponent } from './formula-chart.component';

/**
 * Contract: inputs `values` (number[], one per level), `startLevel` (default 0) and `label` (text of the
 * accessible description). Renders an `svg[role="img"]` with one `[data-point]` per value, `[data-label="first"]`
 * and `[data-label="last"]` holding the first and last values, a `[data-axis="start|end"]` per axis end, and an
 * `aria-label` that starts with the label and lists the values.
 */
async function render(values: number[], startLevel?: number, cap?: number) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [FormulaChartComponent],
    providers: TEST_PROVIDERS,
  });
  const fixture = TestBed.createComponent(FormulaChartComponent);
  fixture.componentRef.setInput('values', values);
  fixture.componentRef.setInput('label', 'Max per level');
  if (cap !== undefined) fixture.componentRef.setInput('cap', cap);
  if (startLevel !== undefined)
    fixture.componentRef.setInput('startLevel', startLevel);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('FormulaChartComponent', () => {
  it('renders one point per value', async () => {
    const el = await render([10, 15, 20, 25]);
    expect(el.querySelectorAll('svg [data-point]').length).toBe(4);
  });

  it('labels the first and last values', async () => {
    const el = await render([10, 15, 20, 35]);
    expect(el.querySelector('[data-label="first"]')!.textContent!.trim()).toBe(
      '10',
    );
    expect(el.querySelector('[data-label="last"]')!.textContent!.trim()).toBe(
      '35',
    );
  });

  it('has an aria label listing the values', async () => {
    const el = await render([10, 15, 20]);
    const label = el.querySelector('svg')!.getAttribute('aria-label')!;
    expect(label).toContain('Max per level');
    expect(label).toContain('10 15 20');
    expect(el.querySelector('svg')!.getAttribute('role')).toBe('img');
  });

  it('labels the axis with the levels, translated', async () => {
    const el = await render([1, 2, 3, 4], 2);
    expect(el.querySelector('[data-axis="start"]')!.textContent!.trim()).toBe(
      'lvl 2',
    );
    expect(el.querySelector('[data-axis="end"]')!.textContent!.trim()).toBe(
      'lvl 5',
    );
  });

  it('draws a labelled dashed line at the cap, only when a cap is set', async () => {
    expect(
      (await render([10, 15, 20])).querySelector('[data-cap-line]'),
    ).toBeNull();
    const el = await render([10, 15, 22, 22], undefined, 22);
    const line = el.querySelector('[data-cap-line]')!;
    expect(line.getAttribute('stroke-dasharray') ?? '').toBeDefined();
    expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
    expect(el.querySelector('[data-cap-label]')!.textContent).toContain('22');
    expect(el.innerHTML).not.toContain('NaN');
  });

  it('handles a flat or negative series without NaN', async () => {
    const el = await render([-3, -3, -3]);
    expect(el.innerHTML).not.toContain('NaN');
    expect(el.querySelectorAll('svg [data-point]').length).toBe(3);
  });
});
