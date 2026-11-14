import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageLevel } from '../../../../core/models/toast-level';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';
import { CombatBusiness } from '../../business/combat.business';
import { PendingResultView } from '../../models/combat';

/** Decides the combat roll on the dice screen: the GM applies, edits or dismisses each result, players wait. Projected into the dice overlay. */
@Component({
  selector: 'app-combat-roll-decision',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, ButtonModule, InputNumberModule],
  template: `
    @if (landed()) {
      @if (combat.$isGameMaster()) {
        @for (pending of rows(); track pending.id) {
          <div class="decision" data-testid="decision">
            <div class="text">
              <strong>
                {{
                  'combat.pending.line'
                    | transloco
                      : {
                          caster: nameOf(pending.casterId),
                          skill: skillNameOf(pending),
                          target: nameOf(pending.targetId),
                        }
                }}
              </strong>
              <small>
                @for (effect of pending.effects; track $index) {
                  {{
                    'combat.skill.' + effect.kind
                      | transloco
                        : {
                            amount: effect.amount,
                            attribute: effect.attribute,
                            duration: effect.duration,
                          }
                  }}{{ $last ? '' : ', ' }}
                }
                @if (!pending.success) {
                  · {{ 'combat.pending.failed' | transloco }}
                }
              </small>
            </div>
            @if (editing()?.id === pending.id) {
              <div class="buttons">
                @for (amount of editing()!.amounts; track $index) {
                  <p-inputnumber
                    data-testid="edit-amount"
                    [ngModel]="amount"
                    (ngModelChange)="setEditedAmount($index, $event)"
                    [min]="0"
                  />
                }
                <button
                  pButton
                  type="button"
                  data-action="apply-edited"
                  size="small"
                  icon="pi pi-check"
                  [label]="'combat.pending.apply' | transloco"
                  (click)="applyEdited()"
                ></button>
                <button
                  pButton
                  type="button"
                  size="small"
                  severity="secondary"
                  [text]="true"
                  [label]="'combat.actions.cancel' | transloco"
                  (click)="editing.set(null)"
                ></button>
              </div>
            } @else {
              <div class="buttons">
                <button
                  pButton
                  type="button"
                  data-action="apply"
                  size="small"
                  icon="pi pi-check"
                  [label]="'combat.pending.apply' | transloco"
                  (click)="run(combat.apply(pending.id))"
                ></button>
                <button
                  pButton
                  type="button"
                  data-action="edit"
                  size="small"
                  severity="secondary"
                  icon="pi pi-pencil"
                  [label]="'combat.pending.edit' | transloco"
                  (click)="edit(pending)"
                ></button>
                <button
                  pButton
                  type="button"
                  data-action="dismiss"
                  size="small"
                  severity="secondary"
                  [text]="true"
                  icon="pi pi-times"
                  [label]="'combat.pending.dismiss' | transloco"
                  (click)="run(combat.dismiss(pending.id))"
                ></button>
              </div>
            }
          </div>
        } @empty {
          <button
            pButton
            type="button"
            data-action="close-roll"
            severity="secondary"
            icon="pi pi-times"
            [label]="'dice.close' | transloco"
            (click)="closeRoll()"
          ></button>
        }
      } @else if (rows().length) {
        <span class="deciding" data-testid="deciding">{{
          'combat.decision.deciding' | transloco
        }}</span>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0;
    }
    .decision {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: space-between;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .deciding {
      color: var(--p-text-muted-color);
    }
  `,
})
export class CombatRollDecisionComponent {
  protected readonly combat = inject(CombatBusiness);
  private readonly dice = inject(DiceRollBusiness);
  private readonly rolls = inject(CombatRollsBusiness);
  private readonly messages = inject(MessageService);

  protected readonly editing = signal<{ id: string; amounts: number[] } | null>(
    null,
  );

  private readonly roll = computed(() => {
    const shown = this.dice.$current();
    return shown?.combat
      ? { id: shown.id, pendingIds: this.rolls.pendingIdsOf(shown.id) }
      : null;
  });
  protected readonly landed = computed(() => {
    const roll = this.roll();
    return !!roll && this.rolls.hasLanded(roll.id);
  });
  /** The results of this roll that still wait for the GM. */
  protected readonly rows = computed(() => {
    const roll = this.roll();
    return (
      this.combat
        .$state()
        ?.pending.filter((p) => roll?.pendingIds.includes(p.id)) ?? []
    );
  });

  protected nameOf(id: string): string {
    return (
      this.combat.$state()?.combatants.find((c) => c.id === id)?.name ?? ''
    );
  }

  protected skillNameOf(pending: PendingResultView): string {
    return (
      pending.skillName ??
      this.combat.$skills().find((s) => s.id === pending.skillId)?.name ??
      ''
    );
  }

  protected edit(pending: PendingResultView): void {
    this.editing.set({
      id: pending.id,
      amounts: pending.effects.map((e) => e.amount),
    });
  }

  protected setEditedAmount(index: number, value: number | null): void {
    this.editing.update((edit) =>
      edit
        ? {
            ...edit,
            amounts: edit.amounts.map((a, i) =>
              i === index ? (value ?? 0) : a,
            ),
          }
        : edit,
    );
  }

  protected async applyEdited(): Promise<void> {
    const edit = this.editing();
    if (!edit) return;
    await this.run(this.combat.apply(edit.id, { amounts: edit.amounts }));
    this.editing.set(null);
  }

  protected closeRoll(): void {
    const roll = this.roll();
    if (roll) void this.run(this.combat.closeRoll(roll.id));
  }

  protected async run(call: Promise<void>): Promise<void> {
    try {
      await call;
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.combat.describeError(error),
        life: 4000,
      });
    }
  }
}
