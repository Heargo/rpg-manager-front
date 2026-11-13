import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CombatSelectionBusiness } from '../../business/combat-selection.business';
import { CombatBusiness } from '../../business/combat.business';

/** The turn order of the running encounter on the game master's device: rows, initiative, life, statuses, reorder and pick. */
@Component({
  selector: 'app-combat-order',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TranslocoPipe,
    ButtonModule,
    InputNumberModule,
    ProgressBarModule,
  ],
  templateUrl: './combat-order.component.html',
  styleUrl: './combat-order.component.scss',
})
export class CombatOrderComponent {
  /** False when the panel next to it already shows the round. */
  readonly showRound = input(true);

  protected readonly combat = inject(CombatBusiness);
  private readonly selection = inject(CombatSelectionBusiness);
  private readonly messages = inject(MessageService);

  protected readonly state = this.combat.$state;
  protected readonly selectedId = this.selection.$selectedId;
  protected readonly initiatives = signal<Record<string, number | null>>({});

  /** What a drop on the turn order calls: the new order, by combatant id. */
  reorder(ids: string[]): Promise<boolean> {
    return this.run(() => this.combat.reorder(ids));
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    const ids = (this.state()?.combatants ?? []).map((c) => c.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    void this.reorder(ids);
  }

  protected select(id: string): void {
    this.selection.toggle(id);
  }

  protected initiativeOf(id: string): number | null {
    return this.initiatives()[id] ?? null;
  }

  protected setInitiativeDraft(id: string, value: number | null): void {
    this.initiatives.update((drafts) => ({ ...drafts, [id]: value }));
  }

  protected setInitiative(id: string): void {
    const value = this.initiativeOf(id);
    if (value !== null) void this.run(() => this.combat.initiative(id, value));
  }

  protected removeStatus(id: string, status: string): void {
    void this.run(() =>
      this.combat.edit(id, { kind: 'remove-status', status }),
    );
  }

  private async run(call: () => Promise<void>): Promise<boolean> {
    try {
      await call();
      return true;
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.combat.describeError(error),
        life: 4000,
      });
      return false;
    }
  }
}
