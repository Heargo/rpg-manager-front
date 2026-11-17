import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AutoCompleteModule } from '@openng/optimus-ui/autocomplete';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { EQUIPMENT_SLOTS, ITEM_TYPES } from '../../../../../core/models/item';
import { KindKey, kindLabel } from '../../../../../core/packs/kind-label';
import { SKILL_EFFECT_KINDS } from '../../../../../core/packs/pack-kinds';
import { NPC_ROLES } from '../../../../npc/models/npc';
import { SKILL_TYPES } from '../../../../skill/models/skill';
import { Domain, Drawn, FormError, KindForm } from './kind-fields';
import { KindPreviewComponent } from './kind-preview.component';
import { KindTextsFormComponent } from './kind-texts-form.component';

/** The form of a kind in the drawer: one column, titled sections General, Properties and Texts. */
@Component({
  selector: 'app-kind-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutoCompleteModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    KindPreviewComponent,
    KindTextsFormComponent,
  ],
  template: `
    <div class="form" data-test="kind-form">
      <section>
        <h4>{{ 'packs.creator.kinds.generalTitle' | translate }}</h4>
        <div class="field">
          <label for="kind-id-input">{{
            'packs.creator.kinds.id' | translate
          }}</label>
          <span data-test="kind-id">
            <input
              pInputText
              id="kind-id-input"
              type="text"
              [ngModel]="form().id"
              (ngModelChange)="patch({ id: $event })"
            />
          </span>
          @if (error() === 'kebab') {
            <small class="error">{{
              'packs.creator.kinds.kebab' | translate
            }}</small>
          } @else if (error() === 'duplicate') {
            <small class="error">{{
              'packs.creator.kinds.duplicate' | translate
            }}</small>
          }
        </div>
        <div class="field">
          <label for="kind-parent-input">{{
            'packs.creator.kinds.parent' | translate
          }}</label>
          <p-autocomplete
            data-test="kind-parent"
            inputId="kind-parent-input"
            [ngModel]="form().parent"
            (ngModelChange)="patch({ parent: $event ?? '' })"
            [suggestions]="suggestions()"
            (completeMethod)="suggest($event.query)"
            [ariaLabel]="'packs.creator.kinds.parent' | translate"
            [fluid]="true"
          >
            <ng-template #item let-suggestion>{{
              labelOf(suggestion)
            }}</ng-template>
          </p-autocomplete>
          @if (error() === 'parent') {
            <small class="error">{{
              'packs.creator.kinds.parentCycle' | translate
            }}</small>
          }
        </div>
      </section>
      <section>
        <h4>{{ 'packs.creator.kinds.fieldsTitle' | translate }}</h4>
        @switch (domain()) {
          @case ('items') {
            @if (!form().parent) {
              <div class="field">
                <span class="label">{{
                  'packs.creator.kinds.type' | translate
                }}</span>
                <p-select
                  data-test="kind-type"
                  [options]="typeOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="form().fields['type']"
                  (onChange)="setField('type', $event.value ?? undefined)"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.type' | translate"
                  [fluid]="true"
                />
              </div>
            }
            <div class="field">
              <span class="label">{{
                'packs.creator.kinds.slot' | translate
              }}</span>
              <p-select
                data-test="kind-slot"
                [options]="slotOptions()"
                optionLabel="label"
                optionValue="value"
                [ngModel]="form().fields['slot']"
                (onChange)="setField('slot', $event.value ?? undefined)"
                [showClear]="true"
                [ariaLabel]="'packs.creator.kinds.slot' | translate"
                [fluid]="true"
              />
            </div>
          }
          @case ('npcs') {
            <div class="field">
              <span class="label">{{
                'packs.creator.domain.roles' | translate
              }}</span>
              <p-multiselect
                data-test="kind-roles"
                [options]="roleOptions()"
                optionLabel="label"
                optionValue="value"
                display="chip"
                [ngModel]="form().fields['roles'] ?? []"
                (onChange)="setField('roles', listOrNothing($event.value))"
                [ariaLabel]="'packs.creator.domain.roles' | translate"
                [fluid]="true"
              />
            </div>
            @if (!form().parent) {
              <div class="field">
                <span class="label">{{
                  'packs.creator.domain.person' | translate
                }}</span>
                <p-select
                  data-test="kind-person"
                  [options]="personOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="form().fields['person']"
                  (onChange)="setField('person', $event.value ?? undefined)"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.domain.person' | translate"
                  [fluid]="true"
                />
              </div>
            }
          }
          @case ('skills') {
            @if (!form().parent) {
              <div class="field">
                <span class="label">{{
                  'packs.creator.kinds.type' | translate
                }}</span>
                <p-select
                  data-test="kind-type"
                  [options]="skillTypeOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="form().fields['type']"
                  (onChange)="setField('type', $event.value ?? undefined)"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.kinds.type' | translate"
                  [fluid]="true"
                />
              </div>
            }
            @if (form().fields['type'] !== 'passive') {
              <div class="field">
                <span class="label">{{
                  'packs.creator.domain.effect' | translate
                }}</span>
                <p-select
                  data-test="kind-effect"
                  [options]="effectOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [ngModel]="form().fields['effect']"
                  (onChange)="setField('effect', $event.value ?? undefined)"
                  [showClear]="true"
                  [ariaLabel]="'packs.creator.domain.effect' | translate"
                  [fluid]="true"
                />
              </div>
            }
          }
          @case ('classes') {
            <div class="field">
              <span class="label">{{
                'packs.creator.domain.skills' | translate
              }}</span>
              <p-multiselect
                data-test="kind-skills"
                [options]="skillOptions()"
                optionLabel="label"
                optionValue="value"
                display="chip"
                [ngModel]="form().fields['skills'] ?? []"
                (onChange)="setField('skills', listOrNothing($event.value))"
                [ariaLabel]="'packs.creator.domain.skills' | translate"
                [fluid]="true"
              />
            </div>
          }
        }
      </section>
      @if (form().texts; as texts) {
        <section>
          <h4>{{ 'packs.creator.kinds.texts' | translate }}</h4>
          <app-kind-texts-form
            [value]="texts"
            [domain]="domain()"
            (valueChange)="patch({ texts: $event })"
          />
          <app-kind-preview
            [entries]="drawn()"
            [disabled]="error() !== null || !form().id.trim()"
            (run)="preview.emit()"
          />
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h4 {
      margin: 0;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .field label,
    .label {
      font-weight: 600;
    }
    .field input,
    .field > span {
      width: 100%;
      box-sizing: border-box;
    }
    .error {
      color: var(--p-red-500);
    }
  `,
})
export class KindFormComponent {
  readonly form = input.required<KindForm>();
  readonly domain = input.required<Domain>();
  readonly error = input<FormError>(null);
  /** The kinds that may be picked as the parent. */
  readonly candidates = input<KindKey[]>([]);
  readonly skillOptions = input<{ value: string; label: string }[]>([]);
  readonly drawn = input<Drawn[] | null>(null);
  readonly formChange = output<KindForm>();
  readonly preview = output<void>();

  private readonly language = inject(LanguageBusiness);

  protected readonly suggestions = signal<string[]>([]);

  protected readonly typeOptions = computed(() =>
    ITEM_TYPES.map((value) => ({
      value,
      label: this.language.t(`item.type.${value}`),
    })),
  );
  protected readonly slotOptions = computed(() =>
    EQUIPMENT_SLOTS.map((value) => ({
      value,
      label: this.language.t(`item.slot.${value}`),
    })),
  );
  protected readonly roleOptions = computed(() =>
    NPC_ROLES.map((value) => ({
      value,
      label: this.language.t(`npc.role.${value}`),
    })),
  );
  protected readonly personOptions = computed(() => [
    { value: true, label: this.language.t('packs.creator.domain.personYes') },
    { value: false, label: this.language.t('packs.creator.domain.personNo') },
  ]);
  protected readonly skillTypeOptions = computed(() =>
    SKILL_TYPES.map((value) => ({
      value,
      label: this.language.t(`skill.type.${value}`),
    })),
  );
  protected readonly effectOptions = computed(() =>
    SKILL_EFFECT_KINDS.map((value) => ({
      value,
      label: this.language.t(`skill.effectKind.${value}`),
    })),
  );

  protected patch(patch: Partial<KindForm>): void {
    this.formChange.emit({ ...this.form(), ...patch });
  }

  protected setField(field: string, value: unknown): void {
    this.patch({ fields: { ...this.form().fields, [field]: value } });
  }

  protected listOrNothing(value: unknown): unknown[] | undefined {
    return Array.isArray(value) && value.length > 0 ? value : undefined;
  }

  protected labelOf(id: string): string {
    const kind = this.candidates().find((k) => k.id === id);
    return kind ? kindLabel(kind) : id;
  }

  protected suggest(query: string): void {
    const needle = query.toLowerCase();
    this.suggestions.set(
      this.candidates()
        .filter((kind) => kindLabel(kind).toLowerCase().includes(needle))
        .map((kind) => kind.id),
    );
  }
}
