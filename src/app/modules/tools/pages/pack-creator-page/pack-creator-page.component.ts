import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PendingTasks,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { PackCreatorBusiness } from '../../../../core/business/pack-creator.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { PackDraft } from '../../../../core/packs/pack-draft';
import { LocalDatePipe } from '../../../../core/pipes/local-date.pipe';

/** The drafts of the pack creator: open, delete, or start a new one. */
@Component({
  selector: 'app-pack-creator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    LocalDatePipe,
    ButtonModule,
    CardModule,
    ConfirmDialog,
  ],
  template: `
    <div class="main-container creator">
      <header>
        <h1>{{ 'packs.creator.title' | transloco }}</h1>
        <p class="hint">{{ 'packs.creator.intro' | transloco }}</p>
        <p-button
          icon="pi pi-plus"
          [label]="'packs.creator.newDraft' | transloco"
          [loading]="creating()"
          (onClick)="create()"
        />
      </header>
      <ul class="drafts">
        @for (draft of drafts(); track draft.id) {
          <li data-test="draft-row">
            <p-card>
              <div class="row">
                <div class="info">
                  <h2>{{ name(draft) }}</h2>
                  <span class="hint">
                    {{ 'packs.creator.updated' | transloco }}
                    {{ draft.updatedAt | localDate: 'dateTime' }}
                  </span>
                </div>
                <p-button
                  severity="secondary"
                  icon="pi pi-pencil"
                  [label]="'packs.creator.open' | transloco"
                  (onClick)="open(draft.id)"
                />
                <p-button
                  severity="danger"
                  icon="pi pi-trash"
                  [label]="'packs.creator.delete' | transloco"
                  (onClick)="confirmDelete(draft)"
                />
              </div>
            </p-card>
          </li>
        } @empty {
          @if (loaded()) {
            <li class="hint">{{ 'packs.creator.empty' | transloco }}</li>
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
    }
    .drafts {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .info {
      flex: 1;
    }
    .info h2 {
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
    const { name } = draft.details;
    const lang = this.language.$language() === 'fr' ? 'fr' : 'en';
    const other = lang === 'fr' ? 'en' : 'fr';
    return (
      name[lang].trim() ||
      name[other].trim() ||
      this.language.t('packs.creator.untitled')
    );
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
