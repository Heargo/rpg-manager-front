import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';

/** The recap of the latest combat roll: who used what on whom, then the dice and the outcome once they landed. */
@Component({
  selector: 'app-combat-roll-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (rolls.$banner(); as banner) {
      <div
        class="banner"
        data-testid="roll-banner"
        aria-live="polite"
        [attr.aria-label]="'combat.banner.label' | transloco"
      >
        <span class="what">
          <strong data-field="banner-caster">{{ banner.casterName }}</strong>
          ·
          <span data-field="banner-skill">{{ banner.skillName }}</span>
          <i class="pi pi-arrow-right" aria-hidden="true"></i>
          @for (target of banner.targetNames; track $index) {
            <span data-field="banner-target">{{ target }}</span>
            @if (!$last) {
              ,
            }
          }
        </span>
        @if (banner.result; as result) {
          <span class="result">
            <i class="pi pi-box" aria-hidden="true"></i>
            <span data-field="banner-dice">{{
              result.values.join(' + ')
            }}</span>
            =
            <strong data-field="banner-total">{{ result.total }}</strong>
            <span
              class="outcome"
              data-field="banner-outcome"
              [attr.data-success]="result.success"
              >{{
                (result.success
                  ? 'combat.banner.success'
                  : 'combat.banner.failure'
                ) | transloco
              }}</span
            >
          </span>
        }
      </div>
    }
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      align-items: baseline;
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      background: var(--p-surface-0);
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
    }
    .outcome {
      margin-left: 0.5rem;
      font-weight: 600;
    }
    .outcome[data-success='true'] {
      color: var(--p-green-600);
    }
    .outcome[data-success='false'] {
      color: var(--p-red-600);
    }
  `,
})
export class CombatRollBannerComponent {
  protected readonly rolls = inject(CombatRollsBusiness);
}
