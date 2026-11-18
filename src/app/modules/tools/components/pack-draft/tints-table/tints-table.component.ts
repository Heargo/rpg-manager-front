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
import { DrawerDismissDirective, confirmWhileBusy } from '../drawer-dismiss';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { MessageModule } from '@openng/optimus-ui/message';
import { TableModule } from '@openng/optimus-ui/table';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import {
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import {
  KindKey,
  kindLabel,
  kindOptions,
} from '../../../../../core/packs/kind-label';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  kindTextsOf,
  removeTint,
  renameTint,
  setTint,
  setTintFits,
  setTintTexts,
} from '../../../../../core/packs/pack-draft-edits';
import { KIND_ID } from '../../../../../core/packs/pack-kinds';
import { ChipListComponent } from '../chip-list/chip-list.component';
import { TintDetailComponent } from './tint-detail.component';
import {
  DEFAULT_GRADIENT,
  TintForm,
  TintFormError,
  TintRow,
  emptyTexts,
  gradientCss,
  parseTexts,
  readTexts,
} from './tint-fields';
import { TintFormComponent } from './tint-form.component';

/** The tints of the pack as a table, with a drawer for the detail and the form of a tint. */
@Component({
  selector: 'app-tints-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DrawerDismissDirective,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    MessageModule,
    TableModule,
    ChipListComponent,
    TintDetailComponent,
    TintFormComponent,
  ],
  template: `
    <div class="toolbar">
      <p-button
        data-test="add-tint"
        icon="pi pi-plus"
        severity="secondary"
        [label]="'packs.creator.tints.add' | translate"
        (onClick)="add()"
      />
    </div>
    <p-table
      [value]="rows()"
      [tableStyle]="{ 'min-width': '100%', 'table-layout': 'fixed' }"
    >
      <ng-template #header>
        <tr>
          <th class="name-col">{{ 'packs.creator.tints.name' | translate }}</th>
          <th class="gradient-col">
            {{ 'packs.creator.tints.gradient' | translate }}
          </th>
          <th class="extra">{{ 'packs.creator.tints.fits' | translate }}</th>
        </tr>
      </ng-template>
      <ng-template #body let-row>
        <tr
          class="tint-row"
          [attr.data-test]="'tint-row-' + row.id"
          (click)="show(row.id)"
        >
          <td>
            <span data-test="cell-name">{{ row.id }}</span>
            @for (issue of issuesOf(row.id); track $index) {
              <p-message
                data-test="issue"
                size="small"
                [severity]="issue.level === 'error' ? 'error' : 'warn'"
                >{{ issue.message }}</p-message
              >
            }
          </td>
          <td>
            <span
              class="swatch"
              data-test="cell-gradient"
              [attr.style]="'background:' + gradient(row)"
            ></span>
          </td>
          <td class="extra" data-test="cell-fits">
            <app-chip-list [names]="row.names" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage>
        <tr>
          <td colspan="3">{{ 'packs.creator.tints.empty' | translate }}</td>
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
      @if (panel() === 'detail' && selected(); as tint) {
        <app-tint-detail
          [tint]="tint"
          [draft]="draft()"
          [issues]="issuesOf(tint.id)"
        />
      }
      @if (panel() === 'form' && form(); as f) {
        <app-tint-form
          [form]="f"
          [error]="formError()"
          [fitOptions]="fitOptions()"
          [known]="knownTints()"
          (formChange)="form.set($event)"
        />
      }
      <ng-template #footer>
        <div class="buttons">
          @if (panel() === 'detail' && selected(); as tint) {
            <p-button
              data-test="detail-edit"
              icon="pi pi-pencil"
              [label]="'packs.creator.kinds.edit' | translate"
              (onClick)="edit(tint.id)"
            />
            <p-button
              data-test="detail-delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              [label]="'packs.creator.kinds.deleteAccept' | translate"
              (onClick)="confirmDelete(tint.id)"
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
  `,
  styles: `
    .toolbar {
      margin-bottom: 0.5rem;
    }
    .tint-row {
      cursor: pointer;
    }
    td {
      overflow-wrap: anywhere;
    }
    .name-col {
      width: 30%;
    }
    .gradient-col {
      width: 10rem;
    }
    .swatch {
      display: block;
      height: 1.25rem;
      border-radius: 0.3rem;
      border: 1px solid var(--p-content-border-color);
    }
    @media (max-width: 40rem) {
      .extra {
        display: none;
      }
      .name-col {
        width: auto;
      }
      .gradient-col {
        width: 6rem;
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
  `,
})
export class TintsTableComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();

  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly confirming = signal(false);
  private readonly business = inject(PackDraftFormBusiness);

  protected readonly panel = signal<'detail' | 'form' | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly form = signal<TintForm | null>(null);
  private readonly known = signal<KnownKeys['kinds']>([]);
  protected readonly knownTints = signal<string[]>([]);
  private initialTexts = '';
  private initial = '';
  private loads = 0;

  private readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );

  /** Every kind a tint may fit: the pack's own, with their first noun, and the known ones. */
  private readonly kindKeys = computed<KindKey[]>(() => {
    const draft = this.draft();
    const own = Object.keys(draft.kinds).map((id) => ({
      id,
      noun: kindTextsOf(draft, id).nouns[0]?.text,
    }));
    return [...own, ...this.known()];
  });

  protected readonly rows = computed<TintRow[]>(() => {
    const keys = new Map(this.kindKeys().map((kind) => [kind.id, kind]));
    return Object.entries(this.draft().tints).map(([id, tint]) => {
      const fits = tint.fits ?? [];
      return {
        id,
        stops: tint.gradient,
        fits: fits.map((kind) => kindLabel(keys.get(kind) ?? { id: kind })),
        names: fits.map((kind) => keys.get(kind)?.noun ?? kind),
      };
    });
  });

  protected readonly selected = computed(
    () => this.rows().find((row) => row.id === this.selectedId()) ?? null,
  );

  protected readonly fitOptions = computed(() =>
    kindOptions(this.kindKeys(), this.form()?.fits ?? []),
  );

  protected readonly title = computed(() => {
    if (this.panel() === 'detail') return 'packs.creator.tints.detailTitle';
    return this.form()?.original === null
      ? 'packs.creator.tints.newTitle'
      : 'packs.creator.tints.editTitle';
  });

  protected readonly formError = computed<TintFormError>(() => {
    const form = this.form();
    if (!form) return null;
    const id = form.id.trim();
    if (!KIND_ID.test(id)) return id ? 'kebab' : null;
    if (id !== form.original && id in this.draft().tints) return 'duplicate';
    return null;
  });

  protected readonly canSave = computed(
    () =>
      KIND_ID.test(this.form()?.id.trim() ?? '') && this.formError() === null,
  );

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.business
        .knownKeys(draft)

        .then((keys) => {
          if (load !== this.loads) return;
          this.known.set(keys.kinds);
          this.knownTints.set(keys.tints);
        });
    });
    // The selected tint went away: nothing left to show.
    effect(() => {
      const id = this.selectedId();
      if (id && !(id in this.draft().tints)) this.close();
    });
  }

  protected gradient(row: TintRow): string {
    return gradientCss(row.stops);
  }

  protected issuesOf(id: string): DraftIssue[] {
    return this.issues().filter((issue) => issue.tint === id);
  }

  // --- the drawer -------------------------------------------------------------------------------------------

  protected show(id: string): void {
    this.selectedId.set(id);
    this.form.set(null);
    this.panel.set('detail');
  }

  protected edit(id: string): void {
    const tint = this.draft().tints[id];
    this.openForm({
      original: id,
      id,
      stops: (tint?.gradient ?? []).map((stop) => ({ ...stop })),
      fits: [...(tint?.fits ?? [])],
      texts: this.neutral() ? null : readTexts(this.draft(), id),
    });
  }

  protected add(): void {
    this.openForm({
      original: null,
      id: '',
      stops: DEFAULT_GRADIENT.map((stop) => ({ ...stop })),
      fits: [],
      texts: this.neutral() ? null : emptyTexts(),
    });
  }

  private openForm(form: TintForm): void {
    this.selectedId.set(form.original);
    this.initial = JSON.stringify(form);
    this.initialTexts = JSON.stringify(form.texts);
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
      header: this.language.t('packs.creator.tints.discardTitle'),
      message: this.language.t('packs.creator.tints.discardMessage'),
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
    const id = form.id.trim();
    let draft = this.draft();
    if (form.original && form.original !== id)
      draft = renameTint(draft, form.original, id);
    draft = setTint(draft, id, form.stops);
    draft = setTintFits(draft, id, form.fits);
    if (form.texts && JSON.stringify(form.texts) !== this.initialTexts)
      draft = setTintTexts(draft, id, parseTexts(form.texts));
    this.changed.emit(draft);
    this.close();
  }

  protected confirmDelete(id: string): void {
    confirmWhileBusy(this.confirmation, this.confirming, {
      header: this.language.t('packs.creator.tints.deleteTitle'),
      message: this.language.t('packs.creator.tints.deleteMessage', { id }),
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
      accept: () => this.remove(id),
    });
  }

  private remove(id: string): void {
    if (this.selectedId() === id) this.close();
    this.changed.emit(removeTint(this.draft(), id));
  }
}
