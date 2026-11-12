import { Injectable, computed, inject, signal } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import {
  BUILT_IN_PRESETS,
  toPresetFormula,
  validatePreset,
} from '../helpers/formula-preset.rules';
import {
  FormulaPreset,
  FormulaPresetDraft,
  FormulaPresetKind,
} from '../models/formula-preset';
import { FormulaPresetStorageService } from '../services/formula-preset-storage.service';

export type FormulaPresetResult =
  { ok: true; preset: FormulaPreset } | { ok: false; errorKey: string };

const INVALID = {
  ok: false,
  errorKey: 'skill.presets.errors.invalid',
} as const;
const BUILT_IN = {
  ok: false,
  errorKey: 'skill.presets.errors.builtIn',
} as const;

/** Built-in and user formula presets; the user ones are kept on the device. */
@Injectable({ providedIn: 'root' })
export class FormulaPresetBusiness {
  private readonly storage = inject(FormulaPresetStorageService);
  private readonly language = inject(LanguageBusiness);
  private readonly user = signal<FormulaPreset[]>(
    this.storage.load().map((preset) => ({ ...preset, builtIn: false })),
  );

  readonly $presets = computed<FormulaPreset[]>(() => [
    ...BUILT_IN_PRESETS,
    ...this.user(),
  ]);

  /** The name to show: a built-in's is an i18n key. */
  label(preset: FormulaPreset): string {
    return preset.builtIn ? this.language.t(preset.name) : preset.name;
  }

  describe(preset: FormulaPreset): string {
    return preset.builtIn
      ? this.language.t(preset.description)
      : preset.description;
  }

  create(draft: FormulaPresetDraft): FormulaPresetResult {
    if (validatePreset(draft)) return INVALID;
    const preset: FormulaPreset = {
      ...this.clean(draft),
      id: this.nextId(),
      builtIn: false,
    };
    this.commit([...this.user(), preset]);
    return { ok: true, preset };
  }

  /** Saves a formula written with real attribute names as a preset, the names turned into placeholders. */
  saveFromFormula(
    name: string,
    kind: FormulaPresetKind,
    formula: string,
    attributeNames: string[],
  ): FormulaPresetResult {
    if (!name.trim()) {
      return { ok: false, errorKey: 'skill.presets.errors.name' };
    }
    return this.create({
      name: name.trim(),
      kind,
      formula: toPresetFormula(formula, attributeNames),
      description: '',
    });
  }

  update(id: string, draft: FormulaPresetDraft): FormulaPresetResult {
    if (BUILT_IN_PRESETS.some((preset) => preset.id === id)) return BUILT_IN;
    const current = this.user().find((preset) => preset.id === id);
    if (!current) return INVALID;
    if (validatePreset(draft)) return INVALID;
    const preset = { ...current, ...this.clean(draft) };
    this.commit(this.user().map((p) => (p.id === id ? preset : p)));
    return { ok: true, preset };
  }

  remove(id: string): FormulaPresetResult {
    if (BUILT_IN_PRESETS.some((preset) => preset.id === id)) return BUILT_IN;
    const current = this.user().find((preset) => preset.id === id);
    if (!current) return INVALID;
    this.commit(this.user().filter((preset) => preset.id !== id));
    return { ok: true, preset: current };
  }

  /** An editable user copy of any preset. */
  duplicate(id: string): FormulaPresetResult {
    const source = this.$presets().find((preset) => preset.id === id);
    if (!source) return INVALID;
    return this.create({
      name: this.language.t('skill.presets.copyName', {
        name: this.label(source),
      }),
      kind: source.kind,
      formula: source.formula,
      description: this.describe(source),
    });
  }

  private clean(draft: FormulaPresetDraft): FormulaPresetDraft {
    return {
      name: draft.name,
      kind: draft.kind,
      formula: draft.formula,
      description: draft.description,
    };
  }

  private nextId(): string {
    const numbers = this.user().map((preset) =>
      Number(preset.id.replace('user-', '')),
    );
    return `user-${Math.max(0, ...numbers.filter(Number.isFinite)) + 1}`;
  }

  private commit(list: FormulaPreset[]): void {
    this.user.set(list);
    this.storage.save(list);
  }
}
