import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MessageLevel } from '../../../../core/models/toast-level';
import { Skill } from '../../../skill/models/skill';
import { CombatBusiness } from '../../business/combat.business';
import {
  defaultTargets,
  targetsArePicked,
  toggleTarget,
} from '../../helpers/combat-targeting.rules';
import { CombatAttribute } from '../../models/combat';

interface Casting {
  skill: Skill;
  targets: string[];
}

/** What one combatant can do on its turn: tick the action counters, use a skill (pick its targets) or an item. */
@Component({
  selector: 'app-combat-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule],
  template: `
    <div class="counters">
      @for (action of actions(); track action.name) {
        <div
          class="counter"
          data-testid="action-counter"
          [attr.data-action-name]="action.name"
          [attr.data-used]="action.used"
          [attr.data-count]="action.count"
        >
          <span class="name">{{ action.name }}</span>
          <span class="dots" aria-hidden="true">
            @for (dot of dots(action.count); track dot) {
              <i
                class="pi"
                [class.pi-circle-fill]="dot >= action.used"
                [class.pi-circle]="dot < action.used"
              ></i>
            }
          </span>
          <span class="left"
            >{{ action.count - action.used }} / {{ action.count }}</span
          >
          <button
            pButton
            type="button"
            data-action="tick"
            size="small"
            severity="secondary"
            icon="pi pi-check"
            [label]="'combat.actions.use' | transloco"
            (click)="tick(action)"
          ></button>
        </div>
      }
    </div>

    @if (skills().length) {
      <h4>{{ 'combat.actions.skills' | transloco }}</h4>
      <ul class="skills">
        @for (entry of skills(); track entry.skill.id) {
          <li
            class="skill"
            data-testid="skill"
            [attr.data-name]="entry.skill.name"
            [attr.data-available]="entry.available"
          >
            <div class="text">
              <strong>{{ entry.skill.name }}</strong>
              <small>{{ entry.summary }}</small>
            </div>
            <button
              pButton
              type="button"
              data-action="use-skill"
              size="small"
              icon="pi pi-bolt"
              [label]="'combat.actions.useSkill' | transloco"
              [severity]="entry.available ? 'primary' : 'secondary'"
              (click)="pick(entry.skill)"
            ></button>
          </li>
        }
      </ul>
    }

    @if (casting(); as cast) {
      <div class="targeting">
        <h4>
          {{
            'combat.actions.pickTargets' | transloco: { skill: cast.skill.name }
          }}
        </h4>
        <div class="targets">
          @for (combatant of combatants(); track combatant.id) {
            <button
              pButton
              type="button"
              data-testid="target"
              size="small"
              [attr.data-name]="combatant.name"
              [attr.data-picked]="cast.targets.includes(combatant.id)"
              [outlined]="!cast.targets.includes(combatant.id)"
              [severity]="combatant.side === 'enemy' ? 'danger' : 'primary'"
              [disabled]="!picking(cast.skill)"
              [label]="combatant.name"
              (click)="toggle(combatant.id)"
            ></button>
          }
        </div>
        <div class="buttons">
          <button
            pButton
            type="button"
            data-action="confirm-skill"
            icon="pi pi-check"
            [label]="'combat.actions.confirm' | transloco"
            [disabled]="!cast.targets.length || busy()"
            (click)="confirm()"
          ></button>
          <button
            pButton
            type="button"
            data-action="cancel-skill"
            severity="secondary"
            [text]="true"
            [label]="'combat.actions.cancel' | transloco"
            (click)="casting.set(null)"
          ></button>
        </div>
      </div>
    }

    @if (items().length) {
      <h4>{{ 'combat.actions.items' | transloco }}</h4>
      <ul class="items">
        @for (entry of items(); track entry.id) {
          <li
            class="item"
            data-testid="item"
            [attr.data-name]="entry.item.name"
          >
            <strong>{{ entry.item.name }}</strong>
            <button
              pButton
              type="button"
              data-action="use-item"
              size="small"
              severity="secondary"
              icon="pi pi-heart"
              [label]="'combat.actions.useItem' | transloco"
              (click)="useItem(entry.id)"
            ></button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    h4 {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
      color: var(--p-text-muted-color);
    }
    .counters,
    .targets,
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .counter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius);
    }
    .left {
      color: var(--p-text-muted-color);
      font-variant-numeric: tabular-nums;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .skill,
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .skill[data-available='false'] .text {
      opacity: 0.5;
    }
    .text {
      display: flex;
      flex-direction: column;
    }
    small {
      color: var(--p-text-muted-color);
    }
  `,
})
export class CombatActionsComponent {
  private readonly combat = inject(CombatBusiness);
  private readonly messages = inject(MessageService);

  readonly combatantId = input.required<string>();
  /** The character whose bag the items come from (none for an NPC). */
  readonly characterId = input<string>();
  readonly sheetSkills = input<{ skillId: string; level: number }[]>([]);
  readonly level = input(1);
  readonly attributes = input<CombatAttribute[]>([]);
  readonly actions = input<{ name: string; count: number; used: number }[]>([]);

  protected readonly casting = signal<Casting | null>(null);
  protected readonly busy = signal(false);
  protected readonly combatants = computed(
    () => this.combat.$state()?.combatants ?? [],
  );

  protected readonly skills = computed(() =>
    this.sheetSkills().flatMap(({ skillId, level }) => {
      const skill = this.combat.$skills().find((s) => s.id === skillId);
      if (skill?.type !== 'active') return [];
      const availability = this.combat.availability(this.combatantId(), skill);
      return [
        {
          skill,
          summary: this.combat.skillSummary(skill, level, {
            level: this.level(),
            attributes: this.attributes(),
          }),
          available: availability.affordable && !availability.onCooldown,
        },
      ];
    }),
  );
  protected readonly items = computed(() =>
    this.combat.itemsOf(this.characterId()),
  );

  protected dots(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  protected tick(action: { name: string; count: number; used: number }): void {
    const used = action.used >= action.count ? 0 : action.used + 1;
    void this.run(() =>
      this.combat.tickAction(this.combatantId(), action.name, used),
    );
  }

  protected pick(skill: Skill): void {
    this.casting.set({
      skill,
      targets: defaultTargets(skill, this.combatantId(), this.combatants()),
    });
  }

  protected picking(skill: Skill): boolean {
    return targetsArePicked(skill);
  }

  protected toggle(id: string): void {
    const cast = this.casting();
    if (cast)
      this.casting.set({
        ...cast,
        targets: toggleTarget(cast.skill, cast.targets, id),
      });
  }

  protected async confirm(): Promise<void> {
    const cast = this.casting();
    if (!cast) return;
    this.busy.set(true);
    await this.run(() =>
      this.combat.useSkill({
        casterId: this.combatantId(),
        skillId: cast.skill.id,
        targetIds: cast.targets,
      }),
    );
    this.casting.set(null);
    this.busy.set(false);
  }

  protected useItem(inventoryId: string): void {
    void this.run(() => this.combat.useItem(this.combatantId(), inventoryId));
  }

  private async run(call: () => Promise<void>): Promise<void> {
    try {
      await call();
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.combat.describeError(error),
        life: 4000,
      });
    }
  }
}
