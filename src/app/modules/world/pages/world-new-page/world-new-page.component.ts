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
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { CoinInputComponent } from '../../../../core/components/coin-input/coin-input.component';
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
  DEFAULT_STAT_POINTS_PER_LEVEL,
  LEVEL_CURVE_PRESETS,
  LevelCurve,
  levelCost,
  checkLevelCurve,
} from '../../../character/helpers/level.rules';
import { DEFAULT_OFFLINE_FEATURES } from '../../helpers/world.factory';
import {
  ATTRIBUTE_NAME_MAX_LENGTH,
  attributeFormulaErrors,
  WORLD_NAME_MAX_LENGTH,
} from '../../helpers/world-draft.rules';
import { OfflineFeatures, WorldDraft } from '../../models/world';

interface AttributeRow {
  key: number;
  name: string;
  baseValue: number;
  formula: AttributeFormula;
}

const PRESETS: readonly (FormulaPreset | 'custom')[] = [
  'linear',
  'steep-linear',
  'diminishing',
  'percent',
  'custom',
];

const OFFLINE_FEATURES = Object.keys(
  DEFAULT_OFFLINE_FEATURES,
) as (keyof OfflineFeatures)[];

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
    ToggleSwitchModule,
    CoinInputComponent,
    WorldCardComponent,
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
  protected readonly offlineFeatures = OFFLINE_FEATURES;
  protected readonly presets = PRESETS;

  protected readonly step = signal(1);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly imageId = signal<string | undefined>(undefined);
  protected readonly uploading = signal(false);
  protected readonly attributes = signal<AttributeRow[]>(
    this.defaultAttributes(),
  );
  protected readonly lifeBar = signal<string | null>(
    this.attributes()[0]?.name ?? null,
  );
  protected readonly manaBar = signal<string | null>(
    this.attributes()[1]?.name ?? null,
  );
  protected readonly startingStatPoints = signal(5);
  protected readonly startingMoney = signal(5000);
  protected readonly levelCurve = signal<LevelCurve>(DEFAULT_LEVEL_CURVE);
  protected readonly statPointsPerLevel = signal(DEFAULT_STAT_POINTS_PER_LEVEL);
  protected readonly curvePresets = LEVEL_CURVE_PRESETS;
  protected readonly starterItems = signal(true);
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
    attributes: this.attributes().map(({ name, baseValue, formula }) => ({
      name,
      baseValue,
      formula,
    })),
    barAttributes: {
      life: this.attributeNames().includes(this.lifeBar() ?? '')
        ? (this.lifeBar() ?? undefined)
        : undefined,
      mana: this.attributeNames().includes(this.manaBar() ?? '')
        ? (this.manaBar() ?? undefined)
        : undefined,
    },
    startingStatPoints: this.startingStatPoints(),
    levelCurve: this.levelCurve(),
    statPointsPerLevel: this.statPointsPerLevel(),
    startingMoney: this.startingMoney(),
    offlineFeatures: this.offline(),
  }));
  protected readonly formulaErrors = computed(() =>
    attributeFormulaErrors(this.draft()),
  );
  /** Per row, the rounded max at levels 0 to 5 (empty while the formula is invalid). */
  protected readonly previews = computed(() => {
    const rows = this.attributes();
    const names = rows.map((row) => row.name.trim());
    return rows.map((row) =>
      previewMax(row.formula, row.baseValue, names).join(' '),
    );
  });
  protected readonly curveError = computed(() =>
    checkLevelCurve(this.levelCurve()),
  );
  /** XP cost of levels 2 to 6 (empty while a custom curve is invalid). */
  protected readonly curvePreview = computed(() =>
    this.curveError()
      ? ''
      : [2, 3, 4, 5, 6].map((level) => levelCost(this.levelCurve(), level)).join(' '),
  );
  protected readonly errors = computed(() =>
    this.library.validateDraft(this.draft()),
  );
  protected readonly stepValid = computed(() => {
    const errors = this.errors();
    return {
      1: !errors.name,
      2: !errors.attributes,
      3: !errors.startingStatPoints && !errors.startingMoney && !errors.levelCurve && !errors.statPointsPerLevel,
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

  protected removeAttribute(key: number): void {
    this.attributes.update((rows) => rows.filter((row) => row.key !== key));
  }

  protected updateAttribute(key: number, change: Partial<AttributeRow>): void {
    this.attributes.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  }

  protected setCurvePreset(preset: string): void {
    const current = this.levelCurve();
    this.levelCurve.set(
      preset === 'custom'
        ? { preset, expression: current.preset === 'custom' ? current.expression : 'level * 100' }
        : { preset: preset as 'flat' | 'growing' | 'steep' | 'classic' },
    );
  }

  protected setCurveExpression(expression: string): void {
    this.levelCurve.set({ preset: 'custom', expression });
  }

  protected curveExpression(): string {
    const curve = this.levelCurve();
    return curve.preset === 'custom' ? curve.expression : '';
  }

  protected setPreset(key: number, preset: string): void {
    const row = this.attributes().find((entry) => entry.key === key);
    if (!row || !PRESETS.includes(preset as FormulaPreset | 'custom')) return;
    const formula: AttributeFormula =
      preset === 'custom'
        ? { preset: 'custom', expression: formulaExpression(row.formula) }
        : {
            preset: preset as FormulaPreset,
            step: defaultStep(preset as FormulaPreset),
          };
    this.updateAttribute(key, { formula });
  }

  protected setStep(key: number, text: string): void {
    const step = Number(text);
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

  protected setOffline(feature: keyof OfflineFeatures, enabled: boolean): void {
    this.offline.update((features) => ({ ...features, [feature]: enabled }));
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

  private defaultAttributes(): AttributeRow[] {
    return DEFAULT_ATTRIBUTES.map(({ nameKey, baseValue, formula }, index) => ({
      key: index + 1,
      name: this.language.t(nameKey),
      baseValue,
      formula: { ...formula },
    }));
  }
}
