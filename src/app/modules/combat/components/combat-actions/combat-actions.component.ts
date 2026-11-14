import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { StoredImageComponent } from '../../../../core/components/stored-image/stored-image.component';
import { MessageLevel } from '../../../../core/models/toast-level';
import { Skill } from '../../../skill/models/skill';
import { CombatBusiness } from '../../business/combat.business';
import { CombatTargetingBusiness } from '../../business/combat-targeting.business';
import {
  defaultTargets,
  targetGroups,
  targetsArePicked,
} from '../../helpers/combat-targeting.rules';
import { ActionCounter, actionTabs } from '../../helpers/combat-actions.rules';
import { CombatAttribute } from '../../models/combat';

/** What one combatant can do on its turn: tick the action counters, use a skill (pick its targets) or an item. */
@Component({
  selector: 'app-combat-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    FormsModule,
    ButtonModule,
    TabsModule,
    MultiSelectModule,
    ProgressBarModule,
    StoredImageComponent,
    NgTemplateOutlet,
  ],
  template: `
    @if (tabs().length) {
      <p-tabs [value]="selected()" (valueChange)="select($event)">
        <p-tablist>
          @for (tab of tabs(); track tab.name) {
            <p-tab [value]="tab.name"
              >{{ tab.name }} ({{ tab.left }}/{{ tab.count }})</p-tab
            >
          }
        </p-tablist>
        <p-tabpanels>
          @if (currentTab(); as tab) {
            <p-tabpanel [value]="tab.name">
              <ng-container
                *ngTemplateOutlet="
                  lists;
                  context: {
                    skills: tab.skills,
                    items: tab === tabs()[0],
                    off: tab.left === 0,
                  }
                "
              />
              <div class="buttons">
                @if (isGameMaster()) {
                  <button
                    pButton
                    type="button"
                    data-action="untick"
                    size="small"
                    severity="secondary"
                    icon="pi pi-minus"
                    [attr.aria-label]="'combat.actions.giveBack' | transloco"
                    [disabled]="tab.used === 0"
                    (click)="untick(tab)"
                  ></button>
                }
                <button
                  pButton
                  type="button"
                  data-action="tick"
                  size="small"
                  severity="secondary"
                  icon="pi pi-check"
                  [label]="'combat.actions.use' | transloco"
                  [disabled]="tab.left === 0"
                  (click)="tick(tab)"
                ></button>
              </div>
            </p-tabpanel>
          }
        </p-tabpanels>
      </p-tabs>
    } @else {
      <ng-container
        *ngTemplateOutlet="
          lists;
          context: { skills: skillEntries(), items: true, off: false }
        "
      />
    }

    <ng-template #lists let-skills="skills" let-showItems="items" let-off="off">
      @if (skills.length) {
        <h4>{{ 'combat.actions.skills' | transloco }}</h4>
        <ul class="skills">
          @for (entry of skills; track entry.skill.id) {
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
                [disabled]="off"
                [severity]="entry.available ? 'primary' : 'secondary'"
                (click)="pick(entry.skill)"
              ></button>
            </li>
          }
        </ul>
      }

      @if (showItems && items().length) {
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
                [disabled]="off"
                (click)="useItem(entry.id)"
              ></button>
            </li>
          }
        </ul>
      }
    </ng-template>

    @if (casting(); as cast) {
      <div class="targeting">
        <h4>
          {{
            'combat.actions.pickTargets' | transloco: { skill: cast.skill.name }
          }}
        </h4>
        <p-multiselect
          class="targets"
          data-testid="targets"
          [options]="groups()"
          optionLabel="name"
          optionValue="id"
          optionDisabled="disabled"
          [group]="true"
          optionGroupLabel="id"
          optionGroupChildren="options"
          display="chip"
          [filter]="true"
          [showToggleAll]="false"
          [disabled]="!picking(cast.skill)"
          [ngModel]="cast.targets"
          (ngModelChange)="targeting.set($event ?? [])"
          [placeholder]="'combat.targets.placeholder' | transloco"
        >
          <ng-template #group let-group>
            {{ 'combat.targets.' + group.id | transloco }}
          </ng-template>
          <ng-template #item let-option>
            <div
              class="target"
              data-testid="target"
              [attr.data-name]="option.name"
            >
              @if (option.portraitId; as portraitId) {
                <app-stored-image
                  class="portrait"
                  [imageId]="portraitId"
                  [alt]="option.name"
                >
                  <span class="initial">{{ initial(option.name) }}</span>
                </app-stored-image>
              } @else {
                <span class="initial portrait">{{ initial(option.name) }}</span>
              }
              <span>{{ option.name }}</span>
              @if (option.lifePercent !== undefined) {
                <p-progressbar
                  class="life"
                  [value]="option.lifePercent"
                  [showValue]="false"
                />
              }
            </div>
          </ng-template>
        </p-multiselect>
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
            (click)="targeting.clear()"
          ></button>
        </div>
      </div>
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
    .targets {
      width: 100%;
    }
    .target {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .portrait {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      object-fit: cover;
      overflow: hidden;
      flex: none;
    }
    .initial {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--p-content-border-color);
    }
    .life {
      width: 3rem;
      height: 0.4rem;
    }
    small {
      color: var(--p-text-muted-color);
    }
  `,
})
export class CombatActionsComponent {
  private readonly combat = inject(CombatBusiness);
  private readonly messages = inject(MessageService);
  protected readonly targeting = inject(CombatTargetingBusiness);

  readonly combatantId = input.required<string>();
  /** The character whose bag the items come from (none for an NPC). */
  readonly characterId = input<string>();
  readonly sheetSkills = input<{ skillId: string; level: number }[]>([]);
  readonly level = input(1);
  readonly attributes = input<CombatAttribute[]>([]);
  readonly actions = input<ActionCounter[]>([]);

  /** The skill this combatant is aiming, if any. */
  protected readonly casting = computed(() => {
    const cast = this.targeting.$casting();
    return cast?.casterId === this.combatantId() ? cast : null;
  });
  protected readonly busy = signal(false);
  protected readonly combatants = computed(
    () => this.combat.$state()?.combatants ?? [],
  );

  protected readonly groups = computed(() => {
    const cast = this.casting();
    const state = this.combat.$state();
    if (!cast || !state) return [];
    return targetGroups(
      cast.skill,
      cast.casterId,
      state.combatants.map((c) => ({
        id: c.id,
        name: c.name,
        side: c.side,
        ...(c.portraitId !== undefined && { portraitId: c.portraitId }),
        ...(c.lifeBar && { lifePercent: c.lifeBar.percent }),
        ...(c.position && { position: c.position }),
      })),
      state.grid && { ...state.grid, enabled: true },
    );
  });

  protected initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  protected readonly skillEntries = computed(() =>
    this.sheetSkills().flatMap(({ skillId, level }) => {
      const skill = this.combat.$skills().find((s) => s.id === skillId);
      if (skill?.type !== 'active') return [];
      const availability = this.combat.availability(this.combatantId(), skill);
      return [
        {
          skill,
          actionType: skill.actionType,
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

  /** The counters as the combat state has them now, else the input. */
  private readonly liveActions = computed(
    () =>
      this.combatants().find((c) => c.id === this.combatantId())?.actions ??
      this.actions(),
  );
  protected readonly isGameMaster = this.combat.$isGameMaster;
  protected readonly tabs = computed(() =>
    actionTabs(this.liveActions(), this.skillEntries()),
  );
  private readonly chosen = signal<string | undefined>(undefined);
  protected readonly currentTab = computed(() => {
    const tabs = this.tabs();
    return tabs.find((t) => t.name === this.chosen()) ?? tabs[0];
  });
  protected readonly selected = computed(() => this.currentTab()?.name);

  protected select(value: string | number | undefined): void {
    this.chosen.set(value === undefined ? undefined : String(value));
  }

  protected tick(action: { name: string; used: number }): void {
    void this.run(() =>
      this.combat.tickAction(this.combatantId(), action.name, action.used + 1),
    );
  }

  protected untick(action: { name: string; used: number }): void {
    void this.run(() =>
      this.combat.tickAction(this.combatantId(), action.name, action.used - 1),
    );
  }

  protected pick(skill: Skill): void {
    this.targeting.start(
      this.combatantId(),
      skill,
      defaultTargets(skill, this.combatantId(), this.combatants()),
    );
  }

  protected picking(skill: Skill): boolean {
    return targetsArePicked(skill);
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
    this.targeting.clear();
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
