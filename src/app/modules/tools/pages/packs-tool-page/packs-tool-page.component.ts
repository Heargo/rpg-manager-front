import { SpriteLabelBusiness } from '../../../../core/business/sprite-label.business';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PendingTasks,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import {
  BundledSprite,
  InstalledPack,
  PackBusiness,
  PackUpdate,
  PreparedPack,
} from '../../../../core/business/pack.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { SUPPORTED_LANGUAGES } from '../../../../core/constants/languages';
import {
  PACK_GENERATORS,
  SPRITE_KINDS,
  SpriteKind,
} from '../../../../core/packs/pack';
import { PackRegistryEntry } from '../../../../core/packs/pack-registry';
import { MessageLevel } from '../../../../core/models/toast-level';

/** Human size: bytes, kB or MB. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

@Component({
  selector: 'app-packs-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule,
  ],
  template: `
    <div class="main-container packs">
      <header>
        <h1>{{ 'packs.title' | translate }}</h1>
        <p class="hint">{{ 'packs.intro' | translate }}</p>
        <div class="header-actions">
          <p-button
            icon="pi pi-plus"
            [label]="'packs.add' | translate"
            (onClick)="openAdd()"
          />
          <p-button
            severity="secondary"
            icon="pi pi-pencil"
            [label]="'packs.creator.create' | translate"
            (onClick)="openCreator()"
          />
        </div>
      </header>
      @if (registry().length) {
        <section>
          <h2 class="section-title">{{ 'packs.officialTitle' | translate }}</h2>
          <ul class="grid">
            @for (entry of registry(); track entry.id) {
              <li data-test="pack-card" [attr.data-pack]="entry.id">
                <p-card>
                  <h3
                    class="name line-clamp-2"
                    data-test="pack-name"
                    [pTooltip]="entry.name"
                  >
                    {{ entry.name }}
                  </h3>
                  <div class="tags" data-test="pack-tags">
                    @if (entry.language) {
                      <p-tag
                        data-test="pack-language"
                        severity="secondary"
                        [value]="languageName(entry.language)"
                      />
                    }
                    @if (entry.builtIn) {
                      <p-tag
                        severity="info"
                        [value]="'packs.alwaysOn' | translate"
                      />
                    } @else {
                      @if (isDownloaded(entry.id)) {
                        <p-tag
                          severity="success"
                          [value]="'packs.downloaded' | translate"
                        />
                      }
                      @if (busy().has(entry.id)) {
                        <p-progressspinner
                          strokeWidth="6"
                          [style]="{ width: '1.5rem', height: '1.5rem' }"
                          [ariaLabel]="'packs.downloading' | translate"
                        />
                      }
                    }
                  </div>
                  <p class="desc line-clamp-3" data-test="pack-desc">
                    {{ entry.description }}
                  </p>
                  <div class="meta" data-test="pack-meta">
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.author' | translate"
                      ><i class="pi pi-user"></i>{{ entry.author }}</span
                    >
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.license' | translate"
                      ><i class="pi pi-shield"></i
                      ><a
                        [href]="entry.licenseUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ entry.license }}</a
                      ></span
                    >
                    @if (!entry.builtIn) {
                      <span
                        data-test="pack-meta-item"
                        [title]="'packs.size' | translate"
                        ><i class="pi pi-database"></i
                        >{{ size(entry.size) }}</span
                      >
                    }
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.detailsSprites' | translate"
                      ><i class="pi pi-images"></i>{{ entry.sprites }}</span
                    >
                  </div>
                  <ng-template #footer>
                    <div class="actions">
                      @if (isInstalled(entry.id)) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-info-circle"
                          [label]="'packs.details' | translate"
                          (onClick)="openDetails(entry)"
                        />
                        <p-button
                          severity="secondary"
                          icon="pi pi-copy"
                          [label]="'packs.duplicate' | translate"
                          [loading]="busy().has(entry.id)"
                          [disabled]="busy().has(entry.id)"
                          (onClick)="duplicate(entry.id)"
                        />
                      }
                      @if (!entry.builtIn && !isDownloaded(entry.id)) {
                        <p-button
                          icon="pi pi-download"
                          [label]="'packs.download' | translate"
                          [disabled]="busy().has(entry.id)"
                          (onClick)="download(entry)"
                        />
                      }
                      @if (isDownloaded(entry.id)) {
                        <p-button
                          severity="danger"
                          variant="text"
                          icon="pi pi-trash"
                          [label]="'packs.remove' | translate"
                          [disabled]="busy().has(entry.id)"
                          (onClick)="confirmRemove(entry.id, entry.name)"
                        />
                      }
                    </div>
                  </ng-template>
                </p-card>
              </li>
            }
          </ul>
        </section>
      }
      @if (unofficial().length) {
        <section>
          <h2 class="section-title">
            {{ 'packs.unofficialTitle' | translate }}
          </h2>
          <ul class="grid">
            @for (pack of unofficial(); track pack.id) {
              <li data-test="unofficial-pack-card" [attr.data-pack]="pack.id">
                <p-card>
                  <h3
                    class="name line-clamp-2"
                    data-test="pack-name"
                    [pTooltip]="pack.name"
                  >
                    {{ pack.name }}
                  </h3>
                  <div class="tags" data-test="pack-tags">
                    <p-tag
                      data-test="pack-language"
                      severity="secondary"
                      [value]="languageName(pack.language)"
                    />
                    @if (!pack.link) {
                      <p-tag
                        severity="secondary"
                        [value]="'packs.createdHere' | translate"
                      />
                    }
                    @if (busy().has(pack.id)) {
                      <p-progressspinner
                        strokeWidth="6"
                        [style]="{ width: '1.5rem', height: '1.5rem' }"
                        [ariaLabel]="'packs.downloading' | translate"
                      />
                    }
                  </div>
                  <p class="desc line-clamp-3" data-test="pack-desc">
                    {{ pack.description }}
                  </p>
                  <div class="meta" data-test="pack-meta">
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.author' | translate"
                      ><i class="pi pi-user"></i>{{ pack.author }}</span
                    >
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.license' | translate"
                      ><i class="pi pi-shield"></i
                      ><a
                        [href]="pack.licenseUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ pack.license }}</a
                      ></span
                    >
                    <span
                      data-test="pack-meta-item"
                      [title]="'packs.version' | translate"
                      ><i class="pi pi-tag"></i>{{ pack.version }}</span
                    >
                    @if (pack.link) {
                      <span
                        data-test="pack-meta-item"
                        [title]="'packs.source' | translate"
                        ><i class="pi pi-link"></i
                        ><a
                          [href]="pack.link"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ pack.link }}</a
                        ></span
                      >
                    }
                  </div>
                  <ng-template #footer>
                    <div class="actions">
                      @if (pack.link) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-refresh"
                          [label]="'packs.update' | translate"
                          [disabled]="busy().has(pack.id)"
                          (onClick)="checkUpdate(pack)"
                        />
                      }
                      <p-button
                        severity="secondary"
                        icon="pi pi-copy"
                        [label]="'packs.duplicate' | translate"
                        [loading]="busy().has(pack.id)"
                        [disabled]="busy().has(pack.id)"
                        (onClick)="duplicate(pack.id)"
                      />
                      @if (!pack.link) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-pencil"
                          [label]="'packs.editAsDraft' | translate"
                          [disabled]="busy().has(pack.id)"
                          (onClick)="editAsDraft(pack)"
                        />
                      }
                      <p-button
                        severity="danger"
                        variant="text"
                        icon="pi pi-trash"
                        [label]="'packs.remove' | translate"
                        [disabled]="busy().has(pack.id)"
                        (onClick)="confirmRemove(pack.id, pack.name)"
                      />
                    </div>
                  </ng-template>
                </p-card>
              </li>
            }
          </ul>
        </section>
      }
    </div>
    <p-dialog
      [header]="'packs.add' | translate"
      [visible]="addOpen()"
      (visibleChange)="!$event && closeAdd()"
      [modal]="true"
      [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      <div class="add-link">
        <input
          pInputText
          data-test="pack-link"
          type="text"
          [ngModel]="link()"
          (ngModelChange)="link.set($event)"
          [placeholder]="'packs.linkPlaceholder' | translate"
          [attr.aria-label]="'packs.linkLabel' | translate"
        />
        <p-button
          [label]="'packs.check' | translate"
          [loading]="checking()"
          (onClick)="check()"
        />
      </div>
      @if (errors().length) {
        <ul data-test="pack-errors" class="errors">
          @for (error of errors(); track error) {
            <li>{{ errorText(error) }}</li>
          }
        </ul>
      }
      @if (prepared(); as pack) {
        <div data-test="pack-preview">
          <h3>{{ pack.manifest.name }}</h3>
          <p>{{ pack.manifest.description }}</p>
          <dl>
            <dt>{{ 'packs.author' | translate }}</dt>
            <dd>{{ pack.manifest.author }}</dd>
            <dt>{{ 'packs.license' | translate }}</dt>
            <dd>
              <a
                [href]="pack.manifest.licenseUrl"
                target="_blank"
                rel="noopener noreferrer"
                >{{ pack.manifest.license }}</a
              >
            </dd>
            <dt>{{ 'packs.source' | translate }}</dt>
            <dd>
              <a
                [href]="pack.source"
                target="_blank"
                rel="noopener noreferrer"
                >{{ pack.source }}</a
              >
            </dd>
            <dt>{{ 'packs.version' | translate }}</dt>
            <dd>{{ pack.manifest.version }}</dd>
            <dt>{{ 'packs.size' | translate }}</dt>
            <dd>{{ size(pack.size) }}</dd>
            <dt>{{ 'packs.language' | translate }}</dt>
            <dd>{{ languageName(pack.manifest.language) }}</dd>
            @if (pack.counts.generators) {
              <dt>{{ 'packs.detailsGenerators' | translate }}</dt>
              <dd>
                {{
                  'packs.wordLists'
                    | translate: { count: pack.counts.generators }
                }}
              </dd>
            }
            @for (kind of countsSprites(pack); track kind.kind) {
              <dt>{{ 'sprite.kind.' + kind.kind | translate }}</dt>
              <dd>{{ kind.count }}</dd>
            }
          </dl>
          <p-message severity="warn">{{
            'packs.warning' | translate
          }}</p-message>
        </div>
      }
      <ng-template #footer>
        @if (prepared()) {
          <p-button
            icon="pi pi-download"
            [label]="'packs.install' | translate"
            [loading]="installing()"
            (onClick)="install()"
          />
        }
      </ng-template>
    </p-dialog>
    <p-dialog
      [header]="'packs.update' | translate"
      [visible]="update() !== null"
      (visibleChange)="!$event && update.set(null)"
      [modal]="true"
      [style]="{ width: 'min(32rem, calc(100vw - 2rem))' }"
    >
      @if (update(); as pending) {
        <div data-test="pack-update">
          <p>
            {{
              'packs.updateVersions'
                | translate
                  : {
                      name: pending.update.prepared.manifest.name,
                      from: pending.update.oldVersion,
                      to: pending.update.newVersion,
                    }
            }}
          </p>
          <p-message severity="warn">{{
            'packs.warning' | translate
          }}</p-message>
        </div>
      }
      <ng-template #footer>
        <p-button
          severity="secondary"
          outlined
          [label]="'packs.cancel' | translate"
          (onClick)="update.set(null)"
        />
        <p-button
          [label]="'packs.confirm' | translate"
          [loading]="installing()"
          (onClick)="confirmUpdate()"
        />
      </ng-template>
    </p-dialog>
    <p-dialog
      [visible]="details() !== null"
      (visibleChange)="!$event && details.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      <ng-template #header>
        <h2
          class="line-clamp-2 details-title"
          data-test="pack-details-title"
          [pTooltip]="detailsTitle()"
        >
          {{ detailsTitle() }}
        </h2>
      </ng-template>
      @if (details(); as pack) {
        <p>{{ pack.description }}</p>
        <p>
          <a
            [href]="pack.licenseUrl"
            target="_blank"
            rel="noopener noreferrer"
            >{{ 'packs.licenseLink' | translate }}</a
          >
          ({{ pack.license }})
        </p>
        <h3>{{ 'packs.detailsGenerators' | translate }}</h3>
        <p>
          <strong>{{ 'packs.language' | translate }}</strong>:
          <span data-test="pack-details-language">{{
            languageName(pack.language)
          }}</span>
        </p>
        @for (g of generatorNames(); track g) {
          <p-tag
            severity="secondary"
            [value]="'packs.generator.' + g | translate"
          />
        } @empty {
          <p class="hint">{{ 'packs.detailsNoGenerators' | translate }}</p>
        }
        <h3>{{ 'packs.detailsSprites' | translate }}</h3>
        @for (group of spriteGroups(); track group.kind) {
          <h4>{{ 'sprite.kind.' + group.kind | translate }}</h4>
          <ul class="thumbs">
            @for (sprite of group.sprites; track sprite.id) {
              <li>
                <img
                  [src]="sprite.imageUrl"
                  alt=""
                  loading="lazy"
                  width="48"
                  height="48"
                />
                <span>{{ spriteName(sprite) }}</span>
              </li>
            }
          </ul>
        } @empty {
          <p class="hint">{{ 'packs.detailsNoSprites' | translate }}</p>
        }
      }
    </p-dialog>
  `,
  styles: `
    .packs {
      max-width: 72rem;
      margin-inline: auto;
      padding: 1.5rem 1rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    header h1 {
      margin: 0 0 0.5rem;
    }
    header .hint {
      margin: 0 0 1.25rem;
      color: var(--p-text-muted-color);
    }
    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .section-title {
      margin: 0 0 1rem;
      font-size: 1.25rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .grid > li {
      display: flex;
      min-width: 0;
    }
    .grid p-card {
      display: flex;
      flex: 1;
      min-width: 0;
    }
    .grid p-card ::ng-deep .p-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .grid p-card ::ng-deep .p-card-body {
      flex: 1;
    }
    .grid p-card ::ng-deep .p-card-caption {
      flex: 1;
    }
    .grid p-card ::ng-deep .p-card-content {
      flex: 1;
    }
    .grid p-card ::ng-deep .p-card-footer {
      margin-top: auto;
    }
    .line-clamp-2,
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      min-width: 0;
    }
    .line-clamp-2 {
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }
    .line-clamp-3 {
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }
    .name {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }
    .details-title {
      margin: 0;
      font-size: 1.25rem;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .desc {
      margin: 0 0 1rem;
      color: var(--p-text-muted-color);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }
    .meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .meta i {
      font-size: 0.75rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: 100%;
      padding-top: 1rem;
      border-top: 1px solid var(--p-content-border-color);
    }
    .add-link {
      display: flex;
      gap: 0.5rem;
    }
    .add-link input {
      flex: 1;
    }
    .errors {
      color: var(--p-red-500);
    }
    .thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .thumbs li {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 0.75rem;
    }
  `,
})
export class PacksToolPageComponent {
  private readonly business = inject(PackBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly creator = inject(PackCreatorBusiness);
  private readonly router = inject(Router);
  private readonly pending = inject(PendingTasks);

  protected readonly registry = signal<PackRegistryEntry[]>([]);
  protected readonly busy = signal<ReadonlySet<string>>(new Set());
  protected readonly details = signal<PackRegistryEntry | null>(null);
  protected readonly addOpen = signal(false);
  protected readonly link = signal('');
  protected readonly checking = signal(false);
  protected readonly installing = signal(false);
  protected readonly prepared = signal<PreparedPack | null>(null);
  protected readonly errors = signal<string[]>([]);
  protected readonly update = signal<{ update: PackUpdate } | null>(null);
  protected readonly unofficial = computed(() =>
    this.business.$installed().filter((p) => p.link || p.local),
  );
  private readonly spriteLabels = inject(SpriteLabelBusiness);
  private readonly detailSprites = signal<BundledSprite[]>([]);

  protected readonly detailsTitle = computed(() => {
    const pack = this.details();
    return pack ? pack.name : '';
  });

  protected readonly spriteGroups = computed(() =>
    SPRITE_KINDS.map((kind: SpriteKind) => ({
      kind,
      sprites: this.detailSprites().filter((s) => s.kind === kind),
    })).filter((group) => group.sprites.length),
  );

  protected readonly generatorNames = computed(() => {
    const id = this.details()?.id;
    const pack = this.business.$installed().find((p) => p.id === id);
    return PACK_GENERATORS.filter((g) => pack?.generators[g]);
  });

  constructor() {
    void this.track(() =>
      this.business.registry().then(
        (entries) => this.registry.set(entries),
        () => this.fail(this.language.t('packs.loadFailed')),
      ),
    );
  }

  protected spriteName(sprite: BundledSprite): string {
    return this.spriteLabels.name(sprite);
  }

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  /** A pack language in its own language, whatever the app language. */
  /** The name of a pack language; empty for a neutral pack. */
  protected languageName(code: string | undefined): string {
    if (!code) return '';
    return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
  }

  private installed(id: string) {
    return this.business.$installed().find((p) => p.id === id);
  }

  protected isInstalled(id: string): boolean {
    return !!this.installed(id);
  }

  protected isDownloaded(id: string): boolean {
    const pack = this.installed(id);
    return !!pack && !pack.builtIn;
  }

  protected async download(entry: PackRegistryEntry): Promise<void> {
    this.setBusy(entry.id, true);
    try {
      await this.business.enable(entry.id);
    } catch (error) {
      this.fail(error);
    } finally {
      this.setBusy(entry.id, false);
    }
  }

  protected openCreator(): void {
    void this.router.navigate(['/tools/pack-creator']);
  }

  protected duplicate(id: string): Promise<void> {
    return this.track(() => this.doDuplicate(id));
  }

  private async doDuplicate(id: string): Promise<void> {
    this.setBusy(id, true);
    try {
      const draft = await this.creator.duplicate(id);
      await this.router.navigate(['/tools/pack-creator', draft.id]);
    } catch (error) {
      this.fail(
        this.errorList(error)
          .map((e) => this.errorText(e))
          .join('\n'),
      );
    } finally {
      this.setBusy(id, false);
    }
  }

  protected editAsDraft(pack: InstalledPack): Promise<void> {
    return this.track(() => this.doEditAsDraft(pack));
  }

  private async doEditAsDraft(pack: InstalledPack): Promise<void> {
    this.setBusy(pack.id, true);
    try {
      const draft = await this.creator.draftFromInstalled(pack.id);
      await this.router.navigate(['/tools/pack-creator', draft.id]);
    } catch (error) {
      this.fail(
        this.errorList(error)
          .map((e) => this.errorText(e))
          .join('\n'),
      );
    } finally {
      this.setBusy(pack.id, false);
    }
  }

  protected openAdd(): void {
    this.link.set('');
    this.prepared.set(null);
    this.errors.set([]);
    this.addOpen.set(true);
  }

  protected closeAdd(): void {
    this.addOpen.set(false);
    this.prepared.set(null);
    this.errors.set([]);
  }

  protected async check(): Promise<void> {
    this.prepared.set(null);
    this.errors.set([]);
    this.checking.set(true);
    try {
      this.prepared.set(await this.business.prepare(this.link()));
    } catch (error) {
      this.errors.set(this.errorList(error));
    } finally {
      this.checking.set(false);
    }
  }

  protected async install(): Promise<void> {
    const pack = this.prepared();
    if (!pack) return;
    this.installing.set(true);
    try {
      await this.business.install(pack);
      this.closeAdd();
    } catch (error) {
      this.prepared.set(null);
      this.errors.set(this.errorList(error));
    } finally {
      this.installing.set(false);
    }
  }

  protected async checkUpdate(pack: InstalledPack): Promise<void> {
    this.setBusy(pack.id, true);
    try {
      this.update.set({ update: await this.business.checkUpdate(pack.id) });
    } catch (error) {
      this.fail(
        this.errorList(error)
          .map((e) => this.errorText(e))
          .join('\n'),
      );
    } finally {
      this.setBusy(pack.id, false);
    }
  }

  protected async confirmUpdate(): Promise<void> {
    const pending = this.update();
    if (!pending) return;
    this.installing.set(true);
    try {
      await this.business.install(pending.update.prepared);
      this.update.set(null);
    } catch (error) {
      this.fail(
        this.errorList(error)
          .map((e) => this.errorText(e))
          .join('\n'),
      );
    } finally {
      this.installing.set(false);
    }
  }

  private errorList(error: unknown): string[] {
    const list = (error as { errors?: string[] }).errors;
    return list?.length
      ? list
      : [error instanceof Error ? error.message : String(error)];
  }

  /** Link errors are translation keys; the others come from the pack and are shown as they are. */
  protected errorText(error: string): string {
    return /^packs\.link\.\w+$/.test(error) ? this.language.t(error) : error;
  }

  protected countsSprites(pack: PreparedPack) {
    return SPRITE_KINDS.filter((k) => pack.counts.sprites[k]).map((kind) => ({
      kind,
      count: pack.counts.sprites[kind] ?? 0,
    }));
  }

  protected confirmRemove(id: string, name: string): void {
    this.confirmation.confirm({
      header: this.language.t('packs.removeTitle'),
      message: this.language.t('packs.removeMessage', { name }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('packs.removeAccept'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('packs.removeReject'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => void this.remove(id),
    });
  }

  private async remove(id: string): Promise<void> {
    this.setBusy(id, true);
    try {
      await this.business.remove(id);
    } catch (error) {
      this.fail(error);
    } finally {
      this.setBusy(id, false);
    }
  }

  protected async openDetails(entry: PackRegistryEntry): Promise<void> {
    this.detailSprites.set([]);
    this.details.set(entry);
    try {
      this.detailSprites.set(await this.business.spritesOf(entry.id));
    } catch (error) {
      this.fail(error);
    }
  }

  private setBusy(id: string, on: boolean): void {
    this.busy.update((set) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Keeps the app unstable while the work runs, so `whenStable` waits for it. */
  private async track<T>(work: () => Promise<T>): Promise<T> {
    const done = this.pending.add();
    try {
      return await work();
    } finally {
      done();
    }
  }

  private fail(error: unknown): void {
    this.messages.add({
      severity: MessageLevel.Error,
      summary: this.language.t('packs.errorTitle'),
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
