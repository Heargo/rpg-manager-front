import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { roomErrorKey } from '../helpers/room-errors';
import { isHostedBy, resumeRoom } from '../helpers/room.rules';
import { RoomStorageService } from '../services/room-storage.service';
import { HostLockService } from '../services/host-lock.service';
import { QrService } from '../services/qr.service';
import { JoinedRoomRecord, RoomMember, RoomState } from '../models/room';
import { RoomService } from '../services/room.service';
import { RoomHostBusiness } from './room-host.business';

export type RoomStatus = 'idle' | 'hosting' | 'joining' | 'connected' | 'host-offline' | 'removed';

export interface PendingInvite {
  id: string;
  offerCode: string;
  createdAt: number;
  /** Set when re-inviting a player to their seat (the seat comes back through their playerId anyway). */
  forPlayer?: { playerId: string; name: string };
}

/** The room as the pages see it, for both the host and the players. */
@Injectable({ providedIn: 'root' })
export class RoomBusiness {
  private readonly service = inject(RoomService);
  private readonly host = inject(RoomHostBusiness);
  private readonly profile = inject(ProfileBusiness);
  private readonly qr = inject(QrService);
  private readonly language = inject(LanguageBusiness);
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(RoomStorageService);
  private readonly hostLock = inject(HostLockService);

  private readonly joinState = signal<'idle' | 'joining' | 'joined'>('idle');
  private readonly invites = signal<PendingInvite[]>([]);
  private readonly me = signal<RoomMember | null>(null);
  private readonly restored = signal(false);
  private readonly recent = signal<JoinedRoomRecord[]>([]);
  private readonly ready: Promise<void>;

  readonly $room = toSignal<RoomState | null>(this.service.watchRoom(), { initialValue: null });
  readonly $pendingInvites = this.invites.asReadonly();
  readonly $me = this.me.asReadonly();
  readonly $isHost = computed(() => this.service.$role() === 'host');
  /** True after the room was reopened from storage: players have to be re-invited. */
  readonly $restored = this.restored.asReadonly();
  /** Rooms joined as a player, most recent first. */
  readonly $recentRooms = computed(() => [...this.recent()].sort((a, b) => b.lastSeenAt - a.lastSeenAt));
  readonly $status = computed<RoomStatus>(() => {
    const role = this.service.$role();
    if (role === 'host') return 'hosting';
    if (role === 'none') return 'idle';
    if (this.joinState() === 'joining') return 'joining';
    const me = this.me();
    const room = this.$room();
    if (me && room && !room.members.some((member) => member.playerId === me.playerId)) return 'removed';
    return this.service.$hostOnline() ? 'connected' : 'host-offline';
  });

  constructor() {
    this.ready = this.restore();
    // A player keeps the last state of each room they joined.
    effect(() => {
      const room = this.$room();
      const me = this.me();
      if (!room || !me || this.service.$role() !== 'client') return;
      this.rememberJoined(room);
    });
  }

  /** Resolves once a saved room (if any) has been reopened. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  // ---- Host ----

  /** Opens a new room. Resolves false when another tab of this app is already hosting. */
  async hostRoom(name: string): Promise<boolean> {
    this.leave();
    if (!(await this.hostLock.acquire())) return false;
    const { playerId, name: playerName } = this.profile.$profile();
    const state = this.host.open(name, { playerId, name: playerName });
    this.me.set(state.members[0]);
    return true;
  }

  /** Invites a new player, or re-invites one to their seat. */
  async invite(forPlayerId?: string): Promise<PendingInvite> {
    const invite = await this.service.createInvite();
    const member = forPlayerId ? this.$room()?.members.find((m) => m.playerId === forPlayerId) : undefined;
    const pending: PendingInvite = {
      ...invite,
      createdAt: Date.now(),
      forPlayer: member ? { playerId: member.playerId, name: member.name } : undefined,
    };
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

  /** The link a player opens to join: the code sits after `#`, so it never reaches the server hosting the app. */
  inviteLink(offerCode: string): string {
    return `${this.document.location.origin}/join#${offerCode}`;
  }

  qrCode(text: string): Promise<string> {
    return this.qr.toDataUrl(text);
  }

  /** A translated message for anything the handshake or the room failed with. */
  describeError(error: unknown): string {
    // The message shown is generic for unexpected errors: keep the real one in the console.
    console.error('Room error', error);
    return this.language.t(roomErrorKey(error));
  }

  defaultRoomName(): string {
    return this.language.t('room.start.defaultName', { name: this.profile.$profile().name });
  }

  leave(): void {
    if (this.service.$role() === 'host') this.host.close();
    else this.service.leave();
    this.hostLock.releaseLock();
    this.invites.set([]);
    this.me.set(null);
    this.joinState.set('idle');
    this.restored.set(false);
  }

  async forgetRecentRoom(id: string): Promise<void> {
    await this.storage.deleteJoined(id);
    this.recent.update((rooms) => rooms.filter((room) => room.id !== id));
  }

  // ---- Storage ----

  /** Reopens the room this device was hosting before a reload, and loads the rooms it joined. */
  private async restore(): Promise<void> {
    try {
      const [hosted, joined] = await Promise.all([this.storage.loadHosted(), this.storage.listJoined()]);
      this.recent.set(joined);
      const { playerId, name } = this.profile.$profile();
      if (!hosted || this.service.$role() !== 'none' || !isHostedBy(hosted.state, playerId)) return;
      // Another tab already reopened it.
      if (!(await this.hostLock.acquire())) return;
      const state = this.host.resume(resumeRoom(hosted.state, { playerId, name }));
      this.me.set(state.members.find((member) => member.isHost) ?? null);
      this.restored.set(state.members.some((member) => !member.isHost));
    } catch (error) {
      console.warn('Could not restore rooms', error);
    }
  }

  private rememberJoined(room: RoomState): void {
    const record: JoinedRoomRecord = {
      id: room.id,
      name: room.name,
      hostName: room.members.find((member) => member.isHost)?.name ?? '',
      members: room.members,
      lastSeenAt: Date.now(),
    };
    this.recent.update((rooms) => [...rooms.filter((r) => r.id !== room.id), record]);
    this.storage.saveJoined(record).catch((error) => console.warn('Could not save the room', error));
  }
}
