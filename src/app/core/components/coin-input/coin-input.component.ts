import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  COINS,
  Coin,
  coinsToCopper,
  splitCopper,
} from '../../helpers/money.rules';

/** Gold, silver and copper fields editing one integer copper amount. */
@Component({
  selector: 'app-coin-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @for (coin of coins; track coin) {
      <label class="coin">
        <input
          type="number"
          min="0"
          step="1"
          [name]="coin"
          [attr.aria-label]="'coin.' + coin | transloco"
          [value]="split()[coin]"
          (input)="set(coin, $event)"
        />
        <img
          [src]="'assets/icons/money/' + coin + '-coin.svg'"
          [alt]="'coin.' + coin | transloco"
        />
      </label>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .coin {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    input {
      width: 5rem;
      padding: 0.4rem 0.5rem;
      color: inherit;
      background: var(--p-inputtext-background, transparent);
      border: 1px solid var(--p-inputtext-border-color, currentColor);
      border-radius: var(--p-inputtext-border-radius, 6px);
    }
    img {
      width: 1.3em;
      height: 1.3em;
    }
  `,
})
export class CoinInputComponent {
  /** Integer copper. */
  readonly value = model(0);
  protected readonly coins = COINS;
  protected readonly split = computed(() => splitCopper(this.value()));

  protected set(coin: Coin, event: Event): void {
    const amount = Math.max(
      0,
      Math.floor(Number((event.target as HTMLInputElement).value) || 0),
    );
    this.value.set(coinsToCopper({ ...this.split(), [coin]: amount }));
  }
}
