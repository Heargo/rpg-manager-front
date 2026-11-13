import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { SelectButtonModule } from '@openng/optimus-ui/selectbutton';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';
import { MAX_DICE, MAX_SIDES } from '../../../../core/generators/dice';
import { DICE_PRESETS, DiceRollBusiness } from '../../business/dice-roll.business';
import { DiceOverlayComponent } from '../../components/dice-overlay/dice-overlay.component';

@Component({
  selector: 'app-dice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, ButtonModule, CardModule, InputNumberModule, SelectButtonModule, LocalDatePipe, DiceOverlayComponent],
  template: `
    <div class="main-container dice">
      <h1>{{ 'dice.title' | transloco }}</h1>
      <p-card>
        <form class="roller" (ngSubmit)="dice.roll()">
          <div class="notation">
            <p-inputnumber
              inputId="dice-count"
              [min]="1"
              [max]="maxDice"
              [showButtons]="true"
              [ngModel]="dice.$count()"
              (ngModelChange)="dice.$count.set($event ?? 1)"
              name="count"
              [ariaLabel]="'dice.count' | transloco"
              inputStyleClass="count"
            />
            <span class="d">d</span>
            <p-inputnumber
              inputId="dice-sides"
              [min]="2"
              [max]="maxSides"
              [ngModel]="dice.$sides()"
              (ngModelChange)="dice.$sides.set($event ?? 6)"
              name="sides"
              [ariaLabel]="'dice.sides' | transloco"
              inputStyleClass="sides"
            />
          </div>
          <p-selectbutton
            [options]="presets"
            [ngModel]="dice.$sides()"
            (ngModelChange)="$event && dice.$sides.set($event)"
            name="preset"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            [ariaLabel]="'dice.sides' | transloco"
          />
          <p-button type="submit" icon="pi pi-box" [label]="('dice.roll' | transloco) + ' ' + dice.$notation()" size="large" />
        </form>
      </p-card>

      @if (dice.$history().length) {
        <p-card [header]="'dice.history' | transloco">
          <ul class="history">
            @for (roll of dice.$history(); track roll.id) {
              <li>
                <span class="muted">{{ roll.count }}d{{ roll.sides }}</span>
                <span class="values">{{ roll.values.length > 1 ? roll.values.join(' + ') + ' =' : '' }}</span>
                <strong>{{ roll.total }}</strong>
                <small class="muted">{{ roll.at | localDate: 'dateTime' }}</small>
              </li>
            }
          </ul>
        </p-card>
      }
    </div>
    <app-dice-overlay />
  `,
  styles: `
    .dice { max-width: 40rem; margin-inline: auto; display: flex; flex-direction: column; gap: 1rem; }
    h1 { margin: 0; }
    .roller { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .notation { display: flex; align-items: center; gap: 0.5rem; }
    :host ::ng-deep .count, :host ::ng-deep .sides { width: 5rem; text-align: center; font-size: 1.5rem; }
    :host ::ng-deep .count { width: 7rem; }
    :host ::ng-deep p-selectbutton, :host ::ng-deep .p-selectbutton { max-width: 100%; }
    :host ::ng-deep .p-selectbutton { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem; }
    :host ::ng-deep .p-selectbutton .p-togglebutton { border-radius: var(--p-togglebutton-border-radius, 6px); }
    .roller { max-width: 100%; }
    .d { font-size: 1.5rem; font-weight: 700; }
    .history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .history li { display: flex; gap: 0.75rem; align-items: baseline; flex-wrap: wrap; }
    .values { flex: 1; overflow-wrap: anywhere; }
    .muted { color: var(--p-text-muted-color); }
  `,
})
export class DicePageComponent {
  protected readonly dice = inject(DiceRollBusiness);
  protected readonly maxDice = MAX_DICE;
  protected readonly maxSides = MAX_SIDES;
  protected readonly presets = DICE_PRESETS.map((value) => ({ value, label: `d${value}` }));
}
