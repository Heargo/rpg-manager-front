import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { filterClasses } from '../../helpers/class.rules';
import { CharacterClass } from '../../models/class';

/** A world's class catalogue: search, a card per class, with edit, duplicate and delete. */
@Component({
  selector: 'app-class-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ButtonModule, InputTextModule],
  template: `
    <div class="toolbar">
      <input
        pInputText
        data-field="search"
        type="search"
        [attr.aria-label]="'class.catalogue.search' | transloco"
        [placeholder]="'class.catalogue.search' | transloco"
        [value]="search()"
        (input)="search.set($any($event.target).value)"
        autocomplete="off"
      />
      <button
        pButton
        type="button"
        data-action="create"
        icon="pi pi-plus"
        [label]="'class.catalogue.create' | transloco"
        (click)="create.emit()"
      ></button>
      <button
        pButton
        type="button"
        data-action="add-defaults"
        icon="pi pi-plus"
        severity="secondary"
        [label]="'class.catalogue.addDefaults' | transloco"
        (click)="addDefaults.emit()"
      ></button>
    </div>

    @if (shown().length) {
      <div class="grid">
        @for (entry of shown(); track entry.id) {
          <div class="card" data-field="class">
            <strong>{{ entry.name }}</strong>
            <p class="hint">{{ entry.description }}</p>
            <span class="hint">{{
              'class.catalogue.skills' | transloco: { count: entry.tree.length }
            }}</span>
            <div class="actions">
              <button
                pButton
                type="button"
                data-action="edit"
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                [attr.aria-label]="'class.catalogue.edit' | transloco"
                (click)="edit.emit(entry)"
              ></button>
              <button
                pButton
                type="button"
                data-action="duplicate"
                icon="pi pi-copy"
                severity="secondary"
                [text]="true"
                [label]="'class.catalogue.duplicate' | transloco"
                (click)="duplicate.emit(entry)"
              ></button>
              <button
                pButton
                type="button"
                data-action="delete"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [attr.aria-label]="'class.catalogue.delete' | transloco"
                (click)="askDelete(entry)"
              ></button>
            </div>
          </div>
        }
      </div>
    } @else {
      <p class="hint">{{ 'class.catalogue.empty' | transloco }}</p>
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
export class ClassCatalogueComponent {
  private readonly confirmation = inject(ConfirmationService);
  private readonly language = inject(LanguageBusiness);

  readonly classes = input.required<CharacterClass[]>();

  readonly create = output<void>();
  readonly addDefaults = output<void>();
  readonly edit = output<CharacterClass>();
  readonly duplicate = output<CharacterClass>();
  readonly remove = output<CharacterClass>();

  protected readonly search = signal('');

  protected readonly shown = computed(() =>
    filterClasses(this.classes(), { search: this.search() }),
  );

  protected askDelete(entry: CharacterClass): void {
    this.confirmation.confirm({
      header: this.language.t('class.catalogue.deleteTitle'),
      message: this.language.t('class.catalogue.deleteMessage', {
        name: entry.name,
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('class.catalogue.delete'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('common.cancel'),
        severity: 'secondary',
        text: true,
      },
      accept: () => this.remove.emit(entry),
    });
  }
}
