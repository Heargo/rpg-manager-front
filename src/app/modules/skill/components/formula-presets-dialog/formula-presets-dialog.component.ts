import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { LanguageBusiness } from '../../../../core/business/language.business';
import {
  FormulaPresetBusiness,
  FormulaPresetResult,
} from '../../business/formula-preset.business';
import {
  FORMULA_PRESET_KINDS,
  FormulaPreset,
  FormulaPresetDraft,
} from '../../models/formula-preset';

interface PresetForm extends FormulaPresetDraft {
  /** The preset being edited; none for a new one. */
  id?: string;
}

/** Lists the formula presets: built-ins can be duplicated, user ones created, edited, duplicated and deleted. */
@Component({
  selector: 'app-formula-presets-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    SelectModule,
  ],
  template: `
    <p-dialog
      data-field="presets-dialog"
      [visible]="visible()"
      (visibleChange)="visible.set($event); form.set(null)"
      [modal]="true"
      [draggable]="false"
      [header]="'skill.presets.manageTitle' | transloco"
      [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      <div class="body">
        <p class="hint">{{ 'skill.presets.hint' | transloco }}</p>
        @if (form(); as current) {
          <div class="form" data-field="preset-edit">
            <input
              pInputText
              data-field="edit-name"
              autocomplete="off"
              [attr.aria-label]="'skill.presets.name' | transloco"
              [placeholder]="'skill.presets.name' | transloco"
              [ngModel]="current.name"
              (ngModelChange)="patch({ name: $event })"
            />
            <p-select
              data-field="edit-kind"
              [options]="kindOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="current.kind"
              (ngModelChange)="patch({ kind: $event })"
            />
            <input
              pInputText
              class="wide"
              data-field="edit-formula"
              autocomplete="off"
              spellcheck="false"
              [attr.aria-label]="'skill.presets.formula' | transloco"
              [placeholder]="'skill.presets.formula' | transloco"
              [ngModel]="current.formula"
              (ngModelChange)="patch({ formula: $event })"
            />
            <input
              pInputText
              class="wide"
              data-field="edit-description"
              autocomplete="off"
              [attr.aria-label]="'skill.presets.description' | transloco"
              [placeholder]="'skill.presets.description' | transloco"
              [ngModel]="current.description"
              (ngModelChange)="patch({ description: $event })"
            />
            <div class="buttons">
              <button
                pButton
                type="button"
                data-action="save-edit"
                icon="pi pi-check"
                [label]="'skill.presets.save' | transloco"
                (click)="saveForm()"
              ></button>
              <button
                pButton
                type="button"
                data-action="cancel-edit"
                severity="secondary"
                [text]="true"
                [label]="'common.cancel' | transloco"
                (click)="form.set(null)"
              ></button>
            </div>
          </div>
        } @else {
          <div>
            <button
              pButton
              type="button"
              data-action="new-preset"
              icon="pi pi-plus"
              severity="secondary"
              [label]="'skill.presets.new' | transloco"
              (click)="startNew()"
            ></button>
          </div>
        }
        @if (error(); as message) {
          <p-message severity="error" data-field="presets-error">{{
            message
          }}</p-message>
        }
        <ul class="list">
          @for (preset of presets.$presets(); track preset.id) {
            <li class="row" [attr.data-preset]="preset.id">
              <div class="info">
                <strong>{{ presets.label(preset) }}</strong>
                <span class="hint">{{
                  'skill.presets.kind.' + preset.kind | transloco
                }}</span>
                <code>{{ preset.formula }}</code>
                @if (presets.describe(preset); as description) {
                  <span class="hint">{{ description }}</span>
                }
              </div>
              <div class="buttons">
                <button
                  pButton
                  type="button"
                  data-action="duplicate-preset"
                  icon="pi pi-clone"
                  severity="secondary"
                  [text]="true"
                  [attr.aria-label]="'skill.presets.duplicate' | transloco"
                  (click)="run(presets.duplicate(preset.id))"
                ></button>
                @if (!preset.builtIn) {
                  <button
                    pButton
                    type="button"
                    data-action="edit-preset"
                    icon="pi pi-pencil"
                    severity="secondary"
                    [text]="true"
                    [attr.aria-label]="'skill.presets.edit' | transloco"
                    (click)="startEdit(preset)"
                  ></button>
                  <button
                    pButton
                    type="button"
                    data-action="delete-preset"
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [attr.aria-label]="'skill.presets.delete' | transloco"
                    (click)="askDelete(preset)"
                  ></button>
                }
              </div>
            </li>
          }
        </ul>
      </div>
    </p-dialog>
  `,
  styles: `
    .body,
    .form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .form {
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
      flex: 1 1 14rem;
      overflow-wrap: anywhere;
    }
    .buttons {
      display: flex;
      gap: 0.25rem;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class FormulaPresetsDialogComponent {
  protected readonly presets = inject(FormulaPresetBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);

  readonly visible = model(false);

  protected readonly form = signal<PresetForm | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly kindOptions = computed(() =>
    FORMULA_PRESET_KINDS.map((value) => ({
      value,
      label: this.language.t('skill.presets.kind.' + value),
    })),
  );

  protected startNew(): void {
    this.error.set(null);
    this.form.set({ name: '', kind: 'effect', formula: '', description: '' });
  }

  protected startEdit(preset: FormulaPreset): void {
    this.error.set(null);
    this.form.set({
      id: preset.id,
      name: preset.name,
      kind: preset.kind,
      formula: preset.formula,
      description: preset.description,
    });
  }

  protected askDelete(preset: FormulaPreset): void {
    this.confirmation.confirm({
      header: this.language.t('skill.presets.deleteTitle'),
      message: this.language.t('skill.presets.deleteMessage', {
        name: this.presets.label(preset),
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('skill.presets.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.run(this.presets.remove(preset.id)),
    });
  }

  protected patch(change: Partial<PresetForm>): void {
    this.form.update((current) => (current ? { ...current, ...change } : null));
  }

  protected saveForm(): void {
    const current = this.form();
    if (!current) return;
    const { id, ...draft } = current;
    const result = id
      ? this.presets.update(id, draft as FormulaPresetDraft)
      : this.presets.create(draft as FormulaPresetDraft);
    if (this.run(result)) this.form.set(null);
  }

  /** Reports a refusal; true when the business accepted the change. */
  protected run(result: FormulaPresetResult): boolean {
    if (result.ok) {
      this.error.set(null);
      return true;
    }
    this.error.set(this.language.t(result.errorKey));
    return false;
  }
}
