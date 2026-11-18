import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from '@openng/optimus-ui/card';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';
import { DiceRollBusiness } from '../../business/dice-roll.business';
import { DiceScreenComponent } from '../../components/dice-screen/dice-screen.component';
import { DiceOverlayComponent } from '../../components/dice-overlay/dice-overlay.component';

@Component({
  selector: 'app-dice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, CardModule, LocalDatePipe, DiceOverlayComponent, DiceScreenComponent],
  template: `
    <div class="main-container dice">
      <h1>{{ 'dice.title' | translate }}</h1>
      <p-card>
        <app-dice-screen dock="fixed" [(count)]="dice.$count" [(sides)]="dice.$sides" (roll)="dice.roll()">
          @if (dice.$history().length) {
            <h2>{{ 'dice.history' | translate }}</h2>
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
          }
        </app-dice-screen>
      </p-card>

    </div>
    <app-dice-overlay />
  `,
  styles: `
    .dice { max-width: 40rem; margin-inline: auto; display: flex; flex-direction: column; gap: 1rem; }
    h1, h2 { margin: 0; }
    h2 { font-size: 1rem; }
    .history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .history li { display: flex; gap: 0.75rem; align-items: baseline; flex-wrap: wrap; }
    .values { flex: 1; overflow-wrap: anywhere; }
    .muted { color: var(--p-text-muted-color); }
  `,
})
export class DicePageComponent {
  protected readonly dice = inject(DiceRollBusiness);
}
