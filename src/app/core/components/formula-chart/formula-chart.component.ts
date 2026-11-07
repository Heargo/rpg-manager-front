import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { LanguageBusiness } from '../../business/language.business';

const WIDTH = 224;
const HEIGHT = 128;
const PAD = { left: 10, right: 14, top: 22, bottom: 24 };

/** Small inline SVG line chart of one value per level (no chart library). */
@Component({
  selector: 'app-formula-chart',
  templateUrl: './formula-chart.component.html',
  styleUrl: './formula-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaChartComponent {
  private readonly language = inject(LanguageBusiness);

  readonly values = input.required<number[]>();
  readonly startLevel = input(0);
  /** Start of the accessible description, e.g. "Max per level". */
  readonly label = input('');
  /** Optional hard cap: drawn as a thin dashed line, labelled. */
  readonly cap = input<number | undefined>(undefined);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  protected readonly points = computed(() => {
    const values = this.values();
    if (!values.length) return [];
    const { min, span } = this.scale();
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    return values.map((value, i) => ({
      value,
      x:
        PAD.left +
        (values.length > 1 ? (i / (values.length - 1)) * innerW : innerW / 2),
      y: PAD.top + innerH - ((value - min) / span) * innerH,
    }));
  });

  private readonly scale = computed(() => {
    const cap = this.cap();
    const values = cap === undefined ? this.values() : [...this.values(), cap];
    const min = Math.min(0, ...values);
    const max = Math.max(...values);
    return { min, span: max - min || 1 };
  });

  /** Height of the cap line, when a cap is set and there is something to draw. */
  protected readonly capY = computed(() => {
    const cap = this.cap();
    if (cap === undefined || !this.values().length) return null;
    const { min, span } = this.scale();
    return PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - (cap - min) / span);
  });
  protected readonly capText = computed(() =>
    this.language.t('formula.chart.cap', { cap: this.cap() }),
  );

  protected readonly line = computed(() =>
    this.points()
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly area = computed(() => {
    const points = this.points();
    if (!points.length) return '';
    const base = HEIGHT - PAD.bottom;
    const first = points[0];
    const last = points[points.length - 1];
    return `M${first.x.toFixed(1)},${base} L${this.line()} L${last.x.toFixed(1)},${base} Z`;
  });

  protected readonly baseline = HEIGHT - PAD.bottom;

  protected readonly startText = computed(() =>
    this.language.t('formula.chart.level', { level: this.startLevel() }),
  );
  protected readonly endText = computed(() =>
    this.language.t('formula.chart.level', {
      level: this.startLevel() + this.values().length - 1,
    }),
  );
  protected readonly description = computed(
    () => `${this.label()}: ${this.values().join(' ')}`,
  );
}
