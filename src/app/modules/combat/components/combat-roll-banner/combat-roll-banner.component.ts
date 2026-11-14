import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { COMBAT_BANNER_Z_INDEX } from '../../../dice/models/dice-api';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';

/** Targets shown as bubbles; the others read "+N". */
const MAX_TARGET_BUBBLES = 4;

/** The recap of the latest combat roll: who used what on whom, then the dice and the outcome once they landed. */
@Component({
  selector: 'app-combat-roll-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslocoPipe, StoredImageComponent],
  host: { '[style.z-index]': 'zIndex' },
  template: `
    @if (rolls.$banner(); as banner) {
      <div
        class="banner"
        data-testid="roll-banner"
        aria-live="polite"
        [attr.aria-label]="'combat.banner.label' | transloco"
      >
        <span class="who">
          <ng-container
            *ngTemplateOutlet="
              bubble;
              context: { $implicit: banner.caster, role: 'caster' }
            "
          />
          <i class="pi pi-arrow-right" aria-hidden="true"></i>
          @for (target of banner.targets.slice(0, maxTargets); track $index) {
            <ng-container
              *ngTemplateOutlet="
                bubble;
                context: { $implicit: target, role: 'target' }
              "
            />
          }
          @if (banner.targets.length > maxTargets) {
            <span class="more" data-testid="banner-more"
              >+{{ banner.targets.length - maxTargets }}</span
            >
          }
        </span>
        <span class="what">
          <span class="skill" data-field="banner-skill">{{
            banner.skillName
          }}</span>
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
        </span>
      </div>
    }
    <ng-template #bubble let-who let-role="role">
      <span
        class="bubble"
        data-testid="banner-bubble"
        [attr.data-role]="role"
        [attr.data-name]="who.name"
        [attr.data-enemy]="who.side === 'enemy' ? 'true' : null"
        [class.enemy]="who.side === 'enemy'"
        [attr.title]="who.name"
        [attr.aria-label]="who.name"
      >
        @if (who.portraitId; as portraitId) {
          <app-stored-image
            class="portrait"
            [imageId]="portraitId"
            [alt]="who.name"
          >
            <span>{{ who.name.charAt(0).toUpperCase() }}</span>
          </app-stored-image>
        } @else {
          {{ who.name.charAt(0).toUpperCase() }}
        }
      </span>
    </ng-template>
  `,
  styles: `
    :host {
      position: fixed;
      /* Just under the sticky nav bar (8px offset + 50px tall), never over it. */
      top: 4rem;
      left: 0.5rem;
      max-width: calc(100vw - 1rem);
    }
    .banner {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      background: var(--p-surface-0);
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
    }
    .who,
    .what {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
    }
    .what {
      /* Desktop: one line, a separator before the skill; mobile: its own line. */
      border-left: 1px solid var(--p-surface-300);
      padding-left: 0.75rem;
    }
    @media (max-width: 640px) {
      .what {
        flex-basis: 100%;
        border-left: 0;
        padding-left: 0;
      }
    }
    .bubble {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
      font-weight: 600;
      font-size: 0.9rem;
    }
    .bubble.enemy {
      box-shadow: 0 0 0 3px var(--p-red-500);
    }
    .portrait {
      width: 100%;
      height: 100%;
    }
    .more {
      font-weight: 600;
    }
    .skill {
      font-weight: 600;
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
  protected readonly maxTargets = MAX_TARGET_BUBBLES;
  protected readonly zIndex = COMBAT_BANNER_Z_INDEX;
}
