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
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CombatSelectionBusiness } from '../../business/combat-selection.business';
import { CombatBusiness } from '../../business/combat.business';
import {
  setupTokens,
  startPicks,
  startSlots,
} from '../../helpers/combat-start.rules';
import { Cell } from '../../helpers/combat-grid.rules';
import { PendingResultView } from '../../models/combat';
import { CombatActionsComponent } from '../combat-actions/combat-actions.component';
import { CombatSetupGridComponent } from '../combat-setup-grid/combat-setup-grid.component';

/** The game master's combat panel: start an encounter, run the turns, resolve skill results, end with the rewards. */
@Component({
  selector: 'app-combat-gm-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    StoredImageComponent,
    CombatActionsComponent,
    CombatSetupGridComponent,
  ],
  templateUrl: './combat-gm-panel.component.html',
  styleUrl: './combat-gm-panel.component.scss',
})
export class CombatGmPanelComponent {
  protected readonly combat = inject(CombatBusiness);
  private readonly selection = inject(CombatSelectionBusiness);
  private readonly messages = inject(MessageService);

  protected readonly state = this.combat.$state;
  protected readonly encounter = this.combat.$encounter;

  // Start form
  protected readonly chosen = signal<string[]>([]);
  protected readonly chosenNpcs = signal<string[]>([]);
  protected readonly counts = signal<Record<string, number>>({});
  protected readonly canStart = computed(
    () => this.chosen().length > 0 || this.chosenNpcs().length > 0,
  );
  protected readonly pickedNpcs = computed(() =>
    this.combat.$npcs().filter((npc) => this.chosenNpcs().includes(npc.id)),
  );

  protected readonly placed = signal<Record<string, Cell>>({});
  /** One future token per pick, shown on the setup grid while the world's grid is on. */
  protected readonly slots = computed(() =>
    this.combat.$grid()
      ? startSlots(
          startPicks(
            this.chosen(),
            this.chosenNpcs(),
            this.counts(),
            this.combat.$npcs(),
          ),
          this.combat.$characters(),
          this.combat.$npcs(),
        )
      : [],
  );

  // Running encounter
  protected readonly amount = signal<number | null>(1);
  protected readonly status = signal('');
  protected readonly selected = computed(() => {
    const id = this.selection.$selectedId();
    return this.encounter()?.combatants.find((c) => c.id === id);
  });
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

  protected pickCharacters(ids: string[] | null): void {
    this.chosen.set(ids ?? []);
    this.prunePlaced();
  }

  /** Forgets the cells of tokens that are no longer picked. */
  private prunePlaced(): void {
    const keys = new Set(this.slots().map((s) => s.key));
    this.placed.update((p) =>
      Object.fromEntries(Object.entries(p).filter(([key]) => keys.has(key))),
    );
  }

  protected pickNpcs(ids: string[] | null): void {
    const picked = ids ?? [];
    this.chosenNpcs.set(picked);
    this.counts.update((counts) =>
      Object.fromEntries(
        Object.entries(counts).filter(([id]) => picked.includes(id)),
      ),
    );
    this.prunePlaced();
  }

  protected countOf(npcId: string): number {
    return this.counts()[npcId] ?? 1;
  }

  protected setCount(npcId: string, value: number | null): void {
    this.counts.update((counts) => ({ ...counts, [npcId]: value ?? 1 }));
    this.prunePlaced();
  }

  protected initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  protected async start(): Promise<void> {
    const picks = startPicks(
      this.chosen(),
      this.chosenNpcs(),
      this.counts(),
      this.combat.$npcs(),
      this.startPositions(),
    );
    const started = await this.run(() => this.combat.start(picks));
    if (started) {
      this.chosen.set([]);
      this.chosenNpcs.set([]);
      this.counts.set({});
      this.placed.set({});
    }
  }

  /** The cell shown for every token, or none without a grid. */
  private startPositions(): Record<string, Cell> | undefined {
    const grid = this.combat.$grid();
    if (!grid || !this.slots().length) return undefined;
    return Object.fromEntries(
      setupTokens(this.slots(), this.placed(), grid).map((t) => [
        t.key,
        { x: t.x, y: t.y },
      ]),
    );
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

  protected skillNameOf(pending: PendingResultView): string {
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
    await this.run(() => this.combat.apply(edit.id, { amounts: edit.amounts }));
    this.editing.set(null);
  }

  // End
  protected openEnd(): void {
    if (!this.combat.rewards()) {
      void this.confirmEnd();
      return;
    }
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
      this.selection.clear();
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
