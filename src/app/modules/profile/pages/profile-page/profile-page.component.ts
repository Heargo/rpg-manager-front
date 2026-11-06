import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
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
}
