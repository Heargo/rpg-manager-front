import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { MessageLevel } from '../../../../core/models/toast-level';
import { CombatBusiness } from '../../../combat/business/combat.business';
import { CombatRollsBusiness } from '../../../combat/business/combat-rolls.business';
import { CombatRollBannerComponent } from '../../../combat/components/combat-roll-banner/combat-roll-banner.component';
import { DiceOverlayComponent } from '../../../dice/components/dice-overlay/dice-overlay.component';
import { CombatSelectionBusiness } from '../../../combat/business/combat-selection.business';
import { CombatTargetingBusiness } from '../../../combat/business/combat-targeting.business';
import { CombatRollDecisionComponent } from '../../../combat/components/combat-roll-decision/combat-roll-decision.component';
import { CombatGridComponent } from '../../../combat/components/combat-grid/combat-grid.component';
import { CombatOrderComponent } from '../../../combat/components/combat-order/combat-order.component';
import { CombatGmPanelComponent } from '../../../combat/components/combat-gm-panel/combat-gm-panel.component';
import { CombatPlayerViewComponent } from '../../../combat/components/combat-player-view/combat-player-view.component';
import { SandboxCombatBusiness } from '../../business/sandbox-combat.business';

/** Tool: try a combat on the sandbox world, the game master's panel and the player's view side by side, without a room. */
@Component({
  selector: 'app-combat-sandbox-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    CardModule,
    CombatGmPanelComponent,
    CombatRollBannerComponent,
    DiceOverlayComponent,
    CombatRollDecisionComponent,
    CombatOrderComponent,
    CombatGridComponent,
    CombatPlayerViewComponent,
  ],
  providers: [
    { provide: CombatBusiness, useClass: SandboxCombatBusiness },
    CombatSelectionBusiness,
    // Its own instance, following the sandbox encounter instead of the room's.
    CombatRollsBusiness,
  ],
  template: `
    <div class="main-container combat-tool">
      <header>
        <h1>{{ 'tools.combat.title' | transloco }}</h1>
        <p class="hint">{{ 'tools.combat.intro' | transloco }}</p>
        @if (!combat.$state()) {
          <button
            pButton
            type="button"
            data-action="sandbox-start"
            icon="pi pi-play"
            [label]="'tools.combat.start' | transloco"
            [disabled]="!pair()"
            (click)="start()"
          ></button>
        }
      </header>
      <app-combat-roll-banner />
      <app-combat-grid
        data-testid="sandbox-grid"
        [skillId]="targeting.$skillId()"
        (targetPicked)="targeting.toggle($event)"
      />
      <div class="views">
        <p-card [header]="'tools.combat.gm' | transloco">
          <div data-testid="sandbox-gm">
            <app-combat-order [showRound]="false" />
            <app-combat-gm-panel />
          </div>
        </p-card>
        <p-card [header]="'tools.combat.player' | transloco">
          <div data-testid="sandbox-player">
            @if (mine(); as own) {
              <app-combat-player-view
                [combatantId]="own.combatantId"
                [characterId]="own.characterId"
                [docked]="false"
              />
            } @else {
              <p class="hint">{{ 'tools.combat.noEncounter' | transloco }}</p>
            }
          </div>
        </p-card>
      </div>
    </div>
    <app-dice-overlay
      ><app-combat-roll-decision diceActions
    /></app-dice-overlay>
  `,
  styles: `
    .combat-tool {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
    }
    h1 {
      margin: 0;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
    .views {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
      gap: 1rem;
      align-items: start;
    }
  `,
})
export class CombatSandboxToolPageComponent {
  protected readonly combat = inject(CombatBusiness);
  protected readonly targeting = inject(CombatTargetingBusiness);
  private readonly destroyRef = inject(DestroyRef);

  /** An aimed skill never outlives the encounter nor the page. */
  private readonly clearTargeting = (() => {
    this.destroyRef.onDestroy(() => this.targeting.clear());
    effect(() => {
      if (!this.combat.$state()) this.targeting.clear();
    });
  })();
  private readonly messages = inject(MessageService);

  /** The sample character and the first enemy of the sandbox catalogue. */
  protected readonly pair = computed(() => {
    const hero = this.combat.$characters()[0];
    const enemy = this.combat
      .$npcs()
      .find((npc) => npc.roles.includes('enemy'));
    return hero && enemy ? { hero, enemy } : null;
  });

  /** The hero's own combatant once the encounter runs. */
  protected readonly mine = computed(() => {
    const hero = this.combat.$characters()[0];
    const combatant = this.combat
      .$encounter()
      ?.combatants.find((c) => c.characterId === hero?.id);
    return hero && combatant
      ? { characterId: hero.id, combatantId: combatant.id }
      : null;
  });

  protected async start(): Promise<void> {
    const pair = this.pair();
    if (!pair) return;
    try {
      await this.combat.start({
        characterIds: [pair.hero.id],
        npcs: [{ npcId: pair.enemy.id, count: 1, side: 'enemy' }],
      });
    } catch (error) {
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.combat.describeError(error),
        life: 4000,
      });
    }
  }
}
