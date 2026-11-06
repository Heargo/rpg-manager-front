import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ProfileBusiness } from '../../../../core/business/profile.business';
import { extractSignalCode } from '../../../../core/p2p/helpers/signal-codec';
import { RoomBusiness } from '../../business/room.business';
import { InviteCardComponent } from '../../components/invite-card/invite-card.component';
import { MemberListComponent } from '../../components/member-list/member-list.component';

@Component({
  selector: 'app-room-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    TextareaModule,
    InviteCardComponent,
    MemberListComponent,
  ],
  templateUrl: './room-page.component.html',
  styleUrl: './room-page.component.scss',
})
export class RoomPageComponent {
  protected readonly room = inject(RoomBusiness);
  protected readonly profile = inject(ProfileBusiness);
  private readonly router = inject(Router);

  protected readonly roomName = linkedSignal(() => this.room.defaultRoomName());
  protected readonly inviteInput = signal('');
  protected readonly inviting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected host(): void {
    if (!this.roomName().trim()) return;
    this.room.hostRoom(this.roomName());
  }

  /** Joining happens on /join (it shows the answer code), so a pasted link or code goes there. */
  protected async join(): Promise<void> {
    const code = extractSignalCode(this.inviteInput());
    if (!code) {
      this.error.set(this.room.describeError(new Error()));
      return;
    }
    await this.router.navigate(['/join'], { fragment: code });
  }

  protected async invite(): Promise<void> {
    this.inviting.set(true);
    this.error.set(null);
    try {
      await this.room.invite();
    } catch (error) {
      this.error.set(this.room.describeError(error));
    } finally {
      this.inviting.set(false);
    }
  }

  protected kick(playerId: string): void {
    this.room.kick(playerId);
  }

  protected leave(): void {
    this.room.leave();
  }
}
