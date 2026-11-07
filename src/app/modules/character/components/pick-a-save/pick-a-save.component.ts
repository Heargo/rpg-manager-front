import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageService } from '@openng/optimus-ui/api';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { MessageLevel } from '../../../../core/models/toast-level';
import { PlayerCopyHostBusiness } from '../../business/player-copy-host.business';
import { PickASaveDialogComponent } from '../pick-a-save-dialog/pick-a-save-dialog.component';

/** Host: the "Pick a save" dialog, open while a player's copy waits for the game master's pick. */
@Component({
  selector: 'app-pick-a-save',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, DialogModule, PickASaveDialogComponent],
  template: `
    @if (copies.$conflicts()[0]; as conflict) {
      <p-dialog
        [visible]="true"
        [modal]="true"
        [closable]="false"
        [draggable]="false"
        [header]="
          'character.pickASave.title' | transloco: { name: conflict.playerName }
        "
        [style]="{ width: 'min(40rem, calc(100vw - 2rem))' }"
      >
        <app-pick-a-save-dialog
          [conflict]="conflict"
          (keepHost)="pick(conflict.playerId, 'host')"
          (usePlayer)="pick(conflict.playerId, 'player')"
        />
      </p-dialog>
    }
  `,
})
export class PickASaveComponent {
  protected readonly copies = inject(PlayerCopyHostBusiness);
  private readonly messages = inject(MessageService);
  private readonly language = inject(LanguageBusiness);

  protected async pick(
    playerId: string,
    pick: 'host' | 'player',
  ): Promise<void> {
    try {
      await (pick === 'host'
        ? this.copies.keepHost(playerId)
        : this.copies.usePlayer(playerId));
    } catch (error) {
      console.error('Could not apply the pick', error);
      this.messages.add({
        severity: MessageLevel.Error,
        summary: this.language.t('character.errors.invalid'),
        life: 4000,
      });
    }
  }
}
