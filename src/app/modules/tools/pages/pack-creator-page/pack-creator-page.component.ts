import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PendingTasks,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { SUPPORTED_LANGUAGES } from '../../../../core/constants/languages';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';

/** The drafts of the pack creator: open, delete, or start a new one. */
@Component({
  selector: 'app-pack-creator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    LocalDatePipe,
    TagModule,
    TooltipModule,
    ButtonModule,
    CardModule,
    ConfirmDialog,
  ],
  template: `
    <div class="main-container creator">
      <header>
        <a routerLink="/tools/packs">{{
          'packs.creator.backToPacks' | translate
        }}</a>
        <h1>{{ 'packs.creator.title' | translate }}</h1>
        <p class="hint">{{ 'packs.creator.intro' | translate }}</p>
        <div>
          <p-button
            icon="pi pi-plus"
            [label]="'packs.creator.create' | translate"
            [loading]="creating()"
            (onClick)="create()"
          />
        </div>
      </header>
      <ul class="drafts">
        @for (draft of sorted(); track draft.id) {
          <li data-test="draft-row">
            <p-card class="clickable" (click)="open(draft.id)">
              <div class="row">
                <div class="info">
                  <h2
                    class="name line-clamp-2"
                    data-test="draft-name"
                    [pTooltip]="name(draft)"
                  >
                    {{ name(draft) }}
                  </h2>
                  <div class="tags">
                    <p-tag
                      data-test="draft-language"
                      severity="secondary"
                      [value]="languageName(draft)"
                    />
                  </div>
                  <span class="meta" data-test="draft-date">
                    {{ 'packs.creator.updated' | translate }}
                    {{ draft.updatedAt | localDate: 'dateTime' }}
                  </span>
                </div>
                <div class="actions" (click)="$event.stopPropagation()">
                  <p-button
                    severity="secondary"
                    icon="pi pi-pencil"
                    [label]="'packs.creator.open' | translate"
                    (onClick)="open(draft.id)"
                  />
                  <p-button
                    severity="danger"
                    variant="outlined"
                    icon="pi pi-trash"
                    [label]="'packs.creator.delete' | translate"
                    (onClick)="confirmDelete(draft)"
                  />
                </div>
              </div>
            </p-card>
          </li>
        } @empty {
          @if (loaded()) {
            <li class="empty" data-test="drafts-empty">
              <p class="hint">{{ 'packs.creator.empty' | translate }}</p>
              <p-button
                icon="pi pi-plus"
                [label]="'packs.creator.create' | translate"
                [loading]="creating()"
                (onClick)="create()"
              />
            </li>
          }
        }
      </ul>
    </div>
    <p-confirmdialog
      key="pack-drafts"
      [style]="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    />
  `,
  styles: `
    .creator {
      max-width: 48rem;
      margin-inline: auto;
      padding: 1.5rem 1rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    header h1,
    header .hint {
      margin: 0;
    }
    header .hint,
    .meta {
      color: var(--p-text-muted-color);
    }
    .drafts {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .drafts > li {
      min-width: 0;
    }
    .clickable {
      display: block;
      cursor: pointer;
    }
    .clickable ::ng-deep .p-card-body {
      padding: 1.25rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }
    .info {
      flex: 1 1 14rem;
      min-width: 0;
    }
    .name {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .tags {
      margin-bottom: 0.5rem;
    }
    .meta {
      font-size: 0.8125rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .empty .hint {
      margin: 0;
    }
  `,
})
export class PackCreatorPageComponent implements OnInit {
  private readonly creator = inject(PackCreatorBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);
  private readonly pending = inject(PendingTasks);

  protected readonly drafts = this.creator.$drafts;
  protected readonly sorted = computed(() =>
    [...this.drafts()].sort((a, b) => b.updatedAt - a.updatedAt),
  );
  protected readonly loaded = signal(false);
  protected readonly creating = signal(false);

  ngOnInit(): void {
    void this.track(() => this.refresh());
  }

  private async refresh(): Promise<void> {
    try {
      await this.creator.loadDrafts();
      this.loaded.set(true);
    } catch (error) {
      this.fail(error);
    }
  }

  protected name(draft: PackDraft): string {
    return (
      draft.details.name.trim() || this.language.t('packs.creator.untitled')
    );
  }

  protected languageName(draft: PackDraft): string {
    const code = draft.details.language;
    if (!code) return this.language.t('packs.creator.neutral');
    return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
  }

  protected create(): Promise<void> {
    return this.track(() => this.doCreate());
  }

  private async doCreate(): Promise<void> {
    this.creating.set(true);
    try {
      const draft = await this.creator.createDraft();
      await this.open(draft.id);
    } catch (error) {
      this.fail(error);
    } finally {
      this.creating.set(false);
    }
  }

  protected open(id: string): Promise<boolean> {
    return this.router.navigate(['/tools/pack-creator', id]);
  }

  protected confirmDelete(draft: PackDraft): void {
    this.confirmation.confirm({
      key: 'pack-drafts',
      header: this.language.t('packs.creator.deleteTitle'),
      message: this.language.t('packs.creator.deleteMessage', {
        name: this.name(draft),
      }),
      icon: 'pi pi-trash',
      acceptButtonProps: {
        label: this.language.t('packs.creator.deleteAccept'),
        severity: 'danger',
      },
      rejectButtonProps: {
        label: this.language.t('packs.creator.deleteReject'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => void this.remove(draft.id),
    });
  }

  private async remove(id: string): Promise<void> {
    try {
      await this.creator.deleteDraft(id);
    } catch (error) {
      this.fail(error);
    }
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
