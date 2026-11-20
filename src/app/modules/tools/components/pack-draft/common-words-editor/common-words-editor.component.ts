import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DrawerDismissDirective, confirmWhileBusy } from '../drawer-dismiss';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import { DraftIssue } from '../../../../../core/business/pack-draft-form.business';
import { Adjective } from '../../../../../core/generators/word-list';
import { ITEM_RARITIES, ItemRarity } from '../../../../../core/models/item';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  commonWordsOf,
  setCommonWords,
} from '../../../../../core/packs/pack-draft-edits';
import { AdjectiveForms, EMPTY_FORMS, adjectiveOf, wordLine } from '../words';

type WordType = 'adjective' | 'suffix';

interface WordRow {
  type: WordType;
  rarity: ItemRarity;
  index: number;
  id: string;
  text: string;
}

interface WordForm {
  original: { type: WordType; rarity: ItemRarity; index: number } | null;
  type: WordType;
  rarity: ItemRarity;
  forms: AdjectiveForms;
  suffix: string;
}

/** The adjectives and suffixes any item of the language can take: a table of words with a drawer for the detail and the form. */
@Component({
  selector: 'app-common-words-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DrawerDismissDirective,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    TableModule,
  ],
  template: `
    @if (!neutral()) {
      <h4>{{ 'packs.creator.words.common' | translate }}</h4>
      <small class="hint">{{
        'packs.creator.words.commonHint' | translate
      }}</small>
      <div class="toolbar">
        <p-button
          data-test="add-word"
          icon="pi pi-plus"
          severity="secondary"
          [label]="'packs.creator.words.add' | translate"
          (onClick)="add()"
        />
      </div>
      <p-table
        [value]="rows()"
        [tableStyle]="{ 'min-width': '100%', 'table-layout': 'fixed' }"
      >
        <ng-template #header>
          <tr>
            <th class="type-col">
              {{ 'packs.creator.words.type' | translate }}
            </th>
            <th class="rarity-col">
              {{ 'packs.creator.words.rarity' | translate }}
            </th>
            <th>{{ 'packs.creator.words.text' | translate }}</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr
            class="word-row"
            [attr.data-test]="'word-row-' + row.id"
            (click)="show(row)"
          >
            <td data-test="cell-type">
              {{ 'packs.creator.words.types.' + row.type | translate }}
            </td>
            <td data-test="cell-rarity">
              {{ 'item.rarity.' + row.rarity | translate }}
            </td>
            <td data-test="cell-text">{{ row.text }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="3">{{ 'packs.creator.words.empty' | translate }}</td>
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
        [appDrawerDismiss]="panel() !== null && !confirming()"
        (dismiss)="requestClose()"
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
        @if (panel() === 'detail' && selected(); as row) {
          <dl class="detail" data-test="word-detail">
            <dt>{{ 'packs.creator.words.type' | translate }}</dt>
            <dd>{{ 'packs.creator.words.types.' + row.type | translate }}</dd>
            <dt>{{ 'packs.creator.words.rarity' | translate }}</dt>
            <dd>{{ 'item.rarity.' + row.rarity | translate }}</dd>
            <dt>{{ 'packs.creator.words.text' | translate }}</dt>
            <dd>{{ row.text }}</dd>
          </dl>
        }
        @if (panel() === 'form' && form(); as f) {
          <div class="form" data-test="word-form">
            <div class="field">
              <label for="word-type-input">{{
                'packs.creator.words.type' | translate
              }}</label>
              <p-select
                data-test="word-type"
                inputId="word-type-input"
                [options]="typeOptions()"
                optionLabel="label"
                optionValue="value"
                [ngModel]="f.type"
                (onChange)="patch({ type: $event.value })"
                [ariaLabel]="'packs.creator.words.type' | translate"
                [fluid]="true"
              />
            </div>
            <div class="field">
              <label for="word-rarity-input">{{
                'packs.creator.words.rarity' | translate
              }}</label>
              <p-select
                data-test="word-rarity"
                inputId="word-rarity-input"
                [options]="rarityOptions()"
                optionLabel="label"
                optionValue="value"
                [ngModel]="f.rarity"
                (onChange)="patch({ rarity: $event.value })"
                [ariaLabel]="'packs.creator.words.rarity' | translate"
                [fluid]="true"
              />
            </div>
            @if (f.type === 'adjective') {
              @for (key of forms; track key) {
                <div class="field">
                  <label [for]="'word-' + key + '-input'">{{
                    'packs.creator.words.' + key | translate
                  }}</label>
                  <input
                    pInputText
                    type="text"
                    [id]="'word-' + key + '-input'"
                    [attr.data-test]="'word-' + key"
                    [ngModel]="f.forms[key]"
                    (ngModelChange)="patchForm(key, $event ?? '')"
                  />
                </div>
              }
            } @else {
              <div class="field">
                <label for="word-suffix-input">{{
                  'packs.creator.words.suffixLabel' | translate
                }}</label>
                <input
                  pInputText
                  type="text"
                  id="word-suffix-input"
                  data-test="word-suffix"
                  [ngModel]="f.suffix"
                  (ngModelChange)="patch({ suffix: $event ?? '' })"
                />
              </div>
            }
          </div>
        }
        <ng-template #footer>
          <div class="buttons">
            @if (panel() === 'detail' && selected(); as row) {
              <p-button
                data-test="detail-edit"
                icon="pi pi-pencil"
                [label]="'packs.creator.kinds.edit' | translate"
                (onClick)="edit(row)"
              />
              <p-button
                data-test="detail-delete"
                icon="pi pi-trash"
                severity="danger"
                outlined
                [label]="'packs.creator.kinds.deleteAccept' | translate"
                (onClick)="confirmDelete(row)"
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
      margin: 0.5rem 0;
    }
    .word-row {
      cursor: pointer;
    }
    td {
      overflow-wrap: anywhere;
    }
    .type-col,
    .rarity-col {
      width: 8rem;
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
  `,
})
export class CommonWordsEditorComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly confirming = signal(false);

  protected readonly forms = ['m', 'f', 'mp', 'fp'] as const;
  protected readonly panel = signal<'detail' | 'form' | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly form = signal<WordForm | null>(null);
  private initial = '';

  protected readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );
  protected readonly words = computed(() => commonWordsOf(this.draft()));

  protected readonly rows = computed<WordRow[]>(() => {
    const words = this.words();
    const rows: WordRow[] = [];
    for (const type of ['adjective', 'suffix'] as const) {
      const lists: Partial<Record<ItemRarity, unknown[]>> =
        type === 'adjective' ? words.adjectives : words.suffixes;
      for (const rarity of ITEM_RARITIES)
        (lists[rarity] ?? []).forEach((word, index) =>
          rows.push({
            type,
            rarity,
            index,
            id: `${type}-${rarity}-${index}`,
            text: wordLine(word),
          }),
        );
    }
    return rows;
  });

  protected readonly selected = computed(
    () => this.rows().find((row) => row.id === this.selectedId()) ?? null,
  );

  protected readonly typeOptions = computed(() =>
    (['adjective', 'suffix'] as const).map((value) => ({
      value,
      label: this.language.t(`packs.creator.words.types.${value}`),
    })),
  );

  protected readonly rarityOptions = computed(() =>
    ITEM_RARITIES.map((value) => ({
      value,
      label: this.language.t(`item.rarity.${value}`),
    })),
  );

  protected readonly title = computed(() => {
    if (this.panel() === 'detail') return 'packs.creator.words.detailTitle';
    return this.form()?.original === null
      ? 'packs.creator.words.newTitle'
      : 'packs.creator.words.editTitle';
  });

  protected readonly canSave = computed(() => {
    const form = this.form();
    if (!form) return false;
    return form.type === 'adjective'
      ? !!form.forms.m.trim()
      : !!form.suffix.trim();
  });

  protected patch(change: Partial<WordForm>): void {
    this.form.update((form) => (form ? { ...form, ...change } : form));
  }

  protected patchForm(key: keyof AdjectiveForms, value: string): void {
    this.form.update((form) =>
      form ? { ...form, forms: { ...form.forms, [key]: value } } : form,
    );
  }

  // --- the drawer -------------------------------------------------------------------------------------------

  protected show(row: WordRow): void {
    this.selectedId.set(row.id);
    this.form.set(null);
    this.panel.set('detail');
  }

  protected edit(row: WordRow): void {
    const original = { type: row.type, rarity: row.rarity, index: row.index };
    if (row.type === 'suffix') {
      this.openForm({
        original,
        type: 'suffix',
        rarity: row.rarity,
        forms: { ...EMPTY_FORMS },
        suffix: this.words().suffixes[row.rarity]?.[row.index] ?? '',
      });
      return;
    }
    const word = this.words().adjectives[row.rarity]?.[row.index];
    const forms: AdjectiveForms =
      typeof word === 'string'
        ? { ...EMPTY_FORMS, m: word }
        : { ...EMPTY_FORMS, ...(word as Partial<AdjectiveForms>) };
    this.openForm({
      original,
      type: 'adjective',
      rarity: row.rarity,
      forms,
      suffix: '',
    });
  }

  protected add(): void {
    this.openForm({
      original: null,
      type: 'adjective',
      rarity: 'common',
      forms: { ...EMPTY_FORMS },
      suffix: '',
    });
  }

  private openForm(form: WordForm): void {
    this.selectedId.set(
      form.original
        ? `${form.original.type}-${form.original.rarity}-${form.original.index}`
        : null,
    );
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
    confirmWhileBusy(this.confirmation, this.confirming, {
      header: this.language.t('packs.creator.words.discardTitle'),
      message: this.language.t('packs.creator.words.discardMessage'),
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
    const adjectives: Partial<Record<ItemRarity, Adjective[]>> = {
      ...this.words().adjectives,
    };
    const suffixes: Partial<Record<ItemRarity, string[]>> = {
      ...this.words().suffixes,
    };
    const from = form.original;
    const same = from && from.type === form.type && from.rarity === form.rarity;
    if (from && !same) this.without(adjectives, suffixes, from);
    if (form.type === 'adjective') {
      const adjective = adjectiveOf(form.forms) as Adjective;
      const list = [...(adjectives[form.rarity] ?? [])];
      if (same) list[from.index] = adjective;
      else list.push(adjective);
      adjectives[form.rarity] = list;
    } else {
      const list = [...(suffixes[form.rarity] ?? [])];
      if (same) list[from.index] = form.suffix.trim();
      else list.push(form.suffix.trim());
      suffixes[form.rarity] = list;
    }
    this.changed.emit(setCommonWords(this.draft(), { adjectives, suffixes }));
    this.close();
  }

  private without(
    adjectives: Partial<Record<ItemRarity, Adjective[]>>,
    suffixes: Partial<Record<ItemRarity, string[]>>,
    at: { type: WordType; rarity: ItemRarity; index: number },
  ): void {
    const lists: Partial<Record<ItemRarity, unknown[]>> =
      at.type === 'adjective' ? adjectives : suffixes;
    lists[at.rarity] = (lists[at.rarity] ?? []).filter(
      (_, i) => i !== at.index,
    );
  }

  protected confirmDelete(row: WordRow): void {
    confirmWhileBusy(this.confirmation, this.confirming, {
      header: this.language.t('packs.creator.words.deleteTitle'),
      message: this.language.t('packs.creator.words.deleteMessage', {
        text: row.text,
      }),
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
      accept: () => this.remove(row),
    });
  }

  private remove(row: WordRow): void {
    const adjectives = { ...this.words().adjectives };
    const suffixes = { ...this.words().suffixes };
    this.without(adjectives, suffixes, row);
    this.close();
    this.changed.emit(setCommonWords(this.draft(), { adjectives, suffixes }));
  }
}
