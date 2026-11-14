import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CombatBusiness } from '../../business/combat.business';
import { TableNpcCardComponent } from '../../../table/components/table-npc-card/table-npc-card.component';
import { CombatActionsComponent } from '../combat-actions/combat-actions.component';

/** A player's side of an encounter: the turn order, their turn, their own skills, items and counters, and the last roll. */
@Component({
  selector: 'app-combat-player-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.docked]': 'docked()' },
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputNumberModule,
    CombatActionsComponent,
    TableNpcCardComponent,
  ],
  template: `
    @if (state(); as encounter) {
      <ol class="order" [attr.aria-label]="'combat.order' | transloco">
        @for (combatant of encounter.combatants; track combatant.id) {
          <li
            data-testid="order-item"
            [attr.data-name]="combatant.name"
            [attr.data-active]="
              combatant.id === encounter.activeId ? 'true' : null
            "
            [class.active]="combatant.id === encounter.activeId"
            [class.down]="combatant.down"
            [class.enemy]="combatant.side === 'enemy'"
          >
            @if (combatant.characterId) {
              {{ combatant.name }}
            } @else {
              <button
                type="button"
                class="npc"
                data-action="open-npc"
                [attr.aria-expanded]="openNpcId() === combatant.id"
                (click)="toggleNpc(combatant.id)"
              >
                {{ combatant.name }}
                @if (combatant.level !== undefined) {
                  <small data-field="level">{{
                    'combat.levelShort' | transloco: { level: combatant.level }
                  }}</small>
                }
              </button>
            }
          </li>
        }
      </ol>
      @if (openNpc(); as npc) {
        <app-table-npc-card data-testid="npc-card" [npc]="npc" />
      }

      @if (myTurn()) {
        <div class="banner" data-testid="your-turn">
          <i class="pi pi-flag"></i>
          <strong>{{ 'combat.yourTurn' | transloco }}</strong>
          <button
            pButton
            type="button"
            data-action="end-turn"
            icon="pi pi-step-forward"
            [label]="'combat.endTurn' | transloco"
            (click)="endTurn()"
          ></button>
        </div>
      }

      @if (encounter.initiativeMode === 'typed') {
        <div class="initiative">
          <label for="player-initiative">{{
            'combat.initiative.yours' | transloco
          }}</label>
          <p-inputnumber
            inputId="player-initiative"
            data-testid="initiative-input"
            [ngModel]="initiative()"
            (ngModelChange)="initiative.set($event)"
            [showButtons]="true"
          />
          <button
            pButton
            type="button"
            data-action="initiative-set"
            icon="pi pi-check"
            [label]="'combat.initiative.set' | transloco"
            [disabled]="initiative() === null"
            (click)="setInitiative()"
          ></button>
        </div>
      }

      @if (roll(); as last) {
        <div class="roll" data-testid="roll">
          <i class="pi pi-sparkles"></i>
          {{
            'combat.roll'
              | transloco
                : {
                    caster: last.caster,
                    skill: last.skill,
                    rolls: last.rolls.join(' + '),
                    total: last.total,
                  }
          }}
        </div>
      }
      @if (waiting()) {
        <p class="waiting" data-testid="waiting-gm">
          <i class="pi pi-hourglass"></i> {{ 'combat.waitingGm' | transloco }}
        </p>
      }

      @if (myTurn()) {
        <app-combat-actions
          [class.actions-bar]="docked()"
          [combatantId]="combatantId()"
          [characterId]="characterId()"
          [sheetSkills]="character()?.skills ?? []"
          [level]="character()?.level ?? 1"
          [attributes]="me()?.attributes ?? []"
          [actions]="me()?.actions ?? []"
        />
      } @else {
        <p class="waiting" data-testid="waiting-turn">
          <i class="pi pi-hourglass"></i>
          {{ 'combat.waitingTurn' | transloco: { name: activeName() } }}
        </p>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .order {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
    }
    .order li {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 999px;
      white-space: nowrap;
    }
    .order .npc {
      all: unset;
      cursor: pointer;
    }
    .order .npc small {
      margin-left: 0.35rem;
      opacity: 0.75;
    }
    .order li.enemy {
      border-color: var(--p-red-400);
    }
    .order li.active {
      background: var(--p-primary-color);
      border-color: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
    }
    .order li.down {
      text-decoration: line-through;
      opacity: 0.6;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.9rem;
      border-radius: var(--p-content-border-radius);
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
    }
    .banner button {
      margin-left: auto;
    }
    .initiative {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    @media (max-width: 960px) {
      :host(.docked) {
        padding-bottom: 14rem;
      }
      .actions-bar {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 20;
        max-height: 40vh;
        overflow-y: auto;
        padding: 0.75rem 1rem;
        background: var(--p-content-background);
        border-top: 1px solid var(--p-content-border-color);
        box-shadow: 0 -4px 12px rgb(0 0 0 / 0.25);
      }
    }
    .waiting {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class CombatPlayerViewComponent {
  private readonly combat = inject(CombatBusiness);
  private readonly messages = inject(MessageService);

  /** The player's own combatant and character. */
  readonly combatantId = input.required<string>();
  readonly characterId = input.required<string>();
  /** On a phone, keep the actions in a bar fixed at the bottom of the screen (off where the view shares the page). */
  readonly docked = input(true);

  protected readonly initiative = signal<number | null>(null);
  protected readonly state = this.combat.$state;
  /** The NPC combatant whose card is open: only what the world's rules let the players see. */
  protected readonly openNpcId = signal<string | null>(null);
  protected readonly openNpc = computed(() =>
    this.state()?.combatants.find(
      (c) => c.id === this.openNpcId() && !c.characterId,
    ),
  );

  protected readonly me = computed(() =>
    this.state()?.combatants.find((c) => c.id === this.combatantId()),
  );
  protected readonly character = computed(() =>
    this.combat.$characters().find((c) => c.id === this.characterId()),
  );
  protected readonly myTurn = computed(
    () => this.state()?.activeId === this.combatantId(),
  );
  protected readonly activeName = computed(() => {
    const state = this.state();
    return state?.combatants.find((c) => c.id === state.activeId)?.name ?? '';
  });
  /** One of the player's results is still with the GM. */
  protected readonly waiting = computed(() =>
    (this.state()?.pending ?? []).some(
      (p) => p.casterId === this.combatantId(),
    ),
  );
  /** The last skill rolled at the table, for everyone. */
  protected readonly roll = computed(() => {
    const state = this.state();
    const last = state?.log.filter((entry) => entry.kind === 'skill').at(-1);
    if (!state || last?.kind !== 'skill') return null;
    return {
      caster: state.combatants.find((c) => c.id === last.casterId)?.name ?? '',
      skill:
        last.skillName ??
        this.combat.$skills().find((s) => s.id === last.skillId)?.name ??
        '',
      rolls: last.rolls,
      total: last.total,
    };
  });

  constructor() {
    // The player's own skills come from the host; ask again when the sheet's skills change.
    effect(() => {
      this.character()?.skills.length;
      untracked(() => void this.combat.loadSkills().catch(() => undefined));
    });
  }

  protected toggleNpc(id: string): void {
    this.openNpcId.update((open) => (open === id ? null : id));
  }

  protected endTurn(): void {
    void this.run(() => this.combat.endTurn());
  }

  protected setInitiative(): void {
    const value = this.initiative();
    if (value !== null)
      void this.run(() => this.combat.initiative(this.combatantId(), value));
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
