import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { coinDisplayParts } from '../../helpers/money.rules';

/** An amount of copper as gold, silver and copper with their coin icons. */
@Component({
  selector: 'app-coin-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @for (part of parts(); track part.coin) {
      <span class="coin" [attr.data-coin]="part.coin">
        {{ part.amount }}
        <img
          [src]="'assets/icons/money/' + part.coin + '-coin.svg'"
          [alt]="'coin.' + part.coin | transloco"
        />
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }
    .coin {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }
    img {
      width: 1.1em;
      height: 1.1em;
    }
  `,
})
export class CoinDisplayComponent {
  readonly copper = input.required<number>();
  protected readonly parts = computed(() => coinDisplayParts(this.copper()));
}
