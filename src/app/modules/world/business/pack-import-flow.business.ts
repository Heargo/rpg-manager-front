import { inject, Injectable, PendingTasks } from '@angular/core';
import { MessageService } from '@openng/optimus-ui/api';
import { LanguageBusiness } from '../../../core/business/language.business';
import { MessageLevel } from '../../../core/models/toast-level';
import {
  PackContentImportBusiness,
  PackContentImportResult,
} from './pack-content-import.business';

/** What the pages around the pack import share: run it, answer the attribute dialog, tell the GM what happened. */
@Injectable({ providedIn: 'root' })
export class PackImportFlowBusiness {
  private readonly imports = inject(PackContentImportBusiness);
  private readonly messages = inject(MessageService);
  private readonly language = inject(LanguageBusiness);
  private readonly pendingTasks = inject(PendingTasks);

  /** The attributes waiting for the GM's choice, for the page's `app-pack-attribute-mapping`. */
  readonly $pending = this.imports.$pending;

  /** "Import from the packs": imports the active packs, or opens the dialog when a choice is needed. */
  async run(): Promise<void> {
    await this.guard(async () => {
      this.notify(await this.imports.request());
    });
  }

  async confirm(mapping: Record<string, string>): Promise<void> {
    await this.guard(async () => {
      this.notify(await this.imports.confirmPending(mapping));
    });
  }

  cancel(): void {
    this.imports.cancelPending();
  }

  /** The toast of an import done on activation (nothing when none ran or a choice is pending). */
  notifyActivation(): void {
    this.notify(this.imports.takeActivation());
  }

  private notify(result: PackContentImportResult | null): void {
    if (!result || result.needsChoice.length) return;
    this.messages.add({
      severity: MessageLevel.Success,
      summary: this.language.t('packImport.done', {
        added: result.added,
        updated: result.updated,
        kept: result.kept,
      }),
      life: 4000,
    });
  }

  private async guard(action: () => Promise<void>): Promise<void> {
    const done = this.pendingTasks.add();
    try {
      await action();
    } catch {
      this.imports.cancelPending();
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('packImport.failed'),
        life: 4000,
      });
    } finally {
      done();
    }
  }
}
