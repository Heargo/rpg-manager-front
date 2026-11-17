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
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService, TreeNode } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { MessageModule } from '@openng/optimus-ui/message';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { TreeTableModule } from '@openng/optimus-ui/treetable';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import {
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { KindKey, kindLabel } from '../../../../../core/packs/kind-label';
import { PackDraft } from '../../../../../core/packs/pack-draft';
import {
  domainKindsOf,
  domainKindTextsOf,
  kindTextsOf,
  removeDomainKind,
  removeKind,
  renameDomainKind,
  renameKind,
  setDomainKind,
  setKind,
  StructuredDomain,
  withDescendants,
} from '../../../../../core/packs/pack-draft-edits';
import { KIND_ID } from '../../../../../core/packs/pack-kinds';
import { ChipListComponent } from '../chip-list/chip-list.component';
import { KindDetailComponent } from './kind-detail.component';
import {
  Domain,
  Drawn,
  FIELDS,
  FIELD_LABEL,
  Fields,
  FormError,
  KindForm,
  Row,
  displayField,
} from './kind-fields';
import { KindFormComponent } from './kind-form.component';
import { emptyTexts, readTexts, writeTexts } from './kind-texts';

/** The kinds of one domain as a tree table, with a drawer for the detail and the form of a kind. */
@Component({
  selector: 'app-kinds-tree-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    MessageModule,
    TagModule,
    TooltipModule,
    TreeTableModule,
    ChipListComponent,
    KindDetailComponent,
    KindFormComponent,
  ],
  template: `
    <div class="toolbar">
      <p-button
        data-test="add-kind"
        icon="pi pi-plus"
        severity="secondary"
        [label]="'packs.creator.kinds.add' | translate"
        (onClick)="add(null)"
      />
    </div>
    <p-treetable
      [value]="nodes()"
      (onNodeExpand)="setExpanded($event.node, true)"
      (onNodeCollapse)="setExpanded($event.node, false)"
      [tableStyle]="{ 'min-width': '100%', 'table-layout': 'fixed' }"
    >
      <ng-template #header>
        <tr>
          <th class="label-col">
            {{ 'packs.creator.kinds.label' | translate }}
          </th>
          <th class="extra">{{ 'packs.creator.kinds.id' | translate }}</th>
          @for (field of fields(); track field) {
            <th class="extra">{{ fieldLabel(field) | translate }}</th>
          }
          @if (domain() === 'items') {
            <th class="tag-cell tag-col"></th>
          }
        </tr>
      </ng-template>
      <ng-template #body let-rowNode let-row="rowData">
        <tr
          [ttRow]="rowNode"
          class="kind-row"
          [class.kind-parent]="hasChildren(rowNode)"
          [attr.data-kind-parent]="hasChildren(rowNode) ? 'true' : null"
          [attr.data-test]="'kind-row-' + row.id"
          (click)="show(row.id)"
        >
          <td>
            <div class="label-cell">
              <span class="toggler" (click)="$event.stopPropagation()">
                <p-treeTableToggler [rowNode]="rowNode" />
              </span>
              <span data-test="cell-label">{{ row.label }}</span>
            </div>
            @for (issue of issuesOf(row.id); track $index) {
              <p-message
                data-test="issue"
                size="small"
                [severity]="issue.level === 'error' ? 'error' : 'warn'"
                >{{ issue.message }}</p-message
              >
            }
          </td>
          <td class="extra" data-test="cell-id">{{ row.id }}</td>
          @for (field of fields(); track field) {
            <td class="extra" [attr.data-test]="'cell-' + field">
              @if (domain() === 'classes' && field === 'skills') {
                <app-chip-list [names]="skillNames(row.fields[field])" />
              } @else {
                {{ display(field, row.fields[field]) }}
              }
            </td>
          }
          @if (domain() === 'items') {
            <td class="tag-cell">
              @if (uncovered().includes(row.id)) {
                <p-tag
                  [attr.data-test]="'missing-sprite-' + row.id"
                  severity="warn"
                  icon="pi pi-image"
                  [value]="'packs.creator.kinds.noSprite' | translate"
                  [pTooltip]="'packs.creator.kinds.noSpriteHint' | translate"
                  [attr.aria-label]="
                    'packs.creator.kinds.noSpriteHint' | translate
                  "
                />
              }
            </td>
          }
        </tr>
      </ng-template>
      <ng-template #emptymessage>
        <tr>
          <td [attr.colspan]="fields().length + 3">
            {{ 'packs.creator.kinds.empty' | translate }}
          </td>
        </tr>
      </ng-template>
    </p-treetable>
    @if (uncovered().length) {
      <p-message data-test="coverage" severity="info" size="small">{{
        'packs.creator.kinds.uncovered'
          | translate: { kinds: uncovered().join(', ') }
      }}</p-message>
    }

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
      @if (panel() === 'detail' && selected(); as kind) {
        <app-kind-detail
          [kind]="kind"
          [draft]="draft()"
          [domain]="domain()"
          [parent]="parentOf(kind.id)"
          [issues]="issuesOf(kind.id)"
          [uncovered]="uncovered().includes(kind.id)"
          [drawn]="drawn()"
          (preview)="preview()"
        />
      }
      @if (panel() === 'form' && form(); as f) {
        <app-kind-form
          [form]="f"
          [domain]="domain()"
          [error]="formError()"
          [candidates]="candidates()"
          [skillOptions]="skillOptions()"
          [drawn]="drawn()"
          (formChange)="form.set($event)"
          (preview)="preview()"
        />
      }
      <ng-template #footer>
        <div class="buttons">
          @if (panel() === 'detail' && selected(); as kind) {
            <p-button
              data-test="detail-edit"
              icon="pi pi-pencil"
              [label]="'packs.creator.kinds.edit' | translate"
              (onClick)="edit(kind.id)"
            />
            <p-button
              data-test="detail-add-child"
              icon="pi pi-plus"
              severity="secondary"
              [label]="'packs.creator.kinds.addChild' | translate"
              (onClick)="add(kind.id)"
            />
            <p-button
              data-test="detail-delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              [label]="'packs.creator.kinds.deleteAccept' | translate"
              (onClick)="confirmDelete(kind.id)"
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
    .kind-row {
      cursor: pointer;
    }
    .kind-parent > td {
      background: var(--p-content-hover-background);
    }
    td {
      overflow-wrap: break-word;
    }
    th {
      hyphens: auto;
    }
    @media (max-width: 40rem) {
      .extra {
        display: none;
      }
    }
    .tag-cell {
      text-align: right;
      white-space: nowrap;
      padding-inline-end: 1rem;
    }
    .label-cell {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.25rem;
    }
    .label-cell [data-test='cell-label'] {
      min-width: 0;
    }
    .label-col {
      width: 35%;
    }
    .tag-col {
      width: 9.5rem;
    }
    @media (max-width: 40rem) {
      .label-col {
        width: auto;
      }
      .tag-col {
        width: 3.5rem;
      }
      .tag-cell ::ng-deep .p-tag-label {
        display: none;
      }
    }
    .toggler {
      flex: none;
      display: inline-flex;
      align-items: center;
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
export class KindsTreeTableComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly domain = input.required<Domain>();
  readonly changed = output<PackDraft>();

  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  private readonly business = inject(PackDraftFormBusiness);

  protected readonly panel = signal<'detail' | 'form' | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly form = signal<KindForm | null>(null);
  protected readonly drawn = signal<Drawn[] | null>(null);
  protected readonly uncovered = signal<string[]>([]);
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());
  private readonly known = signal<KnownKeys | null>(null);
  private initial = '';
  private initialTexts = '';
  private loads = 0;

  protected readonly fields = computed(() => FIELDS[this.domain()]);
  private readonly neutral = computed(
    () => this.draft().details.language === undefined,
  );

  private readonly kinds = computed<Record<string, Fields>>(() => {
    const domain = this.domain();
    if (domain === 'items') return this.draft().kinds as Record<string, Fields>;
    return domainKindsOf(this.draft(), domain);
  });

  private readonly rows = computed<Row[]>(() =>
    Object.entries(this.kinds()).map(([id, kind]) => ({
      id,
      label: this.labelFor(id),
      fields: kind,
    })),
  );

  protected readonly nodes = computed<TreeNode<Row>[]>(() => {
    const rows = this.rows();
    const ids = new Set(rows.map((row) => row.id));
    const childrenOf = (parent: string | undefined): TreeNode<Row>[] =>
      rows
        .filter((row) => {
          const own = row.fields['parent'] as string | undefined;
          return parent === undefined ? !own || !ids.has(own) : own === parent;
        })
        .map((row) => {
          const children = childrenOf(row.id);
          return {
            key: row.id,
            data: row,
            expanded: !this.collapsed().has(row.id),
            children,
            leaf: children.length === 0,
          };
        });
    return childrenOf(undefined);
  });

  protected readonly selected = computed(
    () => this.rows().find((row) => row.id === this.selectedId()) ?? null,
  );

  protected readonly title = computed(() => {
    if (this.panel() === 'detail') return 'packs.creator.kinds.detailTitle';
    return this.form()?.original === null
      ? 'packs.creator.kinds.newTitle'
      : 'packs.creator.kinds.editTitle';
  });

  /** The kind being edited and its descendants, which cannot be its parent. */
  private readonly excluded = computed(() => {
    const original = this.form()?.original;
    return original
      ? withDescendants(this.kinds(), original)
      : new Set<string>();
  });

  protected readonly formError = computed<FormError>(() => {
    const form = this.form();
    if (!form) return null;
    const id = form.id.trim();
    if (!KIND_ID.test(id)) return id ? 'kebab' : null;
    if (id !== form.original && id in this.kinds()) return 'duplicate';
    const parent = form.parent.trim();
    if (parent && (parent === id || this.excluded().has(parent)))
      return 'parent';
    return null;
  });

  protected readonly canSave = computed(
    () =>
      KIND_ID.test(this.form()?.id.trim() ?? '') && this.formError() === null,
  );

  private readonly kindKeys = computed<KindKey[]>(() => {
    const known = this.known();
    if (!known) return [];
    const domain = this.domain();
    if (domain === 'items') return known.kinds;
    return known.domainKinds[domain];
  });

  protected readonly candidates = computed(() =>
    this.kindKeys().filter((kind) => !this.excluded().has(kind.id)),
  );

  private readonly skillLabels = computed(() => {
    const labels = new Map<string, string>();
    for (const key of this.known()?.domainKinds.skills ?? [])
      if (key.noun) labels.set(key.id, key.noun);
    for (const id of Object.keys(domainKindsOf(this.draft(), 'skills'))) {
      const noun = domainKindTextsOf(this.draft(), 'skills', id).nouns[0]?.text;
      if (noun) labels.set(id, noun);
    }
    return labels;
  });

  protected readonly skillOptions = computed(() => {
    const keys = [...(this.known()?.domainKinds.skills ?? [])];
    for (const id of Object.keys(domainKindsOf(this.draft(), 'skills')))
      if (!keys.some((key) => key.id === id)) keys.push({ id });
    return keys.map((key) => ({ value: key.id, label: kindLabel(key) }));
  });

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.business
        .knownKeys(draft)
        .then((known) => load === this.loads && this.known.set(known));
      if (this.domain() === 'items')
        void this.business
          .coverage(draft)
          .then(
            (missing) => load === this.loads && this.uncovered.set(missing),
          );
    });
    // The selected kind went away (with a removed ancestor, for one): nothing left to show.
    effect(() => {
      const id = this.selectedId();
      if (id && !(id in this.kinds())) this.close();
    });
  }

  protected fieldLabel(field: string): string {
    return FIELD_LABEL[field];
  }

  protected setExpanded(node: TreeNode<Row>, expanded: boolean): void {
    const id = node.key;
    if (!id) return;
    this.collapsed.update((all) => {
      const next = new Set(all);
      if (expanded) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected hasChildren(rowNode: { node: TreeNode }): boolean {
    return (rowNode.node.children?.length ?? 0) > 0;
  }

  protected issuesOf(id: string): DraftIssue[] {
    const domain = this.domain();
    return this.issues().filter(
      (issue) =>
        issue.kind === id &&
        (domain === 'items'
          ? issue.domain === undefined
          : issue.domain === domain),
    );
  }

  /** The labels of the skill kinds a class favours: the noun when there is one, else the id. */
  protected skillNames(skills: unknown): string[] {
    const labels = this.skillLabels();
    return Array.isArray(skills)
      ? skills.map((id: string) => labels.get(id) ?? id)
      : [];
  }

  protected parentOf(id: string): string {
    return (this.kinds()[id]?.['parent'] as string | undefined) ?? '';
  }

  protected display(field: string, value: unknown): string {
    return displayField(
      (key) => this.language.t(key),
      this.domain(),
      field,
      value,
    );
  }

  /** The first noun of the kind, or its id spelled out. */
  private labelFor(id: string): string {
    const domain = this.domain();
    const noun = (
      domain === 'items'
        ? kindTextsOf(this.draft(), id)
        : domainKindTextsOf(this.draft(), domain, id)
    ).nouns[0]?.text;
    if (noun) return noun;
    const spaced = id.replace(/-/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  // --- the drawer -------------------------------------------------------------------------------------------

  protected show(id: string): void {
    this.selectedId.set(id);
    this.form.set(null);
    this.drawn.set(null);
    this.panel.set('detail');
  }

  protected edit(id: string): void {
    const { parent, ...fields } = this.kinds()[id] ?? {};
    this.openForm({
      original: id,
      id,
      parent: (parent as string | undefined) ?? '',
      fields,
      texts: this.neutral() ? null : readTexts(this.draft(), this.domain(), id),
    });
  }

  protected add(parent: string | null): void {
    this.openForm({
      original: null,
      id: '',
      parent: parent ?? '',
      fields: {},
      texts: this.neutral() ? null : emptyTexts(),
    });
  }

  private openForm(form: KindForm): void {
    this.selectedId.set(form.original);
    this.initial = JSON.stringify(form);
    this.initialTexts = JSON.stringify(form.texts);
    this.drawn.set(null);
    this.form.set(form);
    this.panel.set('form');
  }

  private dirty(): boolean {
    return (
      this.panel() === 'form' && JSON.stringify(this.form()) !== this.initial
    );
  }

  private close(): void {
    this.drawn.set(null);
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
      header: this.language.t('packs.creator.kinds.discardTitle'),
      message: this.language.t('packs.creator.kinds.discardMessage'),
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

  /** The draft with the form applied: the kind (renamed if its id changed), its fields and, if edited, its texts. */
  private applied(form: KindForm): PackDraft {
    const id = form.id.trim();
    const parent = form.parent.trim() || undefined;
    const domain = this.domain();
    const patch: Fields = { parent };
    for (const field of [
      ...FIELDS[domain],
      ...(domain === 'npcs' ? ['person'] : []),
    ])
      patch[field] = form.fields[field];
    // A child inherits the fields only a root may carry.
    if (parent) {
      patch['type'] = undefined;
      patch['person'] = undefined;
    }
    let draft = this.draft();
    if (form.original && form.original !== id)
      draft =
        domain === 'items'
          ? renameKind(draft, form.original, id)
          : renameDomainKind(draft, domain, form.original, id);
    draft =
      domain === 'items'
        ? setKind(draft, id, patch)
        : setDomainKind(draft, domain, id, patch);
    if (form.texts && JSON.stringify(form.texts) !== this.initialTexts)
      draft = writeTexts(draft, domain, id, form.texts);
    return draft;
  }

  protected save(): void {
    const form = this.form();
    if (!form || !this.canSave()) return;
    this.changed.emit(this.applied(form));
    this.close();
  }

  /** Draws a few trial entries of the kind, with the form's pending texts when the form is open. */
  protected async preview(): Promise<void> {
    const form = this.form();
    const editing = this.panel() === 'form';
    const id = editing ? form?.id.trim() : this.selectedId();
    if (!id || (editing && (!form || !this.canSave()))) return;
    const draft = editing ? this.applied(form!) : this.draft();
    const domain = this.domain();
    const entries: Drawn[] =
      domain === 'items'
        ? await this.business.preview(draft, id)
        : await this.business.previewDomain(draft, domain, id);
    this.drawn.set(entries);
  }

  protected confirmDelete(id: string): void {
    this.confirmation.confirm({
      header: this.language.t('packs.creator.kinds.deleteTitle'),
      message: this.language.t('packs.creator.kinds.deleteMessage', { id }),
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
    const domain = this.domain();
    if (this.selectedId() === id) this.close();
    this.changed.emit(
      domain === 'items'
        ? removeKind(this.draft(), id)
        : removeDomainKind(this.draft(), domain, id),
    );
  }
}
