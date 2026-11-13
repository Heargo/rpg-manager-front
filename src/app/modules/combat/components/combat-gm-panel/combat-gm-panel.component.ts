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
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CombatBusiness } from '../../business/combat.business';
import { PendingResult } from '../../models/combat';
import { CombatActionsComponent } from '../combat-actions/combat-actions.component';

/** The game master's combat panel: start an encounter, run the turns, resolve skill results, end with the rewards. */
@Component({
  selector: 'app-combat-gm-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressBarModule,
    CombatActionsComponent,
  ],
  templateUrl: './combat-gm-panel.component.html',
  styleUrl: './combat-gm-panel.component.scss',
})
export class CombatGmPanelComponent {
  protected readonly combat = inject(CombatBusiness);
  private readonly messages = inject(MessageService);

  protected readonly state = this.combat.$state;
  protected readonly encounter = this.combat.$encounter;

  // Start form
  protected readonly chosen = signal<string[]>([]);
  protected readonly counts = signal<Record<string, number>>({});
  protected readonly canStart = computed(
    () =>
      this.chosen().length > 0 ||
      Object.values(this.counts()).some((count) => count > 0),
  );

  // Running encounter
  protected readonly selectedId = signal<string | null>(null);
  protected readonly amount = signal<number | null>(1);
  protected readonly status = signal('');
  protected readonly initiatives = signal<Record<string, number | null>>({});
  protected readonly editing = signal<{ id: string; amounts: number[] } | null>(
    null,
  );

  /** The full record of the active combatant (skills, bag, counters). */
  protected readonly active = computed(() => {
    const encounter = this.encounter();
    return encounter?.combatants.find((c) => c.id === this.state()?.activeId);
  });

  // End dialog
  protected readonly endOpen = signal(false);
  protected readonly endXp = signal<
    { characterId: string; name: string; amount: number }[]
  >([]);
  protected readonly endRewards = computed(() => {
    // Read the encounter so the proposal follows it while the dialog is open.
    this.encounter();
    return this.combat.rewards();
  });

  protected toggleCharacter(id: string): void {
    this.chosen.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }

  protected countOf(npcId: string): number {
    return this.counts()[npcId] ?? 0;
  }

  protected changeCount(npcId: string, by: number): void {
    this.counts.update((counts) => ({
      ...counts,
      [npcId]: Math.max(0, Math.min(20, (counts[npcId] ?? 0) + by)),
    }));
  }

  protected async start(): Promise<void> {
    const npcs = this.combat
      .$npcs()
      .filter((npc) => this.countOf(npc.id) > 0)
      .map((npc) => ({
        npcId: npc.id,
        count: this.countOf(npc.id),
        side: npc.roles.includes('enemy')
          ? ('enemy' as const)
          : ('ally' as const),
      }));
    const started = await this.run(() =>
      this.combat.start({ characterIds: this.chosen(), npcs }),
    );
    if (started) {
      this.chosen.set([]);
      this.counts.set({});
    }
  }

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
    this.selectedId.update((current) => (current === id ? null : id));
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

  protected damage(id: string): void {
    const amount = this.amount();
    if (amount)
      void this.run(() => this.combat.edit(id, { kind: 'damage', amount }));
  }

  protected heal(id: string): void {
    const amount = this.amount();
    if (amount)
      void this.run(() => this.combat.edit(id, { kind: 'heal', amount }));
  }

  protected async addStatus(id: string): Promise<void> {
    const status = this.status().trim();
    if (!status) return;
    if (
      await this.run(() => this.combat.edit(id, { kind: 'add-status', status }))
    )
      this.status.set('');
  }

  protected removeStatus(id: string, status: string): void {
    void this.run(() =>
      this.combat.edit(id, { kind: 'remove-status', status }),
    );
  }

  protected nextTurn(): void {
    void this.run(() => this.combat.endTurn());
  }

  protected undo(): void {
    void this.run(() => this.combat.undo());
  }

  // Pending results
  protected nameOf(id: string): string {
    return this.state()?.combatants.find((c) => c.id === id)?.name ?? '';
  }

  protected skillNameOf(pending: PendingResult): string {
    return (
      pending.skillName ??
      this.combat.$skills().find((s) => s.id === pending.skillId)?.name ??
      ''
    );
  }

  protected apply(id: string): void {
    void this.run(() => this.combat.apply(id));
  }

  protected dismiss(id: string): void {
    void this.run(() => this.combat.dismiss(id));
  }

  protected edit(pending: PendingResult): void {
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
    await this.run(() => this.combat.apply(edit.id, { amounts: edit.amounts }));
    this.editing.set(null);
  }

  // End
  protected openEnd(): void {
    const names = new Map(this.combat.$characters().map((c) => [c.id, c.name]));
    this.endXp.set(
      (this.combat.rewards()?.xp.perCharacter ?? []).map((entry) => ({
        ...entry,
        name: names.get(entry.characterId) ?? '',
      })),
    );
    this.endOpen.set(true);
  }

  protected setEndXp(index: number, value: number | null): void {
    this.endXp.update((list) =>
      list.map((entry, i) =>
        i === index ? { ...entry, amount: value ?? 0 } : entry,
      ),
    );
  }

  protected async confirmEnd(): Promise<void> {
    const xp = this.endXp().map(({ characterId, amount }) => ({
      characterId,
      amount,
    }));
    if (await this.run(() => this.combat.end({ xp }))) {
      this.endOpen.set(false);
      this.selectedId.set(null);
    }
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
