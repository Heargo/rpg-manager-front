import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageModule } from '@openng/optimus-ui/message';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { DiceRollBusiness } from '../../business/dice-roll.business';
import { DiceScreenComponent } from '../dice-screen/dice-screen.component';

/**
 * Compact roller for the game table: dice, Roll, the "share with the table" toggle and the table's recent rolls.
 * While it's on screen, other players' shared rolls are thrown here too (needs `app-dice-overlay` on the page).
 */
@Component({
  selector: 'app-dice-roller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    MessageModule,
    DiceScreenComponent,
    ToggleSwitchModule,
  ],
  template: `
    <app-dice-screen
      dock="inline"
      [(count)]="dice.$count"
      [(sides)]="dice.$sides"
      [busy]="rolling()"
      (roll)="roll()"
    >
      @if (dice.$tableRolls(); as rolls) {
        @if (rolls.length) {
          <h3>{{ 'dice.tableRolls' | translate }}</h3>
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
      <div diceOptions class="options">
        @if (dice.$canShare()) {
          <div class="share">
            <p-toggleswitch
              inputId="share-roll"
              [ngModel]="dice.$shareWithTable()"
              (ngModelChange)="dice.$shareWithTable.set($event)"
            />
            <label for="share-roll">{{ 'dice.share' | translate }}</label>
          </div>
        }
        @if (error()) {
          <p-message severity="error" size="small">{{ error() }}</p-message>
        }
      </div>
    </app-dice-screen>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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
