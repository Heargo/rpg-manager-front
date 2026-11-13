import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { MessageModule } from '@openng/optimus-ui/message';
import { ProfileBusiness } from '../../../../core/business/profile.business';
import { RoomBusiness } from '../../business/room.business';
import { RoomSizeBusiness } from '../../business/room-size.business';
import { InviteCardComponent } from '../../components/invite-card/invite-card.component';
import { MemberListComponent } from '../../components/member-list/member-list.component';
import { CharacterListComponent } from '../../../character/components/character-list/character-list.component';

/** The open room's lobby. With no room open (or after leaving), the Play hub takes over. */
@Component({
  selector: 'app-room-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    MessageModule,
    InviteCardComponent,
    MemberListComponent,
    CharacterListComponent,
  ],
  templateUrl: './room-page.component.html',
  styleUrl: './room-page.component.scss',
})
export class RoomPageComponent {
  protected readonly room = inject(RoomBusiness);
  protected readonly size = inject(RoomSizeBusiness);
  protected readonly profile = inject(ProfileBusiness);
  private readonly router = inject(Router);

  protected readonly inviting = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly ready = signal(false);

  constructor() {
    // Wait for a saved room to be reopened before deciding there is none.
    void this.room.whenReady().then(() => this.ready.set(true));
    effect(() => {
      if (this.ready() && this.room.$status() === 'idle')
        void this.router.navigate(['/play']);
    });
  }

  protected async invite(forPlayerId?: string): Promise<void> {
    this.inviting.set(true);
    this.error.set(null);
    try {
      await this.room.invite(forPlayerId);
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
