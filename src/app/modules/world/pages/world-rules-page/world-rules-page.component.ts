import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { LanguageBusiness } from '../../../../core/business/language.business';
import {
  AttributeFormula,
  defaultStep,
  FormulaPreset,
  formulaExpression,
} from '../../../../core/helpers/formula';
import { MessageLevel } from '../../../../core/models/toast-level';
import { RuleFieldsComponent } from '../../components/rule-fields/rule-fields.component';
import { WorldSessionBusiness } from '../../business/world-session.business';
import {
  attributeCapError,
  attributeFormulaErrors,
  ATTRIBUTE_NAME_MAX_LENGTH,
} from '../../helpers/world-draft.rules';
import { validateWorldRules } from '../../helpers/world-rules.rules';
import { World, WorldDraft, WorldRules } from '../../models/world';

interface AttributeRow {
  key: number;
  id?: string;
  name: string;
  baseValue: number;
  formula: AttributeFormula;
  cap?: number;
}

const PRESETS: readonly (FormulaPreset | 'custom')[] = [
  'linear',
  'steep-linear',
  'diminishing',
  'percent',
  'custom',
];

/** Rules page: edit the open world's rules and attributes (the host's lobby, and the Tools sandbox). */
@Component({
  selector: 'app-world-rules-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    RuleFieldsComponent,
  ],
  templateUrl: './world-rules-page.component.html',
  styleUrl: './world-rules-page.component.scss',
})
export class WorldRulesPageComponent {
  private readonly session = inject(WorldSessionBusiness);
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);

  protected readonly world = this.session.$world;
  protected readonly attributeMax = ATTRIBUTE_NAME_MAX_LENGTH;
  protected readonly presets = [...PRESETS];
  protected readonly saving = signal(false);
  private nextKey = 1;

  /** The rule fields being edited; start over from the world each time it changes (after a save). */
  protected readonly fields = linkedSignal<World | null, WorldDraft>({
    source: () => this.world(),
    computation: (world) => ({
      name: world?.name ?? '',
      attributes: [],
      startingStatPoints: world?.startingStatPoints,
      startingMoney: world?.startingMoney,
      levelCurve: world?.levelCurve,
      maxLevel: world?.maxLevel,
      statPointsPerLevel: world?.statPointsPerLevel,
      startingSkillPoints: world?.startingSkillPoints,
      skillPointsPerLevel: world?.skillPointsPerLevel,
      offlineFeatures: world?.offlineFeatures,
      npcVisibility: world?.npcVisibility,
    }),
  });
  protected readonly attributes = linkedSignal<World | null, AttributeRow[]>({
    source: () => this.world(),
    computation: (world) =>
      (world?.attributes ?? []).map((attribute) => ({
        key: this.nextKey++,
        id: attribute.id,
        name: attribute.name,
        baseValue: attribute.baseValue,
        formula: attribute.formula,
        cap: attribute.cap,
      })),
  });

  private readonly rules = computed<WorldRules>(() => {
    const fields = this.fields();
    const world = this.world();
    return {
      attributes: this.attributes().map(
        ({ id, name, baseValue, formula, cap }) => ({
          ...(id === undefined ? {} : { id }),
          name,
          baseValue,
          formula,
          cap,
        }),
      ),
      startingStatPoints: fields.startingStatPoints ?? 0,
      startingMoney: fields.startingMoney ?? 0,
      levelCurve: fields.levelCurve ?? world!.levelCurve,
      maxLevel: fields.maxLevel ?? world!.maxLevel,
      statPointsPerLevel: fields.statPointsPerLevel ?? 0,
      startingSkillPoints: fields.startingSkillPoints ?? 0,
      skillPointsPerLevel: fields.skillPointsPerLevel ?? 0,
      offlineFeatures: { ...world!.offlineFeatures, ...fields.offlineFeatures },
      npcVisibility: fields.npcVisibility ?? world!.npcVisibility,
    };
  });
  protected readonly errors = computed(() =>
    this.world() ? validateWorldRules(this.rules()) : {},
  );
  protected readonly capErrors = computed(() =>
    this.rules().attributes.map(attributeCapError),
  );
  protected readonly formulaErrors = computed(() =>
    attributeFormulaErrors({
      name: 'rules',
      attributes: this.rules().attributes,
    }),
  );
  protected readonly tab = signal<'attributes' | 'rules' | 'offline'>(
    'attributes',
  );
  /** The tab that holds each validation error: attributes, or the other rule fields. */
  protected readonly invalidTabs = computed(() => {
    const keys = Object.keys(this.errors());
    return {
      attributes:
        keys.includes('attributes') ||
        this.capErrors().some(Boolean) ||
        this.formulaErrors().some(Boolean),
      rules: keys.some((key) => key !== 'attributes'),
      offline: false,
    };
  });
  protected readonly canSave = computed(
    () => Object.keys(this.errors()).length === 0,
  );

  protected addAttribute(): void {
    this.attributes.update((rows) => [
      ...rows,
      {
        key: this.nextKey++,
        name: '',
        baseValue: 0,
        formula: { preset: 'linear', step: 1 },
      },
    ]);
  }

  protected askRemove(row: AttributeRow): void {
    this.confirmation.confirm({
      header: this.language.t('world.rules.removeTitle'),
      message: this.language.t('world.rules.removeMessage', { name: row.name }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('world.rules.remove'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () =>
        this.attributes.update((rows) =>
          rows.filter((entry) => entry.key !== row.key),
        ),
    });
  }

  protected update(key: number, change: Partial<AttributeRow>): void {
    this.attributes.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  }

  protected setCap(key: number, value: number | null): void {
    this.update(key, { cap: value ?? undefined });
  }

  protected setPreset(key: number, preset: string): void {
    const row = this.attributes().find((entry) => entry.key === key);
    if (!row || !PRESETS.includes(preset as FormulaPreset | 'custom')) return;
    const formula: AttributeFormula =
      preset === 'custom'
        ? {
            preset: 'custom',
            expression:
              row.formula.preset === 'custom'
                ? row.formula.expression
                : formulaExpression(row.formula).replace(
                    /\bstep\b/g,
                    String(row.formula.step),
                  ),
          }
        : {
            preset: preset as FormulaPreset,
            step: defaultStep(preset as FormulaPreset),
          };
    this.update(key, { formula });
  }

  protected setStep(key: number, value: number | null): void {
    const row = this.attributes().find((entry) => entry.key === key);
    if (!row || row.formula.preset === 'custom') return;
    const step = value ?? 0;
    this.update(key, {
      formula: {
        preset: row.formula.preset,
        step: Number.isFinite(step) ? step : 0,
      },
    });
  }

  protected setExpression(key: number, expression: string): void {
    this.update(key, { formula: { preset: 'custom', expression } });
  }

  protected stepOf(formula: AttributeFormula): number | null {
    return formula.preset === 'custom' ? null : formula.step;
  }

  protected expressionText(formula: AttributeFormula): string {
    return formula.preset === 'custom' ? formula.expression : '';
  }

  protected formulaErrorKey(error: { key: string; level?: number }): string {
    return error.level !== undefined &&
      (error.key === 'formula.errors.divisionByZero' ||
        error.key === 'formula.errors.notFinite')
      ? `${error.key}AtLevel`
      : error.key;
  }

  protected openTab(value: string | number | undefined): void {
    if (value === 'attributes' || value === 'rules' || value === 'offline')
      this.tab.set(value);
  }

  protected applyFields(draft: WorldDraft): void {
    this.fields.set(draft);
  }

  protected async save(): Promise<void> {
    if (!this.world() || !this.canSave() || this.saving()) return;
    this.saving.set(true);
    try {
      await this.session.saveRules(this.rules());
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('world.rules.saved'),
        life: 2500,
      });
    } catch (error) {
      console.error('Saving the world rules failed', error);
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('room.errors.generic'),
        life: 4000,
      });
    } finally {
      this.saving.set(false);
    }
  }
}
