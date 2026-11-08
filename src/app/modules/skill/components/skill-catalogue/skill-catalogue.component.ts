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
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { filterSkills } from '../../helpers/skill.rules';
import { Skill, SKILL_TYPES, SkillType } from '../../models/skill';

/** A world's skill catalogue: search and type filter, a card per skill, with edit, duplicate and delete. */
@Component({
  selector: 'app-skill-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
  ],
  template: `
    <div class="toolbar">
      <input
        pInputText
        data-field="search"
        type="search"
        [attr.aria-label]="'skill.catalogue.search' | transloco"
        [placeholder]="'skill.catalogue.search' | transloco"
        [value]="search()"
        (input)="search.set($any($event.target).value)"
        autocomplete="off"
      />
      <p-select
        data-field="type"
        [options]="typeOptions()"
        optionLabel="label"
        optionValue="value"
        [showClear]="true"
        [ngModel]="type()"
        (ngModelChange)="type.set($event ?? undefined)"
        [placeholder]="'skill.catalogue.type' | transloco"
      />
      <button
        pButton
        type="button"
        data-action="create"
        icon="pi pi-plus"
        [label]="'skill.catalogue.create' | transloco"
        (click)="create.emit()"
      ></button>
    </div>

    @if (shown().length) {
      <div class="grid">
        @for (skill of shown(); track skill.id) {
          <div class="card" data-field="skill">
            <div class="head">
              <strong>{{ skill.name }}</strong>
              <span class="tag">{{
                'skill.type.' + skill.type | transloco
              }}</span>
            </div>
            <p class="hint">{{ skill.description }}</p>
            <span class="hint">{{
              'skill.catalogue.ranks'
                | transloco: { max: skill.maxRank, cost: skill.pointCost }
            }}</span>
            <div class="actions">
              <button
                pButton
                type="button"
                data-action="edit"
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                [attr.aria-label]="'skill.catalogue.edit' | transloco"
                (click)="edit.emit(skill)"
              ></button>
              <button
                pButton
                type="button"
                data-action="duplicate"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [label]="'skill.catalogue.duplicate' | transloco"
                (click)="duplicate.emit(skill)"
              ></button>
              <button
                pButton
                type="button"
                data-action="delete"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [attr.aria-label]="'skill.catalogue.delete' | transloco"
                (click)="askDelete(skill)"
              ></button>
            </div>
          </div>
        }
      </div>
    } @else {
      <p class="hint">{{ 'skill.catalogue.empty' | transloco }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .actions {
      display: flex;
      justify-content: space-between;
    }
    .hint {
      margin: 0;
      color: var(--p-text-muted-color);
    }
  `,
})
export class SkillCatalogueComponent {
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);

  readonly skills = input.required<Skill[]>();

  readonly create = output<void>();
  readonly edit = output<Skill>();
  readonly duplicate = output<Skill>();
  readonly remove = output<Skill>();

  protected readonly search = signal('');
  protected readonly type = signal<SkillType | undefined>(undefined);

  protected readonly shown = computed(() =>
    filterSkills(this.skills(), { search: this.search(), type: this.type() }),
  );
  protected readonly typeOptions = computed(() =>
    SKILL_TYPES.map((value) => ({
      value,
      label: this.language.t('skill.type.' + value),
    })),
  );

  protected askDelete(skill: Skill): void {
    this.confirmation.confirm({
      header: this.language.t('skill.catalogue.deleteTitle'),
      message: this.language.t('skill.catalogue.deleteMessage', {
        name: skill.name,
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('skill.catalogue.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.remove.emit(skill),
    });
  }
}
