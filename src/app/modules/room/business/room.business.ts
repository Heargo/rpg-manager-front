import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { RoomMember, RoomState } from '../models/room';
import { RoomService } from '../services/room.service';
import { RoomHostBusiness } from './room-host.business';

export type RoomStatus = 'idle' | 'hosting' | 'joining' | 'connected' | 'host-offline';

export interface PendingInvite {
  id: string;
  offerCode: string;
  createdAt: number;
}

/** The room as the pages see it, for both the host and the players. */
@Injectable({ providedIn: 'root' })
export class RoomBusiness {
  private readonly service = inject(RoomService);
  private readonly host = inject(RoomHostBusiness);
  private readonly profile = inject(ProfileBusiness);

  private readonly joinState = signal<'idle' | 'joining' | 'joined'>('idle');
  private readonly invites = signal<PendingInvite[]>([]);
  private readonly me = signal<RoomMember | null>(null);

  readonly $room = toSignal<RoomState | null>(this.service.watchRoom(), { initialValue: null });
  readonly $pendingInvites = this.invites.asReadonly();
  readonly $me = this.me.asReadonly();
  readonly $isHost = computed(() => this.service.$role() === 'host');
  readonly $status = computed<RoomStatus>(() => {
    const role = this.service.$role();
    if (role === 'host') return 'hosting';
    if (role === 'none') return 'idle';
    if (this.joinState() === 'joining') return 'joining';
    return this.service.$hostOnline() ? 'connected' : 'host-offline';
  });

  // ---- Host ----

  hostRoom(name: string): void {
    this.leave();
    const { playerId, name: playerName } = this.profile.$profile();
    const state = this.host.open(name, { playerId, name: playerName });
    this.me.set(state.members[0]);
  }

  async invite(): Promise<PendingInvite> {
    const invite = await this.service.createInvite();
    const pending = { ...invite, createdAt: Date.now() };
    this.invites.update((invites) => [...invites, pending]);
    return pending;
  }

  /** Finishes a handshake with the player's answer code; the invite is dropped once they're connected. */
  async accept(inviteId: string, answerCode: string): Promise<void> {
    await this.service.acceptAnswer(inviteId, answerCode);
    this.invites.update((invites) => invites.filter((invite) => invite.id !== inviteId));
  }

  cancelInvite(inviteId: string): void {
    this.service.cancelInvite(inviteId);
    this.invites.update((invites) => invites.filter((invite) => invite.id !== inviteId));
  }

  kick(playerId: string): void {
    this.host.kick(playerId);
  }

  // ---- Player ----

  /**
   * Answers an invite and returns the answer code to send back to the host. Once the host accepts it,
   * the player says hello and takes (or gets back) their seat.
   */
  async join(offerCode: string): Promise<{ answerCode: string; joined: Promise<RoomMember> }> {
    this.leave();
    this.joinState.set('joining');
    try {
      const { answerCode, connected } = await this.service.joinRoom(offerCode);
      const joined = connected.then(async () => {
        const { playerId, name } = this.profile.$profile();
        const { you } = await this.service.hello({ playerId, name });
        this.me.set(you);
        this.joinState.set('joined');
        return you;
      });
      joined.catch(() => this.leave());
      return { answerCode, joined };
    } catch (error) {
      this.leave();
      throw error;
    }
  }

  // ---- Both ----

  leave(): void {
    if (this.service.$role() === 'host') this.host.close();
    else this.service.leave();
    this.invites.set([]);
    this.me.set(null);
    this.joinState.set('idle');
  }
}
