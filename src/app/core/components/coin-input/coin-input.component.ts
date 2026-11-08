import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
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
  imports: [FormsModule, InputNumberModule, TranslocoPipe],
  template: `
    @for (coin of coins; track coin) {
      <label class="coin">
        <p-inputnumber
          [min]="0"
          [step]="1"
          [name]="coin"
          [ariaLabel]="'coin.' + coin | transloco"
          [ngModel]="split()[coin]"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="set(coin, $event)"
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
    p-inputnumber {
      width: 5.5rem;
    }
    :host ::ng-deep p-inputnumber .p-inputtext {
      width: 100%;
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

  protected set(coin: Coin, value: number | null): void {
    const amount = Math.max(0, Math.floor(value || 0));
    this.value.set(coinsToCopper({ ...this.split(), [coin]: amount }));
  }
}
