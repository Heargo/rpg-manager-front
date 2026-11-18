import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TableModule } from '@openng/optimus-ui/table';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  paramsOf,
  removeParam,
  renameParam,
  setParam,
} from '../../../../../core/packs/pack-draft-edits';
import { ChipListComponent } from '../chip-list/chip-list.component';

interface ParamForm {
  original: string | null;
  name: string;
  entries: string;
}

/** The params shared by every generator of the pack's language, as a table with a drawer for the detail and the form. */
@Component({
  selector: 'app-params-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TextareaModule,
    ChipListComponent,
  ],
  template: `
    @if (neutral()) {
      <p class="hint" data-test="params-neutral">
        {{ 'packs.creator.params.neutral' | translate }}
      </p>
    } @else {
      <div class="toolbar">
        <p-button
          data-test="add-param"
          icon="pi pi-plus"
          severity="secondary"
          [label]="'packs.creator.params.add' | translate"
          (onClick)="add()"
        />
      </div>
      <p-table
        [value]="names()"
        [tableStyle]="{ 'min-width': '100%', 'table-layout': 'fixed' }"
      >
        <ng-template #header>
          <tr>
            <th class="name-col">
              {{ 'packs.creator.params.name' | translate }}
            </th>
            <th class="count-col">
              {{ 'packs.creator.params.countHeader' | translate }}
            </th>
            <th class="extra">
              {{ 'packs.creator.params.entries' | translate }}
            </th>
          </tr>
        </ng-template>
        <ng-template #body let-name>
          <tr
            class="param-row"
            [attr.data-test]="'param-row-' + name"
            (click)="show(name)"
          >
            <td>
              <span data-test="cell-name">{{ name }}</span>
              @for (issue of issuesOf(name); track $index) {
                <p-message
                  data-test="issue"
                  size="small"
                  [severity]="issue.level === 'error' ? 'error' : 'warn'"
                  >{{ issue.message }}</p-message
                >
              }
            </td>
            <td data-test="cell-count">{{ entriesOf(name).length }}</td>
            <td class="extra" data-test="cell-entries">
              <app-chip-list [names]="entriesOf(name)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="3">{{ 'packs.creator.params.empty' | translate }}</td>
          </tr>
        </ng-template>
      </p-table>

      <p-drawer
        position="right"
        [visible]="panel() !== null"
        (visibleChange)="onVisible($event)"
        [blockScroll]="true"
        [closable]="false"
        [dismissible]="false"
        [closeOnEscape]="false"
        [style]="{ width: 'min(32rem, 100vw)' }"
      >
        <ng-template #header>
          <div class="drawer-header">
            <strong>{{ title() | translate }}</strong>
            <p-button
              data-test="drawer-close"
              icon="pi pi-times"
              severity="secondary"
              text
              [ariaLabel]="'packs.creator.kinds.close' | translate"
              (onClick)="requestClose()"
            />
          </div>
        </ng-template>
        @if (panel() === 'detail' && selectedId(); as id) {
          <div class="detail" data-test="param-detail">
            <h4>{{ id }}</h4>
            <ul>
              @for (entry of entriesOf(id); track $index) {
                <li>{{ entry }}</li>
              }
            </ul>
          </div>
        }
        @if (panel() === 'form' && form(); as f) {
          <div class="form" data-test="param-form">
            <div class="field">
              <label for="param-name-input">{{
                'packs.creator.params.name' | translate
              }}</label>
              <input
                pInputText
                id="param-name-input"
                data-test="param-name"
                type="text"
                [ngModel]="f.name"
                (ngModelChange)="patch({ name: $event ?? '' })"
              />
              @if (duplicate()) {
                <small class="error">{{
                  'packs.creator.kinds.duplicate' | translate
                }}</small>
              }
            </div>
            <div class="field">
              <label for="param-entries-input">{{
                'packs.creator.params.entries' | translate
              }}</label>
              <textarea
                pTextarea
                id="param-entries-input"
                data-test="param-entries"
                rows="8"
                [ngModel]="f.entries"
                (ngModelChange)="patch({ entries: $event ?? '' })"
              ></textarea>
              <small class="hint">{{
                'packs.creator.params.entriesHint' | translate
              }}</small>
            </div>
          </div>
        }
        <ng-template #footer>
          <div class="buttons">
            @if (panel() === 'detail' && selectedId(); as id) {
              <p-button
                data-test="detail-edit"
                icon="pi pi-pencil"
                [label]="'packs.creator.kinds.edit' | translate"
                (onClick)="edit(id)"
              />
              <p-button
                data-test="detail-delete"
                icon="pi pi-trash"
                severity="danger"
                outlined
                [label]="'packs.creator.kinds.deleteAccept' | translate"
                (onClick)="confirmDelete(id)"
              />
            }
            @if (panel() === 'form') {
              <p-button
                data-test="form-save"
                icon="pi pi-check"
                [label]="'packs.creator.kinds.save' | translate"
                [disabled]="!canSave()"
                (onClick)="save()"
              />
              <p-button
                data-test="form-cancel"
                severity="secondary"
                outlined
                [label]="'packs.creator.kinds.cancel' | translate"
                (onClick)="requestClose()"
              />
            }
          </div>
        </ng-template>
      </p-drawer>
    }
  `,
  styles: `
    .toolbar {
      margin-bottom: 0.5rem;
    }
    .param-row {
      cursor: pointer;
    }
    td {
      overflow-wrap: anywhere;
    }
    .name-col {
      width: 30%;
    }
    .count-col {
      width: 6rem;
    }
    @media (max-width: 40rem) {
      .extra {
        display: none;
      }
      .name-col {
        width: auto;
      }
    }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .form,
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .error {
      color: var(--p-red-500);
    }
  `,
})
export class ParamsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly panel = signal<'detail' | 'form' | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly form = signal<ParamForm | null>(null);
  private initial = '';

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly names = computed(() =>
    Object.keys(paramsOf(this.draft())),
  );

  protected readonly title = computed(() => {
    if (this.panel() === 'detail') return 'packs.creator.params.detailTitle';
    return this.form()?.original === null
      ? 'packs.creator.params.newTitle'
      : 'packs.creator.params.editTitle';
  });

  protected readonly duplicate = computed(() => {
    const form = this.form();
    if (!form) return false;
    const name = form.name.trim();
    return name !== form.original && name in paramsOf(this.draft());
  });

  protected readonly canSave = computed(() => {
    const form = this.form();
    return (
      !!form &&
      !!form.name.trim() &&
      !this.duplicate() &&
      this.linesOf(form.entries).length > 0
    );
  });

  constructor() {
    // The selected param went away: nothing left to show.
    effect(() => {
      const id = this.selectedId();
      if (id && !(id in paramsOf(this.draft()))) this.close();
    });
  }

  protected issuesOf(name: string): DraftIssue[] {
    return this.issues().filter((issue) => issue.param === name);
  }

  protected entriesOf(name: string): string[] {
    return paramsOf(this.draft())[name] ?? [];
  }

  private linesOf(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  protected patch(change: Partial<ParamForm>): void {
    this.form.update((form) => (form ? { ...form, ...change } : form));
  }

  // --- the drawer -------------------------------------------------------------------------------------------

  protected show(name: string): void {
    this.selectedId.set(name);
    this.form.set(null);
    this.panel.set('detail');
  }

  protected edit(name: string): void {
    this.openForm({
      original: name,
      name,
      entries: this.entriesOf(name).join('\n'),
    });
  }

  protected add(): void {
    this.openForm({ original: null, name: '', entries: '' });
  }

  private openForm(form: ParamForm): void {
    this.selectedId.set(form.original);
    this.initial = JSON.stringify(form);
    this.form.set(form);
    this.panel.set('form');
  }

  private dirty(): boolean {
    return (
      this.panel() === 'form' && JSON.stringify(this.form()) !== this.initial
    );
  }

  private close(): void {
    this.panel.set(null);
    this.form.set(null);
    this.selectedId.set(null);
  }

  protected onVisible(visible: boolean): void {
    if (!visible) this.requestClose();
  }

  protected requestClose(): void {
    if (!this.dirty()) {
      this.close();
      return;
    }
    this.confirmation.confirm({
      header: this.language.t('packs.creator.params.discardTitle'),
      message: this.language.t('packs.creator.params.discardMessage'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: this.language.t('packs.creator.kinds.discardAccept'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('packs.creator.kinds.discardReject'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.close(),
    });
  }

  // --- the edits --------------------------------------------------------------------------------------------

  protected save(): void {
    const form = this.form();
    if (!form || !this.canSave()) return;
    const name = form.name.trim();
    let draft = this.draft();
    if (form.original && form.original !== name)
      draft = renameParam(draft, form.original, name);
    draft = setParam(draft, name, this.linesOf(form.entries));
    this.changed.emit(draft);
    this.close();
  }

  protected confirmDelete(name: string): void {
    this.confirmation.confirm({
      header: this.language.t('packs.creator.params.deleteTitle'),
      message: this.language.t('packs.creator.params.deleteMessage', { name }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('packs.creator.kinds.deleteAccept'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('packs.creator.kinds.deleteReject'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.remove(name),
    });
  }

  private remove(name: string): void {
    if (this.selectedId() === name) this.close();
    this.changed.emit(removeParam(this.draft(), name));
  }
}
