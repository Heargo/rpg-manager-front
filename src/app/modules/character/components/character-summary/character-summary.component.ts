import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { CoinDisplayComponent } from '../../../../core/components/coin-display/coin-display.component';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { Character } from '../../../world/models/world';
import { CharacterBusiness } from '../../business/character.business';

/** A character at a glance: portrait, life and mana bars, attributes, stat points and money. */
@Component({
  selector: 'app-character-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    BadgeModule,
    ProgressBarModule,
    CoinDisplayComponent,
    StoredImageComponent,
  ],
  template: `
    @let c = character();
    <header>
      <app-stored-image
        class="portrait"
        [imageId]="c.portraitId"
        [alt]="c.name"
      >
        <span class="initial">{{ c.name.charAt(0).toUpperCase() }}</span>
      </app-stored-image>
      <div class="who">
        <h2>{{ c.name }}</h2>
        @if (characters.playerName(c.playerId); as player) {
          <small>{{
            'character.sheet.playedBy' | transloco: { name: player }
          }}</small>
        }
      </div>
    </header>

    @for (bar of bars(); track bar.kind) {
      <div class="bar" [class]="bar.kind">
        <div class="bar-label">
          <span>{{ bar.stat.name }}</span>
          <span>{{ bar.stat.current }} / {{ bar.stat.max }}</span>
        </div>
        <p-progressbar
          [value]="bar.stat.percent"
          [showValue]="false"
          [attr.aria-label]="bar.stat.name"
        />
      </div>
    }

    <dl class="facts">
      <div>
        <dt>{{ 'character.sheet.statPoints' | transloco }}</dt>
        <dd>
          @if (c.statPoints > 0) {
            <p-badge [value]="c.statPoints" severity="info" />
          } @else {
            0
          }
        </dd>
      </div>
      <div>
        <dt>{{ 'character.sheet.money' | transloco }}</dt>
        <dd><app-coin-display [copper]="c.money" /></dd>
      </div>
    </dl>

    @if (stats().length) {
      <table class="attributes">
        <thead>
          <tr>
            <th scope="col">{{ 'character.sheet.attribute' | transloco }}</th>
            <th scope="col">{{ 'character.sheet.value' | transloco }}</th>
          </tr>
        </thead>
        <tbody>
          @for (stat of stats(); track stat.attributeId) {
            <tr>
              <th scope="row">{{ stat.name }}</th>
              <td>
                @if (stat.current !== stat.max) {
                  {{ stat.current }} / {{ stat.max }}
                } @else {
                  {{ stat.max }}
                }
                @if (stat.bonus) {
                  <small class="bonus" [class.malus]="stat.bonus < 0"
                    >({{ stat.bonus > 0 ? '+' : '' }}{{ stat.bonus }})</small
                  >
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .portrait {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      flex: none;
      background: var(--p-content-hover-background);
    }
    .initial {
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .who {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    small {
      color: var(--p-text-muted-color);
    }
    .bar-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }
    .bar p-progressbar {
      --p-progressbar-height: 0.75rem;
    }
    .life ::ng-deep .p-progressbar-value {
      background: var(--p-red-500);
    }
    .mana ::ng-deep .p-progressbar-value {
      background: var(--p-blue-500);
    }
    .facts {
      display: flex;
      gap: 1.5rem;
      margin: 0;
    }
    .facts div {
      display: flex;
      flex-direction: column;
    }
    dt {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
    .attributes {
      width: 100%;
      border-collapse: collapse;
    }
    .attributes th,
    .attributes td {
      text-align: left;
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    .attributes thead th {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
      font-weight: 500;
    }
    .attributes tbody th {
      font-weight: 400;
    }
    .attributes td {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .attributes thead th:last-child {
      text-align: right;
    }
    .bonus {
      margin-left: 0.25rem;
      color: var(--p-green-600);
    }
    .bonus.malus {
      color: var(--p-red-600);
    }
  `,
})
export class CharacterSummaryComponent {
  protected readonly characters = inject(CharacterBusiness);

  readonly character = input.required<Character>();

  protected readonly stats = computed(() =>
    this.characters.statsOf(this.character()),
  );
  protected readonly bars = computed(() => {
    const { life, mana } = this.characters.barsOf(this.character());
    return [
      ...(life ? [{ kind: 'life', stat: life }] : []),
      ...(mana ? [{ kind: 'mana', stat: mana }] : []),
    ];
  });
}
