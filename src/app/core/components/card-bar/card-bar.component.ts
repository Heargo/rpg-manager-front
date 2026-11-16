import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';

/** A life or mana bar on a portrait card: its name, "current / max" when known, and the fill. */
@Component({
  selector: 'app-card-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBarModule],
  host: { '[class]': 'kind()' },
  template: `
    <div class="bar-label">
      <span>{{ name() }}</span>
      @if (current() !== undefined && max() !== undefined) {
        <span>{{ current() }} / {{ max() }}</span>
      }
    </div>
    <p-progressbar
      [value]="percent()"
      [showValue]="false"
      [attr.aria-label]="name()"
    />
  `,
  styles: `
    :host {
      display: block;
    }
    .bar-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      line-height: 1;
      margin-bottom: 0.15rem;
    }
    p-progressbar {
      --p-progressbar-height: 0.35rem;
    }
    :host(.life) ::ng-deep .p-progressbar-value {
      background: var(--p-red-500);
    }
    :host(.mana) ::ng-deep .p-progressbar-value {
      background: var(--p-blue-500);
    }
  `,
})
export class CardBarComponent {
  readonly kind = input<'life' | 'mana'>('life');
  readonly name = input.required<string>();
  /** 0 to 100. */
  readonly percent = input.required<number>();
  readonly current = input<number | undefined>();
  readonly max = input<number | undefined>();
}
