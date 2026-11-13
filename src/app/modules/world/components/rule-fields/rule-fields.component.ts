import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { CoinInputComponent } from '../../../../core/components/coin-input/coin-input.component';
import { FormulaChartComponent } from '../../../../core/components/formula-chart/formula-chart.component';
import {
  checkLevelCurve,
  DEFAULT_LEVEL_CURVE,
  DEFAULT_MAX_LEVEL,
  DEFAULT_STAT_POINTS_PER_LEVEL,
  LEVEL_CURVE_PRESETS,
  levelCost,
  MAX_LEVEL,
  MIN_MAX_LEVEL,
} from '../../../character/helpers/level.rules';
import { WorldDraftErrors } from '../../helpers/world-draft.rules';
import { DEFAULT_OFFLINE_FEATURES } from '../../helpers/world.factory';
import {
  DEFAULT_NPC_VISIBILITY,
  NPC_VISIBILITY_FIELDS,
} from '../../../npc/helpers/npc-visibility.rules';
import { NPC_ROLES, NpcRole, NpcVisibility } from '../../../npc/models/npc';
import { createPointerKind } from '../../../../core/helpers/pointer-kind';
import {
  CombatRules,
  INITIATIVE_MODES,
  OfflineFeatures,
  WorldDraft,
} from '../../models/world';
import {
  defaultCombatRules,
  isCombatFormulaValid,
} from '../../helpers/world-combat.rules';

const OFFLINE_FEATURES = Object.keys(
  DEFAULT_OFFLINE_FEATURES,
) as (keyof OfflineFeatures)[];

/** The world rules fields shared by the new-world wizard and the rules page: Progression, Economy and Offline. */
@Component({
  selector: 'app-rule-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ToggleSwitchModule,
    CheckboxModule,
    CoinInputComponent,
    FormulaChartComponent,
  ],
  templateUrl: './rule-fields.component.html',
  styleUrl: './rule-fields.component.scss',
})
export class RuleFieldsComponent {
  protected readonly language = inject(LanguageBusiness);
  readonly draft = model.required<WorldDraft>();
  readonly errors = input<WorldDraftErrors>({});
  /** Which sections to show: all, the rules (progression, economy, NPCs) or only the offline features. */
  readonly sections = input<'all' | 'rules' | 'offline'>('all');

  /** The combat section is a closed `<details>` (the wizard). */
  readonly collapsed = input(false);
  /** Attribute names the combat formulas may read when the draft carries none (the rules page edits them apart). */
  readonly attributeNames = input<string[] | null>(null);

  protected readonly initiativeModes = [...INITIATIVE_MODES];
  protected readonly offlineFeatures = OFFLINE_FEATURES;
  protected readonly npcRoles = NPC_ROLES;
  protected readonly npcFields = NPC_VISIBILITY_FIELDS;
  protected readonly curvePresets = [...LEVEL_CURVE_PRESETS];
  protected readonly maxLevelBounds = { min: MIN_MAX_LEVEL, max: MAX_LEVEL };

  protected readonly startingStatPoints = computed(
    () => this.draft().startingStatPoints ?? 0,
  );
  protected readonly startingMoney = computed(
    () => this.draft().startingMoney ?? 0,
  );
  protected readonly levelCurve = computed(
    () => this.draft().levelCurve ?? DEFAULT_LEVEL_CURVE,
  );
  protected readonly maxLevel = computed(
    () => this.draft().maxLevel ?? DEFAULT_MAX_LEVEL,
  );
  protected readonly statPointsPerLevel = computed(
    () => this.draft().statPointsPerLevel ?? DEFAULT_STAT_POINTS_PER_LEVEL,
  );
  protected readonly startingSkillPoints = computed(
    () => this.draft().startingSkillPoints ?? 1,
  );
  protected readonly skillPointsPerLevel = computed(
    () => this.draft().skillPointsPerLevel ?? 1,
  );
  protected readonly offline = computed<OfflineFeatures>(() => ({
    ...DEFAULT_OFFLINE_FEATURES,
    ...this.draft().offlineFeatures,
  }));

  protected readonly skillRollsEnabled = computed(
    () => this.draft().skillRollsEnabled ?? true,
  );

  protected readonly sellAnywhere = computed(
    () => this.draft().sellAnywhere ?? true,
  );
  protected readonly sellAnywhereRatio = computed(
    () => this.draft().sellAnywhereRatio ?? 1,
  );
  protected readonly merchantBuyRatio = computed(
    () => this.draft().merchantBuyRatio ?? 1,
  );
  protected readonly merchantSellRatio = computed(
    () => this.draft().merchantSellRatio ?? 0.5,
  );

  protected readonly npcVisibility = computed(
    () => this.draft().npcVisibility ?? DEFAULT_NPC_VISIBILITY,
  );

  protected readonly curveError = computed(() =>
    checkLevelCurve(this.levelCurve()),
  );
  /** XP cost of levels 2 to 6 (empty while a custom curve is invalid). */
  protected readonly curvePreview = computed(() =>
    this.curveError()
      ? ''
      : [2, 3, 4, 5, 6]
          .map((level) => levelCost(this.levelCurve(), level))
          .join(' '),
  );
  /** XP cost of levels 2 to 11 for the chart (empty while a custom curve is invalid). */
  protected readonly curveChart = computed(() =>
    this.curveError()
      ? []
      : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((level) =>
          levelCost(this.levelCurve(), level),
        ),
  );

  protected readonly chartOpen = signal(false);

  protected readonly combat = computed<CombatRules>(
    () =>
      this.draft().combat ??
      defaultCombatRules(this.draft().barAttributes?.life),
  );
  protected readonly names = computed(
    () =>
      this.attributeNames() ??
      this.draft().attributes.map((attribute) => attribute.name.trim()),
  );
  /** Live problems of the combat formulas, by field. */
  protected readonly combatErrors = computed(() => {
    const combat = this.combat();
    const names = this.names();
    const bad = (expression: string | undefined) =>
      !!expression && !isCombatFormulaValid(expression, names);
    return {
      initiative: bad(combat.initiative.formula),
      movement: bad(combat.movement) || !combat.movement,
      'basic-attack': bad(combat.basicAttack),
      defence: bad(combat.defence),
    };
  });

  protected patchCombat(change: Partial<CombatRules>): void {
    this.patch({ combat: { ...this.combat(), ...change } });
  }

  protected setDice(change: Partial<CombatRules['initiative']['dice']>): void {
    const { initiative } = this.combat();
    this.patchCombat({
      initiative: { ...initiative, dice: { ...initiative.dice, ...change } },
    });
  }

  protected setGrid(change: Partial<CombatRules['grid']>): void {
    this.patchCombat({ grid: { ...this.combat().grid, ...change } });
  }

  protected setAction(
    index: number,
    change: Partial<CombatRules['actionTypes'][number]>,
  ): void {
    this.patchCombat({
      actionTypes: this.combat().actionTypes.map((action, i) =>
        i === index ? { ...action, ...change } : action,
      ),
    });
  }

  protected addAction(): void {
    this.patchCombat({
      actionTypes: [...this.combat().actionTypes, { name: '', count: 1 }],
    });
  }

  protected removeAction(index: number): void {
    this.patchCombat({
      actionTypes: this.combat().actionTypes.filter((_, i) => i !== index),
    });
  }

  /** An optional formula: empty means none. */
  protected setOptionalFormula(
    field: 'basicAttack' | 'defence',
    text: string,
  ): void {
    this.patchCombat({ [field]: text.trim() ? text : undefined });
  }

  protected patch(change: Partial<WorldDraft>): void {
    this.draft.update((draft) => ({ ...draft, ...change }));
  }

  protected setCurvePreset(preset: string): void {
    const current = this.levelCurve();
    this.patch({
      levelCurve:
        preset === 'custom'
          ? {
              preset,
              expression:
                current.preset === 'custom'
                  ? current.expression
                  : 'level * 100',
            }
          : { preset: preset as 'flat' | 'growing' | 'steep' | 'classic' },
    });
  }

  protected setCurveExpression(expression: string): void {
    this.patch({ levelCurve: { preset: 'custom', expression } });
  }

  protected curveExpression(): string {
    const curve = this.levelCurve();
    return curve.preset === 'custom' ? curve.expression : '';
  }

  protected setOffline(feature: keyof OfflineFeatures, enabled: boolean): void {
    this.patch({ offlineFeatures: { ...this.offline(), [feature]: enabled } });
  }

  protected setNpcField(
    role: NpcRole,
    field: keyof NpcVisibility,
    enabled: boolean,
  ): void {
    const current = this.npcVisibility();
    this.patch({
      npcVisibility: {
        ...current,
        [role]: { ...current[role], [field]: enabled },
      },
    });
  }

  /** Mouse or finger: iOS calls a tap's click a mouse click, so this asks the press. */
  protected readonly pointer = createPointerKind();

  /** Mouse hover opens the chart; touch and pen go through the tap. */
  protected hoverChart(event: Event, open: boolean): void {
    if (this.pointer.isMouseHover(event)) this.chartOpen.set(open);
  }

  /** Keyboard focus opens the chart (a pointer press is handled by hover or tap). */
  protected focusChart(event: Event): void {
    let keyboard = false;
    try {
      keyboard = (event.target as Element).matches(':focus-visible');
    } catch {
      keyboard = false;
    }
    if (keyboard) this.chartOpen.set(true);
  }

  /** A tap (or Enter) toggles the chart; a mouse click leaves the hover state alone. */
  protected tapChart(event: Event): void {
    if (this.pointer.isMouseClick(event)) return;
    this.chartOpen.update((open) => !open);
  }
}
