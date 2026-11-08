import { DEFAULT_NPC_VISIBILITY } from '../../../npc/helpers/npc-visibility.rules';
import { NpcVisibilityRules } from '../../../npc/models/npc';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import {
  FileUploadHandlerEvent,
  FileUploadModule,
} from '@openng/optimus-ui/fileupload';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { StepperModule } from '@openng/optimus-ui/stepper';
import { TagModule } from '@openng/optimus-ui/tag';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { FormulaChartComponent } from '../../../../core/components/formula-chart/formula-chart.component';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { LanguageBusiness } from '../../../../core/business/language.business';
import {
  AttributeFormula,
  defaultStep,
  previewMax,
  formulaExpression,
  FormulaPreset,
} from '../../../../core/helpers/formula';
import { MessageLevel } from '../../../../core/models/toast-level';
import { WorldLibraryBusiness } from '../../business/world-library.business';
import { WorldCardComponent } from '../../components/world-card/world-card.component';
import {
  DEFAULT_LEVEL_CURVE,
  DEFAULT_MAX_LEVEL,
  DEFAULT_STAT_POINTS_PER_LEVEL,
  LevelCurve,
} from '../../../character/helpers/level.rules';
import { DEFAULT_OFFLINE_FEATURES } from '../../helpers/world.factory';
import {
  ATTRIBUTE_NAME_MAX_LENGTH,
  attributeCapError,
  attributeFormulaErrors,
  WORLD_NAME_MAX_LENGTH,
} from '../../helpers/world-draft.rules';
import { RuleFieldsComponent } from '../../components/rule-fields/rule-fields.component';
import { OfflineFeatures, WorldDraft } from '../../models/world';

interface AttributeRow {
  key: number;
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

/** New game wizard: identity → attributes → rules, with a live preview. */
import { DEFAULT_ATTRIBUTES } from '../../helpers/default-world';
@Component({
  selector: 'app-world-new-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CheckboxModule,
    FileUploadModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    StepperModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    FormulaChartComponent,
    WorldCardComponent,
    RuleFieldsComponent,
  ],
  templateUrl: './world-new-page.component.html',
  styleUrl: './world-new-page.component.scss',
})
export class WorldNewPageComponent {
  private readonly library = inject(WorldLibraryBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly nameMax = WORLD_NAME_MAX_LENGTH;
  protected readonly attributeMax = ATTRIBUTE_NAME_MAX_LENGTH;
  protected readonly presets = [...PRESETS];

  protected readonly step = signal(1);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly imageId = signal<string | undefined>(undefined);
  protected readonly uploading = signal(false);
  protected readonly attributes = signal<AttributeRow[]>(
    this.defaultAttributes(),
  );
  /** Row keys (not names, so renaming a row keeps its bar). */
  protected readonly lifeBar = signal<number | null>(
    this.attributes()[0]?.key ?? null,
  );
  protected readonly manaBar = signal<number | null>(
    this.attributes()[1]?.key ?? null,
  );
  protected readonly startingStatPoints = signal(5);
  protected readonly startingMoney = signal(5000);
  protected readonly levelCurve = signal<LevelCurve>(DEFAULT_LEVEL_CURVE);
  protected readonly maxLevel = signal(DEFAULT_MAX_LEVEL);
  protected readonly statPointsPerLevel = signal(DEFAULT_STAT_POINTS_PER_LEVEL);
  protected readonly starterItems = signal(true);
  protected readonly npcVisibility = signal<NpcVisibilityRules>(
    DEFAULT_NPC_VISIBILITY,
  );
  protected readonly offline = signal<OfflineFeatures>({
    ...DEFAULT_OFFLINE_FEATURES,
  });
  protected readonly creating = signal(false);
  private nextKey = 100;

  protected readonly attributeNames = computed(() =>
    this.attributes()
      .map((attribute) => attribute.name.trim())
      .filter(Boolean),
  );
  protected readonly draft = computed<WorldDraft>(() => ({
    name: this.name(),
    description: this.description(),
    imageId: this.imageId(),
    attributes: this.attributes().map(({ name, baseValue, formula, cap }) => ({
      name,
      baseValue,
      formula,
      cap,
    })),
    barAttributes: {
      life: this.barName(this.lifeBar()),
      mana: this.barName(this.manaBar()),
    },
    startingStatPoints: this.startingStatPoints(),
    levelCurve: this.levelCurve(),
    maxLevel: this.maxLevel(),
    statPointsPerLevel: this.statPointsPerLevel(),
    startingMoney: this.startingMoney(),
    offlineFeatures: this.offline(),
    npcVisibility: this.npcVisibility(),
  }));
  /** Per row, the problem of its cap (null when none or valid). */
  protected readonly capErrors = computed(() =>
    this.draft().attributes.map(attributeCapError),
  );
  protected readonly formulaErrors = computed(() =>
    attributeFormulaErrors(this.draft()),
  );
  /** Per row, the rounded max at levels 0 to 5 (empty while the formula is invalid); memoised. */
  protected readonly previews = computed(() => {
    const rows = this.attributes();
    const names = rows.map((row) => row.name.trim());
    return rows.map((row) => {
      const levels = previewMax(row.formula, row.baseValue, names, 5, row.cap);
      return {
        levels: levels.join(' '),
        chart: previewMax(row.formula, row.baseValue, names, 10, row.cap),
        cap: row.cap,
        first: levels[0],
        last: levels[levels.length - 1],
      };
    });
  });
  /** Which preview shows its chart: an attribute row index, 'curve' or none. */
  protected readonly chartOpen = signal<number | 'curve' | null>(null);
  protected setChart(target: number | 'curve' | null): void {
    this.chartOpen.set(target);
  }
  /** Mouse hover opens the chart; touch and pen go through the tap. */
  protected hoverChart(event: Event, target: number | 'curve' | null): void {
    if ((event as PointerEvent).pointerType === 'mouse') this.setChart(target);
  }
  /** Keyboard focus opens the chart (a pointer press is handled by hover or tap). */
  protected focusChart(event: Event, target: number | 'curve'): void {
    let keyboard = false;
    try {
      keyboard = (event.target as Element).matches(':focus-visible');
    } catch {
      keyboard = false;
    }
    if (keyboard) this.setChart(target);
  }
  /** A tap (or Enter) toggles the chart; a mouse click leaves the hover state alone. */
  protected tapChart(event: Event, target: number | 'curve'): void {
    if ((event as PointerEvent).pointerType === 'mouse') return;
    this.chartOpen.update((open) => (open === target ? null : target));
  }
  protected readonly errors = computed(() =>
    this.library.validateDraft(this.draft()),
  );
  protected readonly stepValid = computed(() => {
    const errors = this.errors();
    return {
      1: !errors.name,
      2: !errors.attributes,
      3:
        !errors.startingStatPoints &&
        !errors.startingMoney &&
        !errors.levelCurve &&
        !errors.maxLevel &&
        !errors.statPointsPerLevel,
    } as Record<number, boolean>;
  });
  protected readonly canCreate = computed(
    () => Object.keys(this.errors()).length === 0,
  );

  protected async upload(event: FileUploadHandlerEvent): Promise<void> {
    const file = event.files[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      this.imageId.set(await this.library.uploadImage(file));
    } catch (error) {
      console.error('Image upload failed', error);
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('world.errors.image'),
        life: 4000,
      });
    } finally {
      this.uploading.set(false);
    }
  }

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

  protected setCap(key: number, value: number | null): void {
    this.updateAttribute(key, {
      cap: value ?? undefined,
    });
  }

  protected removeAttribute(key: number): void {
    if (this.lifeBar() === key) this.lifeBar.set(null);
    if (this.manaBar() === key) this.manaBar.set(null);
    this.attributes.update((rows) => rows.filter((row) => row.key !== key));
  }

  protected updateAttribute(key: number, change: Partial<AttributeRow>): void {
    this.attributes.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
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
    this.updateAttribute(key, { formula });
  }

  protected setBar(bar: 'life' | 'mana', key: number): void {
    const target = bar === 'life' ? this.lifeBar : this.manaBar;
    const other = bar === 'life' ? this.manaBar : this.lifeBar;
    if (target() === key) {
      target.set(null);
      return;
    }
    target.set(key);
    if (other() === key) other.set(null);
  }

  protected setStep(key: number, value: number | null): void {
    const step = value ?? 0;
    const row = this.attributes().find((entry) => entry.key === key);
    if (!row || row.formula.preset === 'custom') return;
    this.updateAttribute(key, {
      formula: {
        preset: row.formula.preset,
        step: Number.isFinite(step) ? step : 0,
      },
    });
  }

  protected setExpression(key: number, expression: string): void {
    this.updateAttribute(key, { formula: { preset: 'custom', expression } });
  }

  protected formulaErrorKey(error: { key: string; level?: number }): string {
    return error.level !== undefined &&
      (error.key === 'formula.errors.divisionByZero' ||
        error.key === 'formula.errors.notFinite')
      ? `${error.key}AtLevel`
      : error.key;
  }

  protected expressionOf(formula: AttributeFormula): string {
    return formulaExpression(formula);
  }

  protected stepOf(formula: AttributeFormula): number | null {
    return formula.preset === 'custom' ? null : formula.step;
  }

  protected expressionText(formula: AttributeFormula): string {
    return formula.preset === 'custom' ? formula.expression : '';
  }

  /** The shared rule fields hand back the whole draft; keep the rule parts. */
  protected applyRules(draft: WorldDraft): void {
    this.startingStatPoints.set(draft.startingStatPoints ?? 0);
    this.startingMoney.set(draft.startingMoney ?? 0);
    this.levelCurve.set(draft.levelCurve ?? DEFAULT_LEVEL_CURVE);
    this.maxLevel.set(draft.maxLevel ?? DEFAULT_MAX_LEVEL);
    this.statPointsPerLevel.set(
      draft.statPointsPerLevel ?? DEFAULT_STAT_POINTS_PER_LEVEL,
    );
    this.offline.set({ ...DEFAULT_OFFLINE_FEATURES, ...draft.offlineFeatures });
    this.npcVisibility.set(draft.npcVisibility ?? DEFAULT_NPC_VISIBILITY);
  }

  protected async create(): Promise<void> {
    if (!this.canCreate()) return;
    this.creating.set(true);
    try {
      await this.library.create(this.draft(), {
        starterItems: this.starterItems(),
      });
      this.messages.add({
        severity: MessageLevel.Success,
        summary: this.language.t('world.created', { name: this.name().trim() }),
        life: 2500,
      });
      await this.router.navigate(['/play']);
    } catch (error) {
      console.error('World creation failed', error);
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('room.errors.generic'),
        life: 4000,
      });
    } finally {
      this.creating.set(false);
    }
  }

  private barName(key: number | null): string | undefined {
    const name = this.attributes()
      .find((row) => row.key === key)
      ?.name.trim();
    return name || undefined;
  }

  private defaultAttributes(): AttributeRow[] {
    return DEFAULT_ATTRIBUTES.map(({ nameKey, baseValue, formula }, index) => ({
      key: index + 1,
      name: this.language.t(nameKey),
      baseValue,
      formula: { ...formula },
    }));
  }
}
