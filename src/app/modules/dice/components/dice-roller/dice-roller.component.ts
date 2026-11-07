import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MAX_DICE } from '../../../../core/generators/dice';
import {
  DICE_PRESETS,
  DiceRollBusiness,
} from '../../business/dice-roll.business';

/**
 * Compact roller for the game table: dice, Roll, the "share with the table" toggle and the table's recent rolls.
 * While it's on screen, other players' shared rolls are thrown here too (needs `app-dice-overlay` on the page).
 */
@Component({
  selector: 'app-dice-roller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  template: `
    <form class="roller" (ngSubmit)="roll()">
      <div class="notation">
        <p-inputnumber
          inputId="table-dice-count"
          [min]="1"
          [max]="maxDice"
          [showButtons]="true"
          buttonLayout="horizontal"
          [ngModel]="dice.$count()"
          (ngModelChange)="dice.$count.set($event ?? 1)"
          name="count"
          [ariaLabel]="'dice.count' | transloco"
          inputStyleClass="count"
        />
        <p-select
          [options]="presets"
          optionLabel="label"
          optionValue="value"
          [ngModel]="dice.$sides()"
          (ngModelChange)="dice.$sides.set($event)"
          name="sides"
          [ariaLabel]="'dice.sides' | transloco"
        />
        <p-button
          type="submit"
          icon="pi pi-box"
          [label]="'dice.roll' | transloco"
          [loading]="rolling()"
        />
      </div>
      @if (dice.$canShare()) {
        <div class="share">
          <p-toggleswitch
            inputId="share-roll"
            [ngModel]="dice.$shareWithTable()"
            (ngModelChange)="dice.$shareWithTable.set($event)"
            name="share"
          />
          <label for="share-roll">{{ 'dice.share' | transloco }}</label>
        </div>
      }
      @if (error()) {
        <p-message severity="error" size="small">{{ error() }}</p-message>
      }
    </form>

    @if (dice.$tableRolls(); as rolls) {
      @if (rolls.length) {
        <h3>{{ 'dice.tableRolls' | transloco }}</h3>
        <ul class="rolls">
          @for (roll of rolls; track roll.id) {
            <li>
              <span class="who">{{ roll.by.name }}</span>
              <span class="muted">{{ roll.count }}d{{ roll.sides }}</span>
              <strong>{{ total(roll.values) }}</strong>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .roller {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .notation {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    :host ::ng-deep .count {
      width: 3rem;
      text-align: center;
    }
    .share {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .rolls {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 12rem;
      overflow-y: auto;
    }
    .rolls li {
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
    }
    .who {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .muted {
      color: var(--p-text-muted-color);
    }
  `,
})
export class DiceRollerComponent {
  protected readonly dice = inject(DiceRollBusiness);
  private readonly language = inject(LanguageBusiness);
  protected readonly maxDice = MAX_DICE;
  protected readonly presets = DICE_PRESETS.map((value) => ({
    value,
    label: `d${value}`,
  }));
  protected readonly rolling = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Someone else rolled for the table: throw the same dice here.
    effect(() => {
      const roll = this.dice.takeUnseenTableRoll();
      if (roll) this.dice.presentShared(roll);
    });
  }

  protected async roll(): Promise<void> {
    this.rolling.set(true);
    this.error.set(null);
    try {
      await this.dice.rollAtTable();
    } catch (error) {
      console.error('Shared roll failed', error);
      this.error.set(this.language.t('dice.errors.shareFailed'));
    } finally {
      this.rolling.set(false);
    }
  }

  protected total(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
  }
}
