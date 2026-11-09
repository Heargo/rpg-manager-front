import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { DebugLogBusiness } from '../../../../core/business/debug-log.business';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { ProfileBusiness } from '../../../../core/business/profile.business';
import { isValidProfileName, PROFILE_NAME_MAX_LENGTH } from '../../../../core/helpers/profile.rules';
import { MessageLevel } from '../../../../core/models/toast-level';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, TranslocoPipe, AvatarModule, ButtonModule, CardModule, InputTextModule, MessageModule],
})
export class ProfilePageComponent {
  protected readonly profileBusiness = inject(ProfileBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly messageService = inject(MessageService);
  protected readonly debugLog = inject(DebugLogBusiness);
  protected readonly exporting = signal(false);

  constructor() {
    this.debugLog.refresh();
  }

  protected readonly maxLength = PROFILE_NAME_MAX_LENGTH;
  /** Draft name, reset whenever the saved profile changes. */
  protected readonly name = linkedSignal(() => this.profileBusiness.$profile().name);
  protected readonly isValid = computed(() => isValidProfileName(this.name()));
  protected readonly isDirty = computed(() => this.name().trim() !== this.profileBusiness.$profile().name);

  protected save(): void {
    if (!this.profileBusiness.rename(this.name())) return;
    this.messageService.add({
      severity: MessageLevel.Success,
      summary: this.languageBusiness.t('profile.saved'),
      life: 2500,
    });
  }

  protected async exportLog(): Promise<void> {
    this.exporting.set(true);
    try {
      const result = await this.debugLog.export();
      if (result !== 'cancelled') this.toast(MessageLevel.Success, 'profile.debugLog.exported');
    } catch (error) {
      console.error('Debug log export failed', error);
      this.toast(MessageLevel.Error, 'profile.debugLog.exportFailed');
    } finally {
      this.exporting.set(false);
    }
  }

  protected clearLog(): void {
    this.debugLog.clear();
    this.toast(MessageLevel.Info, 'profile.debugLog.cleared');
  }

  private toast(severity: MessageLevel, key: string): void {
    this.messageService.add({ severity, summary: this.languageBusiness.t(key), life: 2500 });
  }
}
