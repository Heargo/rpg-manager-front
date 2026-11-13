import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { TagModule } from '@openng/optimus-ui/tag';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import {
  BundledSprite,
  PackBusiness,
} from '../../../../core/business/pack.business';
import { LanguageBusiness } from '../../../../core/business/language.business';
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
    ProgressSpinnerModule,
    TagModule,
    ToggleSwitchModule,
  ],
  template: `
    <div class="main-container packs">
      <header>
        <h1>{{ 'packs.title' | transloco }}</h1>
        <p class="hint">{{ 'packs.intro' | transloco }}</p>
      </header>
      <ul class="grid">
        @for (entry of registry(); track entry.id) {
          <li data-test="pack-card" [attr.data-pack]="entry.id">
            <p-card>
              <div class="head">
                <h2>{{ text(entry.name) }}</h2>
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
                  @for (key of [toggleKey(entry.id)]; track key) {
                    <p-toggleswitch
                      [ngModel]="isEnabled(entry.id)"
                      [disabled]="busy().has(entry.id)"
                      [ariaLabel]="
                        'packs.toggle' | transloco: { name: text(entry.name) }
                      "
                      (ngModelChange)="toggle(entry, $event)"
                    />
                  }
                }
              </div>
              <p>{{ text(entry.description) }}</p>
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
                <dt>{{ 'packs.languages' | transloco }}</dt>
                <dd>{{ languages(entry) }}</dd>
              </dl>
              <div class="actions">
                @if (isInstalled(entry.id)) {
                  <p-button
                    severity="secondary"
                    icon="pi pi-info-circle"
                    [label]="'packs.details' | transloco"
                    (onClick)="openDetails(entry)"
                  />
                }
                @if (isDownloaded(entry.id)) {
                  <p-button
                    severity="danger"
                    icon="pi pi-trash"
                    [label]="'packs.remove' | transloco"
                    [disabled]="busy().has(entry.id)"
                    (onClick)="confirmRemove(entry)"
                  />
                }
              </div>
            </p-card>
          </li>
        }
      </ul>
    </div>
    <p-dialog
      [header]="detailsTitle()"
      [visible]="details() !== null"
      (visibleChange)="!$event && details.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      @if (details(); as pack) {
        <p>{{ text(pack.description) }}</p>
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
        @for (lang of generatorLanguages(); track lang.lang) {
          <p>
            <strong>{{ 'packs.lang.' + lang.lang | transloco }}</strong>:
            @for (g of lang.generators; track g) {
              <p-tag
                severity="secondary"
                [value]="'packs.generator.' + g | transloco"
              />
            }
          </p>
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
                <span>{{ spriteLabel(sprite) }}</span>
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
      max-width: 64rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .head h2 {
      flex: 1;
      margin: 0;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 0.75rem;
    }
    dd {
      margin: 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
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

  protected readonly registry = signal<PackRegistryEntry[]>([]);
  protected readonly busy = signal<ReadonlySet<string>>(new Set());
  protected readonly details = signal<PackRegistryEntry | null>(null);
  private readonly detailSprites = signal<BundledSprite[]>([]);
  private readonly resets = signal<Record<string, number>>({});

  protected readonly detailsTitle = computed(() => {
    const pack = this.details();
    return pack ? this.text(pack.name) : '';
  });

  protected readonly spriteGroups = computed(() =>
    SPRITE_KINDS.map((kind: SpriteKind) => ({
      kind,
      sprites: this.detailSprites().filter((s) => s.kind === kind),
    })).filter((group) => group.sprites.length),
  );

  protected readonly generatorLanguages = computed(() => {
    const id = this.details()?.id;
    const pack = this.business.$installed().find((p) => p.id === id);
    return Object.entries(pack?.generators ?? {})
      .map(([lang, files]) => ({
        lang,
        generators: PACK_GENERATORS.filter((g) => files?.[g]),
      }))
      .filter((l) => l.generators.length);
  });

  constructor() {
    this.business.registry().then(
      (entries) => this.registry.set(entries),
      () => this.fail(this.language.t('packs.loadFailed')),
    );
  }

  protected text(value: Record<string, string>): string {
    const lang = this.language.$language() ?? 'en';
    return value[lang] ?? value['en'] ?? '';
  }

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  protected languages(entry: PackRegistryEntry): string {
    return entry.languages
      .map((l) => this.language.t(`packs.lang.${l}`))
      .join(', ');
  }

  protected spriteLabel(sprite: BundledSprite): string {
    return this.language.$language() === 'fr' ? sprite.fr : sprite.en;
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

  protected isEnabled(id: string): boolean {
    return this.installed(id)?.enabled ?? false;
  }

  /** Changes after a failed toggle so the switch is drawn again in its real state. */
  protected toggleKey(id: string): number {
    return this.resets()[id] ?? 0;
  }

  protected async toggle(entry: PackRegistryEntry, on: boolean): Promise<void> {
    if (on === this.isEnabled(entry.id)) return;
    this.setBusy(entry.id, true);
    try {
      if (on) await this.business.enable(entry.id);
      else await this.business.disable(entry.id);
    } catch (error) {
      this.fail(error);
      this.resets.update((r) => ({ ...r, [entry.id]: (r[entry.id] ?? 0) + 1 }));
    } finally {
      this.setBusy(entry.id, false);
    }
  }

  protected confirmRemove(entry: PackRegistryEntry): void {
    const name = this.text(entry.name);
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
      accept: () => void this.remove(entry),
    });
  }

  private async remove(entry: PackRegistryEntry): Promise<void> {
    this.setBusy(entry.id, true);
    try {
      await this.business.remove(entry.id);
    } catch (error) {
      this.fail(error);
    } finally {
      this.setBusy(entry.id, false);
    }
  }

  protected async openDetails(entry: PackRegistryEntry): Promise<void> {
    this.detailSprites.set([]);
    this.details.set(entry);
    try {
      const sprites = await this.business.sprites();
      this.detailSprites.set(sprites.filter((s) => s.packId === entry.id));
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

  private fail(error: unknown): void {
    this.messages.add({
      severity: MessageLevel.Error,
      summary: this.language.t('packs.errorTitle'),
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
