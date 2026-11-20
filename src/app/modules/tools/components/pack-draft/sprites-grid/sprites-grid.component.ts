import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DrawerDismissDirective, confirmWhileBusy } from '../drawer-dismiss';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
import { SelectModule } from '@openng/optimus-ui/select';
import { TagModule } from '@openng/optimus-ui/tag';
import { LanguageBusiness } from '../../../../../core/business/language.business';
import {
  DraftIssue,
  KnownKeys,
  PackDraftFormBusiness,
} from '../../../../../core/business/pack-draft-form.business';
import { kindOptions } from '../../../../../core/packs/kind-label';
import { SPRITE_KINDS, SpriteKind } from '../../../../../core/packs/pack';
import { DraftSprite, PackDraft } from '../../../../../core/packs/pack-draft';
import { ChipListComponent } from '../chip-list/chip-list.component';

/** Sprites shown per page. */
const PER_PAGE = 12;

interface SpriteForm {
  id: string;
  label: string;
  domain: 'items' | 'npcs';
  kinds: string[];
  kind: SpriteKind;
}

/** The sprites of the pack as a grid of thumbnails, with a drawer for the detail and the form of one sprite. */
@Component({
  selector: 'app-sprites-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DrawerDismissDirective,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    MultiSelectModule,
    PaginatorModule,
    SelectModule,
    TagModule,
    ChipListComponent,
  ],
  template: `
    @if (filterOptions().length > 1) {
      <div class="toolbar">
        <p-select
          data-test="sprite-filter"
          optionLabel="label"
          optionValue="value"
          [showClear]="true"
          [options]="filterOptions()"
          [ngModel]="filter()"
          (onChange)="setFilter($event.value ?? null)"
          [placeholder]="'packs.creator.sprites.filterAll' | translate"
          [ariaLabel]="'packs.creator.sprites.filter' | translate"
        />
      </div>
    }
    @if (shown().length > perPage) {
      <p-paginator
        [rows]="perPage"
        [first]="firstShown()"
        [totalRecords]="shown().length"
        (onPageChange)="first.set($event.first ?? 0)"
      />
    }
    <div class="grid">
      @for (entry of pageEntries(); track entry.index) {
        <div
          class="card"
          role="button"
          tabindex="0"
          [attr.data-test]="'sprite-card-' + entry.sprite.id"
          (click)="show(entry.index)"
          (keydown.enter)="show(entry.index)"
        >
          <img
            data-test="sprite-image"
            [src]="preview(entry.sprite.image)"
            alt=""
            width="64"
            height="64"
          />
          <span class="name" data-test="sprite-name">{{
            entry.sprite.label
          }}</span>
          <p-tag
            data-test="sprite-kind-tag"
            severity="secondary"
            [value]="kindName(entry.sprite.kind)"
          />
          @if (duplicateId(entry.sprite.id)) {
            <small class="error" data-test="sprite-duplicate-id">{{
              'packs.creator.duplicateId' | translate
            }}</small>
          }
        </div>
      } @empty {
        <p class="hint">{{ 'packs.creator.noSprites' | translate }}</p>
      }
    </div>

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
      @if (panel() === 'detail' && selected(); as sprite) {
        <div class="detail" data-test="sprite-detail">
          <section data-test="section-identity">
            <h4 data-test="section-title">
              {{ 'packs.creator.kinds.sectionIdentity' | translate }}
            </h4>
            <img
              class="big"
              [src]="preview(sprite.image)"
              alt=""
              width="128"
              height="128"
            />
            <dl>
              <dt>{{ 'packs.creator.spriteId' | translate }}</dt>
              <dd>{{ sprite.id }}</dd>
              <dt>{{ 'packs.creator.label' | translate }}</dt>
              <dd>{{ sprite.label }}</dd>
            </dl>
          </section>
          <section data-test="section-generation">
            <h4 data-test="section-title">
              {{ 'packs.creator.kinds.sectionGeneration' | translate }}
            </h4>
            <dl>
              <dt>{{ 'packs.creator.spriteDomain' | translate }}</dt>
              <dd>{{ domainName(sprite.domain ?? 'items') }}</dd>
              <dt>{{ 'packs.creator.spriteKinds' | translate }}</dt>
              <dd><app-chip-list [names]="sprite.kinds" /></dd>
              <dt>{{ 'packs.creator.spriteKind' | translate }}</dt>
              <dd>{{ kindName(sprite.kind) }}</dd>
            </dl>
          </section>
        </div>
      }
      @if (panel() === 'form' && form(); as f) {
        <div class="detail" data-test="sprite-form">
          <section data-test="section-identity">
            <h4 data-test="section-title">
              {{ 'packs.creator.kinds.sectionIdentity' | translate }}
            </h4>
            <div class="field">
              <label for="sprite-id-input">{{
                'packs.creator.spriteId' | translate
              }}</label>
              <input
                pInputText
                id="sprite-id-input"
                data-test="sprite-id"
                type="text"
                [ngModel]="f.id"
                (ngModelChange)="patch({ id: $event ?? '' })"
              />
              @if (formDuplicate()) {
                <small class="error">{{
                  'packs.creator.duplicateId' | translate
                }}</small>
              }
            </div>
            <div class="field">
              <label for="sprite-label-input">{{
                'packs.creator.label' | translate
              }}</label>
              <input
                pInputText
                id="sprite-label-input"
                data-test="sprite-label"
                type="text"
                [ngModel]="f.label"
                (ngModelChange)="patch({ label: $event ?? '' })"
              />
            </div>
          </section>
          <section data-test="section-generation">
            <h4 data-test="section-title">
              {{ 'packs.creator.kinds.sectionGeneration' | translate }}
            </h4>
            <div class="field">
              <label>{{ 'packs.creator.spriteDomain' | translate }}</label>
              <p-select
                data-test="sprite-domain"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
                [options]="domainOptions()"
                [ngModel]="f.domain"
                (ngModelChange)="patch({ domain: $event, kinds: [] })"
              />
            </div>
            <div class="field">
              <label>{{ 'packs.creator.spriteKinds' | translate }}</label>
              <p-multiselect
                data-test="sprite-kinds"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
                [options]="spriteKindOptions()"
                [ngModel]="f.kinds"
                (ngModelChange)="patch({ kinds: $event ?? [] })"
                [showToggleAll]="false"
                [filter]="true"
              />
            </div>
            <div class="field">
              <label>{{ 'packs.creator.spriteKind' | translate }}</label>
              <p-select
                data-test="sprite-kind"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
                [options]="colouringOptions()"
                [ngModel]="f.kind"
                (ngModelChange)="patch({ kind: $event })"
              />
            </div>
          </section>
        </div>
      }
      <ng-template #footer>
        <div class="buttons">
          @if (panel() === 'detail' && selected(); as sprite) {
            <p-button
              data-test="detail-edit"
              icon="pi pi-pencil"
              [label]="'packs.creator.kinds.edit' | translate"
              (onClick)="edit()"
            />
            @if (sprite.kind !== 'colored') {
              <p-button
                data-test="detail-colorizer"
                icon="pi pi-palette"
                severity="secondary"
                outlined
                [label]="'packs.creator.editInColorizer' | translate"
                (onClick)="colorize.emit(sprite.id)"
              />
            }
            <p-button
              data-test="detail-delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              [label]="'packs.creator.kinds.deleteAccept' | translate"
              (onClick)="confirmDelete()"
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
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem;
      min-width: 0;
      cursor: pointer;
      text-align: center;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius, 0.5rem);
    }
    .card:hover,
    .card:focus-visible {
      border-color: var(--p-primary-color);
    }
    .card img,
    .big {
      object-fit: contain;
      image-rendering: pixelated;
    }
    .name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 40rem) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
    .detail {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--p-content-border-color);
    }
    h4 {
      margin: 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--p-text-muted-color);
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 1rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
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
export class SpritesGridComponent {
  readonly draft = input.required<PackDraft>();
  readonly issues = input<DraftIssue[]>([]);
  readonly changed = output<PackDraft>();
  /** The sprite to open in the colorizer. */
  readonly colorize = output<string>();

  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly confirming = signal(false);
  private readonly business = inject(PackDraftFormBusiness);

  protected readonly perPage = PER_PAGE;
  protected readonly filter = signal<SpriteKind | null>(null);
  protected readonly first = signal(0);
  protected readonly panel = signal<'detail' | 'form' | null>(null);
  /** Index in the draft of the sprite shown in the drawer. */
  private readonly selectedIndex = signal<number | null>(null);
  protected readonly form = signal<SpriteForm | null>(null);
  private readonly known = signal<KnownKeys['kinds']>([]);
  private readonly knownNpcs = signal<KnownKeys['kinds']>([]);
  private initial = '';
  private loads = 0;
  private count = -1;
  private readonly previews = new Map<Blob, string>();

  protected readonly selected = computed(() => {
    const index = this.selectedIndex();
    return index === null ? null : (this.draft().sprites[index] ?? null);
  });

  /** The sprites left by the filter, with their index in the draft. */
  protected readonly shown = computed(() =>
    this.draft()
      .sprites.map((sprite, index) => ({ sprite, index }))
      .filter((entry) => !this.filter() || entry.sprite.kind === this.filter()),
  );
  protected readonly firstShown = computed(() => {
    const last = Math.max(0, Math.ceil(this.shown().length / PER_PAGE) - 1);
    return Math.min(this.first(), last * PER_PAGE);
  });
  protected readonly pageEntries = computed(() =>
    this.shown().slice(this.firstShown(), this.firstShown() + PER_PAGE),
  );

  /** The colouring kinds in use, to filter on; none to pick from when there is only one. */
  protected readonly filterOptions = computed(() => {
    const used = new Set(this.draft().sprites.map((s) => s.kind));
    return SPRITE_KINDS.filter((kind) => used.has(kind)).map((value) => ({
      value,
      label: this.kindName(value),
    }));
  });

  /** The kinds of the form's domain: the items tree, or the NPC tree. */
  protected readonly spriteKindOptions = computed(() => {
    const domain = this.form()?.domain ?? 'items';
    return kindOptions(domain === 'npcs' ? this.knownNpcs() : this.known(), [
      ...this.draft()
        .sprites.filter((s) => (s.domain ?? 'items') === domain)
        .flatMap((s) => s.kinds),
      ...(this.form()?.kinds ?? []),
    ]);
  });

  protected readonly domainOptions = computed(() =>
    (['items', 'npcs'] as const).map((value) => ({
      value,
      label: this.domainName(value),
    })),
  );

  protected readonly colouringOptions = computed(() => {
    const sprite = this.selected();
    return SPRITE_KINDS.filter(
      (kind) => kind !== 'masked' || sprite?.materials !== undefined,
    ).map((value) => ({ value, label: this.kindName(value) }));
  });

  protected readonly title = computed(() =>
    this.panel() === 'detail'
      ? 'packs.creator.sprites.detailTitle'
      : 'packs.creator.sprites.editTitle',
  );

  protected readonly formDuplicate = computed(() => {
    const form = this.form();
    const index = this.selectedIndex();
    if (!form || index === null) return false;
    return this.draft().sprites.some(
      (s, i) => i !== index && s.id === form.id.trim(),
    );
  });

  protected readonly canSave = computed(() => {
    const form = this.form();
    return !!form && !!form.id.trim() && !this.formDuplicate();
  });

  constructor() {
    effect(() => {
      const draft = this.draft();
      const load = ++this.loads;
      void this.business.knownKeys(draft).then(
        (keys) => {
          if (load !== this.loads) return;
          this.known.set(keys.kinds);
          this.knownNpcs.set(keys.domainKinds.npcs);
        },
        () => undefined,
      );
    });
    // A sprite was added: show it, on the last page.
    effect(() => {
      const count = this.draft().sprites.length;
      const before = untracked(() => this.count);
      this.count = count;
      if (before >= 0 && count > before) {
        this.filter.set(null);
        this.first.set(Math.floor((count - 1) / PER_PAGE) * PER_PAGE);
      }
    });
    // The selected sprite went away: nothing left to show.
    effect(() => {
      const index = this.selectedIndex();
      if (index !== null && !this.draft().sprites[index]) this.close();
    });
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.previews.values()) URL.revokeObjectURL(url);
      this.previews.clear();
    });
  }

  protected preview(image: Blob): string {
    let url = this.previews.get(image);
    if (!url) {
      url = URL.createObjectURL(image);
      this.previews.set(image, url);
    }
    return url;
  }

  protected kindName(kind: SpriteKind): string {
    return this.language.t(`sprite.kind.${kind}`);
  }

  protected duplicateId(id: string): boolean {
    return this.draft().sprites.filter((s) => s.id === id).length > 1;
  }

  protected setFilter(kind: SpriteKind | null): void {
    this.filter.set(kind);
    this.first.set(0);
  }

  protected domainName(domain: 'items' | 'npcs'): string {
    return this.language.t(`packs.creator.spriteDomains.${domain}`);
  }

  protected patch(change: Partial<SpriteForm>): void {
    this.form.update((form) => (form ? { ...form, ...change } : form));
  }

  // --- the drawer -------------------------------------------------------------------------------------------

  protected show(index: number): void {
    this.selectedIndex.set(index);
    this.form.set(null);
    this.panel.set('detail');
  }

  protected edit(): void {
    const sprite = this.selected();
    if (!sprite) return;
    const form: SpriteForm = {
      id: sprite.id,
      label: sprite.label,
      domain: sprite.domain ?? 'items',
      kinds: [...sprite.kinds],
      kind: sprite.kind,
    };
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
    this.selectedIndex.set(null);
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
      header: this.language.t('packs.creator.sprites.discardTitle'),
      message: this.language.t('packs.creator.sprites.discardMessage'),
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

  protected save(): void {
    const form = this.form();
    const index = this.selectedIndex();
    if (!form || index === null || !this.canSave()) return;
    const patch: Partial<DraftSprite> = {
      id: form.id.trim(),
      label: form.label,
      domain: form.domain,
      kinds: form.kinds,
      kind: form.kind,
    };
    const draft = this.draft();
    this.changed.emit({
      ...draft,
      sprites: draft.sprites.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    });
    this.close();
  }

  protected confirmDelete(): void {
    const sprite = this.selected();
    const index = this.selectedIndex();
    if (!sprite || index === null) return;
    confirmWhileBusy(this.confirmation, this.confirming, {
      header: this.language.t('packs.creator.sprites.deleteTitle'),
      message: this.language.t('packs.creator.sprites.deleteMessage', {
        id: sprite.id,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: this.language.t('packs.creator.kinds.deleteAccept'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('packs.creator.kinds.deleteReject'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        const draft = this.draft();
        this.changed.emit({
          ...draft,
          sprites: draft.sprites.filter((_, i) => i !== index),
        });
        this.close();
      },
    });
  }
}
