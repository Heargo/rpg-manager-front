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

/** A world's skill catalogue: search and type filter, a list row per skill, with edit, duplicate and delete. */
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
      <ul class="list">
        @for (skill of shown(); track skill.id) {
          <li class="row" data-field="skill">
            <div class="main">
              <div class="line">
                <strong data-field="skill-name">{{ skill.name }}</strong>
                <span class="tag" data-field="skill-type">{{
                  'skill.type.' + skill.type | transloco
                }}</span>
                @if (skill.cost) {
                  <span class="meta" data-field="skill-cost"
                    >{{ skill.cost.attribute }} {{ skill.cost.amount }}</span
                  >
                }
                @if (skill.type === 'active' && skill.cooldown !== undefined) {
                  <span class="meta" data-field="skill-cooldown">{{
                    'skill.catalogue.cooldown'
                      | transloco: { turns: skill.cooldown }
                  }}</span>
                }
              </div>
              <p class="hint" data-field="skill-description">
                {{ skill.description }}
              </p>
            </div>
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
                [attr.aria-label]="'skill.catalogue.duplicate' | transloco"
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
          </li>
        }
      </ul>
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
    /* one card per entry, so a long list keeps some relief */
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.75rem;
      background: var(--p-content-background);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .row:hover {
      border-color: var(--p-primary-color);
      box-shadow: 0 3px 10px rgb(0 0 0 / 0.12);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.75rem;
    }
    .tag,
    .meta {
      color: var(--p-text-muted-color);
      font-size: 0.85rem;
    }
    .actions {
      flex: none;
      display: flex;
    }
    .hint {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
