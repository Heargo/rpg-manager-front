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
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { TagModule } from '@openng/optimus-ui/tag';
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
    TranslocoPipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
  ],
  template: `
    <div class="main-container packs">
      <header>
        <h1>{{ 'packs.title' | transloco }}</h1>
        <p class="hint">{{ 'packs.intro' | transloco }}</p>
        <div class="header-actions">
          <p-button
            icon="pi pi-plus"
            [label]="'packs.add' | transloco"
            (onClick)="openAdd()"
          />
          <p-button
            severity="secondary"
            icon="pi pi-pencil"
            [label]="'packs.creator.create' | transloco"
            (onClick)="openCreator()"
          />
        </div>
      </header>
      @if (registry().length) {
        <section>
          <h2 class="section-title">{{ 'packs.officialTitle' | transloco }}</h2>
          <ul class="grid">
            @for (entry of registry(); track entry.id) {
              <li data-test="pack-card" [attr.data-pack]="entry.id">
                <p-card>
                  <div class="head">
                    <h3>{{ entry.name }}</h3>
                    <p-tag
                      data-test="pack-language"
                      severity="secondary"
                      [value]="languageName(entry.language)"
                    />
                    @if (entry.builtIn) {
                      <p-tag
                        severity="info"
                        [value]="'packs.alwaysOn' | transloco"
                      />
                    } @else {
                      @if (isDownloaded(entry.id)) {
                        <p-tag
                          severity="success"
                          [value]="'packs.downloaded' | transloco"
                        />
                      }
                      @if (busy().has(entry.id)) {
                        <p-progressspinner
                          strokeWidth="6"
                          [style]="{ width: '1.5rem', height: '1.5rem' }"
                          [ariaLabel]="'packs.downloading' | transloco"
                        />
                      }
                    }
                  </div>
                  <p class="desc">{{ entry.description }}</p>
                  <dl>
                    <dt>{{ 'packs.author' | transloco }}</dt>
                    <dd>{{ entry.author }}</dd>
                    <dt>{{ 'packs.license' | transloco }}</dt>
                    <dd>
                      <a
                        [href]="entry.licenseUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ entry.license }}</a
                      >
                    </dd>
                    @if (!entry.builtIn) {
                      <dt>{{ 'packs.size' | transloco }}</dt>
                      <dd>{{ size(entry.size) }}</dd>
                    }
                    <dt>{{ 'packs.detailsSprites' | transloco }}</dt>
                    <dd>{{ entry.sprites }}</dd>
                    <dt>{{ 'packs.language' | transloco }}</dt>
                    <dd>{{ languageName(entry.language) }}</dd>
                  </dl>
                  <ng-template #footer>
                    <div class="actions">
                      @if (isInstalled(entry.id)) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-info-circle"
                          [label]="'packs.details' | transloco"
                          (onClick)="openDetails(entry)"
                        />
                        <p-button
                          severity="secondary"
                          icon="pi pi-copy"
                          [label]="'packs.duplicate' | transloco"
                          [loading]="busy().has(entry.id)"
                          [disabled]="busy().has(entry.id)"
                          (onClick)="duplicate(entry.id)"
                        />
                      }
                      @if (!entry.builtIn && !isDownloaded(entry.id)) {
                        <p-button
                          icon="pi pi-download"
                          [label]="'packs.download' | transloco"
                          [disabled]="busy().has(entry.id)"
                          (onClick)="download(entry)"
                        />
                      }
                      @if (isDownloaded(entry.id)) {
                        <p-button
                          severity="danger"
                          variant="text"
                          icon="pi pi-trash"
                          [label]="'packs.remove' | transloco"
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
            {{ 'packs.unofficialTitle' | transloco }}
          </h2>
          <ul class="grid">
            @for (pack of unofficial(); track pack.id) {
              <li data-test="unofficial-pack-card" [attr.data-pack]="pack.id">
                <p-card>
                  <div class="head">
                    <h3>{{ pack.name }}</h3>
                    <p-tag
                      data-test="pack-language"
                      severity="secondary"
                      [value]="languageName(pack.language)"
                    />
                    @if (!pack.link) {
                      <p-tag
                        severity="secondary"
                        [value]="'packs.createdHere' | transloco"
                      />
                    }
                    @if (busy().has(pack.id)) {
                      <p-progressspinner
                        strokeWidth="6"
                        [style]="{ width: '1.5rem', height: '1.5rem' }"
                        [ariaLabel]="'packs.downloading' | transloco"
                      />
                    }
                  </div>
                  <p class="desc">{{ pack.description }}</p>
                  <dl>
                    <dt>{{ 'packs.author' | transloco }}</dt>
                    <dd>{{ pack.author }}</dd>
                    <dt>{{ 'packs.license' | transloco }}</dt>
                    <dd>
                      <a
                        [href]="pack.licenseUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ pack.license }}</a
                      >
                    </dd>
                    <dt>{{ 'packs.version' | transloco }}</dt>
                    <dd>{{ pack.version }}</dd>
                    <dt>{{ 'packs.source' | transloco }}</dt>
                    <dd>
                      @if (pack.link) {
                        <a
                          [href]="pack.link"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ pack.link }}</a
                        >
                      } @else {
                        {{ 'packs.createdHere' | transloco }}
                      }
                    </dd>
                  </dl>
                  <ng-template #footer>
                    <div class="actions">
                      @if (pack.link) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-refresh"
                          [label]="'packs.update' | transloco"
                          [disabled]="busy().has(pack.id)"
                          (onClick)="checkUpdate(pack)"
                        />
                      }
                      <p-button
                        severity="secondary"
                        icon="pi pi-copy"
                        [label]="'packs.duplicate' | transloco"
                        [loading]="busy().has(pack.id)"
                        [disabled]="busy().has(pack.id)"
                        (onClick)="duplicate(pack.id)"
                      />
                      @if (!pack.link) {
                        <p-button
                          severity="secondary"
                          icon="pi pi-pencil"
                          [label]="'packs.editAsDraft' | transloco"
                          [disabled]="busy().has(pack.id)"
                          (onClick)="editAsDraft(pack)"
                        />
                      }
                      <p-button
                        severity="danger"
                        variant="text"
                        icon="pi pi-trash"
                        [label]="'packs.remove' | transloco"
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
      [header]="'packs.add' | transloco"
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
          [placeholder]="'packs.linkPlaceholder' | transloco"
          [attr.aria-label]="'packs.linkLabel' | transloco"
        />
        <p-button
          [label]="'packs.check' | transloco"
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
            <dt>{{ 'packs.author' | transloco }}</dt>
            <dd>{{ pack.manifest.author }}</dd>
            <dt>{{ 'packs.license' | transloco }}</dt>
            <dd>
              <a
                [href]="pack.manifest.licenseUrl"
                target="_blank"
                rel="noopener noreferrer"
                >{{ pack.manifest.license }}</a
              >
            </dd>
            <dt>{{ 'packs.source' | transloco }}</dt>
            <dd>
              <a
                [href]="pack.source"
                target="_blank"
                rel="noopener noreferrer"
                >{{ pack.source }}</a
              >
            </dd>
            <dt>{{ 'packs.version' | transloco }}</dt>
            <dd>{{ pack.manifest.version }}</dd>
            <dt>{{ 'packs.size' | transloco }}</dt>
            <dd>{{ size(pack.size) }}</dd>
            <dt>{{ 'packs.language' | transloco }}</dt>
            <dd>{{ languageName(pack.manifest.language) }}</dd>
            @if (pack.counts.generators) {
              <dt>{{ 'packs.detailsGenerators' | transloco }}</dt>
              <dd>
                {{
                  'packs.wordLists'
                    | transloco: { count: pack.counts.generators }
                }}
              </dd>
            }
            @for (kind of countsSprites(pack); track kind.kind) {
              <dt>{{ 'sprite.kind.' + kind.kind | transloco }}</dt>
              <dd>{{ kind.count }}</dd>
            }
          </dl>
          <p-message severity="warn">{{
            'packs.warning' | transloco
          }}</p-message>
        </div>
      }
      <ng-template #footer>
        @if (prepared()) {
          <p-button
            icon="pi pi-download"
            [label]="'packs.install' | transloco"
            [loading]="installing()"
            (onClick)="install()"
          />
        }
      </ng-template>
    </p-dialog>
    <p-dialog
      [header]="'packs.update' | transloco"
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
                | transloco
                  : {
                      name: pending.update.prepared.manifest.name,
                      from: pending.update.oldVersion,
                      to: pending.update.newVersion,
                    }
            }}
          </p>
          <p-message severity="warn">{{
            'packs.warning' | transloco
          }}</p-message>
        </div>
      }
      <ng-template #footer>
        <p-button
          severity="secondary"
          outlined
          [label]="'packs.cancel' | transloco"
          (onClick)="update.set(null)"
        />
        <p-button
          [label]="'packs.confirm' | transloco"
          [loading]="installing()"
          (onClick)="confirmUpdate()"
        />
      </ng-template>
    </p-dialog>
    <p-dialog
      [header]="detailsTitle()"
      [visible]="details() !== null"
      (visibleChange)="!$event && details.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      @if (details(); as pack) {
        <p>{{ pack.description }}</p>
        <p>
          <a
            [href]="pack.licenseUrl"
            target="_blank"
            rel="noopener noreferrer"
            >{{ 'packs.licenseLink' | transloco }}</a
          >
          ({{ pack.license }})
        </p>
        <h3>{{ 'packs.detailsGenerators' | transloco }}</h3>
        <p>
          <strong>{{ 'packs.language' | transloco }}</strong>:
          <span data-test="pack-details-language">{{
            languageName(pack.language)
          }}</span>
        </p>
        @for (g of generatorNames(); track g) {
          <p-tag
            severity="secondary"
            [value]="'packs.generator.' + g | transloco"
          />
        } @empty {
          <p class="hint">{{ 'packs.detailsNoGenerators' | transloco }}</p>
        }
        <h3>{{ 'packs.detailsSprites' | transloco }}</h3>
        @for (group of spriteGroups(); track group.kind) {
          <h4>{{ 'sprite.kind.' + group.kind | transloco }}</h4>
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
                <span>{{ sprite.label }}</span>
              </li>
            }
          </ul>
        } @empty {
          <p class="hint">{{ 'packs.detailsNoSprites' | transloco }}</p>
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
    .head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .head h3 {
      flex: 1;
      margin: 0;
      font-size: 1.125rem;
      overflow-wrap: anywhere;
    }
    .desc {
      margin: 0 0 1rem;
      color: var(--p-text-muted-color);
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    dt {
      color: var(--p-text-muted-color);
    }
    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
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

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  /** A pack language in its own language, whatever the app language. */
  protected languageName(code: string): string {
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
