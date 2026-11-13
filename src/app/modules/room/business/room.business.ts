import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { WakeLockService } from '../../../core/services/wake-lock.service';
import { buildInviteFragment, createBoxId } from '../../../core/p2p/helpers/invite-link';
import { roomErrorKey } from '../helpers/room-errors';
import { isHostedBy, resumeRoom } from '../helpers/room.rules';
import { RoomStorageService } from '../services/room-storage.service';
import { HostLockService } from '../services/host-lock.service';
import { QrService } from '../services/qr.service';
import { RoomMember, RoomState } from '../models/room';
import { TransportError } from '../../../core/p2p/room-transport';
import { RoomService } from '../services/room.service';
import { SignalMailboxService } from '../services/signal-mailbox.service';
import { RoomHostBusiness } from './room-host.business';
import type { RoomSizeBusiness } from './room-size.business';

/** What the lazily loaded `RoomSizeBusiness` offers this class. */
type RunningRoomSize = Pick<RoomSizeBusiness, 'start' | 'stop'>;

export type JoinState = 'idle' | 'preparing' | 'waiting' | 'connected' | 'failed';

/** How the answer reaches the host: through the signalling mailbox, or by hand (the code is shown). */
export type JoinMode = 'mailbox' | 'manual';

const HOST_POLL_MS = 2000;
/** The player only polls to find a replacement offer, which is rare: slower than the host. */
const PLAYER_POLL_MS = 5000;
const MAILBOX_TIMEOUT_MS = 5000;
const FAILED_POLLS_BEFORE_DOWN = 3;

export type RoomStatus = 'idle' | 'hosting' | 'joining' | 'connected' | 'host-offline' | 'removed';

export interface PendingInvite {
  id: string;
  offerCode: string;
  createdAt: number;
  /** Set when re-inviting a player to their seat (the seat comes back through their playerId anyway). */
  forPlayer?: { playerId: string; name: string };
  state: 'waiting' | 'connecting' | 'failed';
  /** Mailbox box of this invite (kept when the invite is replaced after a failed connection). */
  boxId?: string;
  /** A relay invite: both sides use the TURN relay only. */
  relay?: boolean;
  /** True once the mailbox could not be polled 3 times in a row: the host should ask for the player's code. */
  mailboxDown?: boolean;
}

interface JoinAttempt {
  deferred: {
    promise: Promise<RoomMember>;
    resolve: (member: RoomMember) => void;
    reject: (error: unknown) => void;
  };
  boxId?: string;
  /** Seq of the host offer the player last answered. */
  answeredSeq: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Mailbox timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
  private readonly wakeLock = inject(WakeLockService);
  private readonly mailbox = inject(SignalMailboxService);
  private readonly injector = inject(Injector);
  /** Loaded on demand: only a host needs it, so it stays out of the initial bundle. */
  private size?: RunningRoomSize;

  private readonly joinState = signal<'idle' | 'joining' | 'joined'>('idle');
  private readonly handshake = signal<JoinState>('idle');
  private readonly awayFailure = signal(false);
  private readonly invites = signal<PendingInvite[]>([]);
  private readonly me = signal<RoomMember | null>(null);
  private readonly restored = signal(false);
  private readonly joinedInvite = signal<string | undefined>(undefined);
  private readonly ready: Promise<void>;
  private readonly mode = signal<JoinMode>('manual');
  /** Seq of the offer each pending invite holds in its box. */
  private readonly offerSeq = new Map<string, number>();
  private readonly failedPolls = new Map<string, number>();
  private readonly polling = new Set<string>();
  /** Replacement offers whose put failed: re-put at each host poll until it works. */
  private readonly unsent = new Map<string, { boxId: string; seq: number; code: string }>();
  private hostTimer?: ReturnType<typeof setInterval>;
  private playerTimer?: ReturnType<typeof setInterval>;
  private playerPolling = false;
  private attempt?: JoinAttempt;

  readonly $room = toSignal<RoomState | null>(this.service.watchRoom(), { initialValue: null });
  readonly $pendingInvites = this.invites.asReadonly();
  readonly $me = this.me.asReadonly();
  /** Where the player's handshake stands: preparing the answer, waiting for the host, connected or failed. */
  readonly $joinState = this.handshake.asReadonly();
  /** True when the join failed while the page was hidden (the player was in another app). */
  readonly $failedWhileAway = this.awayFailure.asReadonly();
  /** 'mailbox': the answer goes to the host by itself. 'manual': the player has to send the code. */
  readonly $joinMode = this.mode.asReadonly();
  readonly $isHost = computed(() => this.service.$role() === 'host');
  /** True after the room was reopened from storage: players have to be re-invited. */
  readonly $restored = this.restored.asReadonly();
  /** The invite link (what follows `#`) the player last joined with, kept to rejoin the same room later. */
  readonly $joinedInvite = this.joinedInvite.asReadonly();
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
    inject(DestroyRef).onDestroy(() => {
      this.leavePrompt(false);
      clearInterval(this.hostTimer);
      clearInterval(this.playerTimer);
    });
    this.service.servePing();
    this.ready = this.restore();
  }

  /** Resolves once a saved room (if any) has been reopened. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  // ---- Host ----

  /** Opens a new room (for a world, usually). Resolves false when another tab of this app is already hosting. */
  async hostRoom(name: string, worldId?: string): Promise<boolean> {
    this.leave();
    if (!(await this.hostLock.acquire())) return false;
    const { playerId, name: playerName } = this.profile.$profile();
    const state = this.host.open(name, { playerId, name: playerName }, worldId);
    this.me.set(state.members[0]);
    await this.watchRoomSize();
    return true;
  }

  private async watchRoomSize(): Promise<void> {
    try {
      const { RoomSizeBusiness } = await import('./room-size.business');
      // Hosting may have ended while the chunk loaded.
      if (this.service.$role() !== 'host') return;
      const size: RunningRoomSize = this.injector.get(RoomSizeBusiness);
      size.start();
      this.size = size;
    } catch (error) {
      // The size warning is optional (offline and uncached chunk): hosting goes on without it.
      console.warn('Could not load the room size warning', error);
    }
  }

  /** Invites a new player, or re-invites one to their seat. */
  async invite(forPlayerId?: string): Promise<PendingInvite> {
    return this.createInvite(forPlayerId, { boxId: createBoxId(), seq: 0 });
  }

  private async createInvite(
    forPlayerId: string | undefined,
    box: { boxId: string; seq: number },
    options?: { relay?: boolean },
  ): Promise<PendingInvite> {
    const invite = await this.service.createInvite(options?.relay ? { relay: true } : undefined);
    const member = forPlayerId ? this.$room()?.members.find((m) => m.playerId === forPlayerId) : undefined;
    const pending: PendingInvite = {
      ...invite,
      createdAt: Date.now(),
      forPlayer: member
        ? { playerId: member.playerId, name: member.name }
        : forPlayerId
          ? { playerId: forPlayerId, name: forPlayerId }
          : undefined,
      state: 'waiting',
      boxId: box.boxId,
      ...(options?.relay ? { relay: true } : {}),
    };
    this.offerSeq.set(pending.id, box.seq);
    // The link carries the first offer; a replacement offer has to reach the player through the box.
    if (box.seq > 0) {
      try {
        await withTimeout(
          this.mailbox.put(box.boxId, 'host', {
            seq: box.seq,
            code: invite.offerCode,
          }),
          MAILBOX_TIMEOUT_MS,
        );
      } catch {
        pending.mailboxDown = true;
        this.unsent.set(pending.id, { boxId: box.boxId, seq: box.seq, code: invite.offerCode });
      }
    }
    this.invites.update((invites) => [...invites, pending]);
    this.syncLeavePrompt();
    this.startHostPolling();
    return pending;
  }

  /** Finishes a handshake with the player's answer code; the invite is dropped once they're connected. */
  async accept(inviteId: string, answerCode: string): Promise<void> {
    this.setInviteState(inviteId, 'connecting');
    const boxId = this.invites().find((invite) => invite.id === inviteId)?.boxId;
    try {
      await this.service.acceptAnswer(inviteId, answerCode);
    } catch (error) {
      this.setInviteState(inviteId, 'failed');
      throw error;
    }
    this.dropInvite(inviteId);
    // The box has done its job: nothing stays on the server.
    if (boxId) this.deleteBox(boxId, 'used');
  }

  /** Replaces an invite (usually a failed one) with a fresh one for the same seat. */
  async retryInvite(inviteId: string, options?: { relay?: boolean }): Promise<PendingInvite> {
    const previous = this.invites().find((invite) => invite.id === inviteId);
    // Create the new one first: if that fails, the old invite stays.
    const box = previous?.boxId
      ? { boxId: previous.boxId, seq: (this.offerSeq.get(inviteId) ?? 0) + 1 }
      : { boxId: createBoxId(), seq: 0 };
    const fresh = await this.createInvite(previous?.forPlayer?.playerId, box, options);
    this.service.cancelInvite(inviteId);
    this.offerSeq.delete(inviteId);
    this.unsent.delete(inviteId);
    this.failedPolls.delete(inviteId);
    this.invites.update((invites) => {
      const rest = invites.filter((invite) => invite.id !== inviteId && invite.id !== fresh.id);
      const index = invites.findIndex((invite) => invite.id === inviteId);
      rest.splice(index < 0 ? rest.length : index, 0, fresh);
      return rest;
    });
    this.syncLeavePrompt();
    return fresh;
  }

  cancelInvite(inviteId: string): void {
    const boxId = this.invites().find((invite) => invite.id === inviteId)?.boxId;
    this.service.cancelInvite(inviteId);
    this.dropInvite(inviteId);
    // Nobody is going to use the box any more.
    if (boxId) this.deleteBox(boxId, 'expired');
  }

  private readonly onLeavePage = (event: BeforeUnloadEvent) => event.preventDefault();
  private leavePromptOn = false;

  /**
   * Pending invites live in memory only: ask before a reload or close throws them away. The listener is attached
   * only while an invite is pending (synchronously, with the invite list), so it doesn't block the browser's
   * back/forward cache the rest of the time.
   */
  private syncLeavePrompt(): void {
    this.leavePrompt(this.invites().length > 0);
  }

  private leavePrompt(on: boolean): void {
    if (on === this.leavePromptOn) return;
    this.leavePromptOn = on;
    const view = this.document.defaultView;
    if (on) view?.addEventListener('beforeunload', this.onLeavePage);
    else view?.removeEventListener('beforeunload', this.onLeavePage);
  }

  /** Best effort: the box expires on its own anyway. The reason tells a player opening the link later why it is gone. */
  private deleteBox(boxId: string, reason: 'used' | 'expired'): void {
    this.mailbox.delete(boxId, reason).catch(() => undefined);
  }

  private dropInvite(inviteId: string): void {
    this.offerSeq.delete(inviteId);
    this.unsent.delete(inviteId);
    this.failedPolls.delete(inviteId);
    this.invites.update((invites) => invites.filter((invite) => invite.id !== inviteId));
    this.syncLeavePrompt();
  }

  kick(playerId: string): void {
    this.host.kick(playerId);
  }

  // ---- Player ----

  /**
   * Answers an invite. With a box id the answer goes to the host through the signalling mailbox (nothing to send);
   * without one, or when the mailbox fails, the player has to send `answerCode` to the host by hand.
   * Once the host accepts it, the player says hello and takes (or gets back) their seat.
   */
  async join(
    offerCode: string,
    boxId?: string,
  ): Promise<{
    answerCode: string;
    joined: Promise<RoomMember>;
    mode: JoinMode;
  }> {
    this.leave();
    this.joinState.set('joining');
    this.handshake.set('preparing');
    let resolve!: (member: RoomMember) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<RoomMember>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    promise.catch(() => undefined);
    const attempt: JoinAttempt = {
      deferred: { promise, resolve, reject },
      boxId,
      answeredSeq: 0,
    };
    this.attempt = attempt;
    this.joinedInvite.set(buildInviteFragment(offerCode, boxId));
    this.mode.set(boxId ? 'mailbox' : 'manual');
    try {
      let offer = offerCode;
      if (boxId) {
        // A reloaded page holds the link's first offer: the box may hold a newer one.
        const newest = await withTimeout(this.mailbox.get(boxId, 'player'), MAILBOX_TIMEOUT_MS).catch(
          (error: unknown) => {
            // A used or expired box ends the join; anything else (unreachable mailbox) is ignored.
            if (error instanceof TransportError) throw error;
            return null;
          },
        );
        if (newest) {
          offer = newest.code;
          attempt.answeredSeq = newest.seq;
        }
      }
      const answerCode = await this.answerOffer(attempt, offer);
      return { answerCode, joined: promise, mode: this.mode() };
    } catch (error) {
      this.leave();
      this.handshake.set('failed');
      throw error;
    }
  }

  /** Answers one host offer; the answer is left in the box when there is one. */
  private async answerOffer(attempt: JoinAttempt, offerCode: string): Promise<string> {
    const { answerCode, connected } = await this.service.joinRoom(offerCode);
    if (this.attempt !== attempt) return answerCode;
    this.joinState.set('joining');
    this.handshake.set('waiting');
    void this.wakeLock.request();
    const stillCurrent = () => this.attempt === attempt;
    connected
      .then(async () => {
        const { playerId, name } = this.profile.$profile();
        const { you } = await this.service.hello({ playerId, name });
        if (!stillCurrent()) return;
        this.me.set(you);
        this.joinState.set('joined');
        this.handshake.set('connected');
        this.wakeLock.release();
        clearInterval(this.playerTimer);
        this.playerTimer = undefined;
        attempt.deferred.resolve(you);
      })
      .catch((error: unknown) => {
        if (stillCurrent()) this.onAttemptFailed(attempt, error);
      });
    if (attempt.boxId) {
      try {
        await withTimeout(
          this.mailbox.put(attempt.boxId, 'player', {
            seq: attempt.answeredSeq,
            code: answerCode,
          }),
          MAILBOX_TIMEOUT_MS,
        );
        this.startPlayerPolling();
      } catch {
        // The mailbox can't be reached: the player sends the code by hand.
        this.mode.set('manual');
        attempt.boxId = undefined;
      }
    }
    return answerCode;
  }

  private onAttemptFailed(attempt: JoinAttempt, error: unknown): void {
    const connectionFailure =
      error instanceof TransportError && (error.reason === 'timeout' || error.reason === 'closed');
    if (attempt.boxId && connectionFailure) {
      // The host makes a new offer through the box: stay on the page and answer it when it shows up.
      this.service.leave();
      this.wakeLock.release();
      this.joinState.set('idle');
      this.handshake.set('failed');
      return;
    }
    const away = !attempt.boxId && this.document.visibilityState === 'hidden';
    this.leave();
    this.awayFailure.set(away);
    this.handshake.set('failed');
    attempt.deferred.reject(error);
  }

  // ---- Both ----

  /** The link a player opens to join: the code and box id sit after `#`, so they never reach the server hosting the app. */
  inviteLink(offerCode: string, boxId?: string): string {
    return `${this.document.location.origin}/join#${buildInviteFragment(offerCode, boxId)}`;
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
    for (const invite of this.invites()) if (invite.boxId) this.deleteBox(invite.boxId, 'expired');
    this.size?.stop();
    if (this.service.$role() === 'host') this.host.close();
    else this.service.leave();
    this.hostLock.releaseLock();
    this.invites.set([]);
    this.syncLeavePrompt();
    this.offerSeq.clear();
    this.unsent.clear();
    this.failedPolls.clear();
    this.attempt = undefined;
    clearInterval(this.hostTimer);
    clearInterval(this.playerTimer);
    this.hostTimer = this.playerTimer = undefined;
    this.me.set(null);
    this.joinState.set('idle');
    if (this.handshake() === 'waiting') this.wakeLock.release();
    this.handshake.set('idle');
    this.awayFailure.set(false);
    this.restored.set(false);
  }

  // ---- Signalling mailbox ----

  private pageVisible(): boolean {
    return this.document.visibilityState !== 'hidden';
  }

  private startHostPolling(): void {
    this.hostTimer ??= setInterval(() => void this.pollHost(), HOST_POLL_MS);
  }

  /** Looks in each pending invite's box for the player's answer. Paused while the page is hidden. */
  private async pollHost(): Promise<void> {
    const boxed = this.invites().filter((invite) => invite.boxId);
    if (!boxed.length) {
      clearInterval(this.hostTimer);
      this.hostTimer = undefined;
      return;
    }
    if (!this.pageVisible()) return;
    await Promise.all(boxed.filter((invite) => invite.state === 'waiting').map((invite) => this.pollInvite(invite)));
  }

  private async pollInvite(invite: PendingInvite): Promise<void> {
    if (this.polling.has(invite.id)) return;
    this.polling.add(invite.id);
    try {
      const pending = this.unsent.get(invite.id);
      if (pending) {
        try {
          await withTimeout(
            this.mailbox.put(pending.boxId, 'host', { seq: pending.seq, code: pending.code }),
            MAILBOX_TIMEOUT_MS,
          );
          this.unsent.delete(invite.id);
        } catch {
          // Still unreachable: try again at the next poll.
        }
      }
      let message;
      try {
        message = await this.mailbox.get(invite.boxId!, 'host');
        this.failedPolls.delete(invite.id);
        if (invite.mailboxDown) this.patchInvite(invite.id, { mailboxDown: false });
      } catch {
        const failures = (this.failedPolls.get(invite.id) ?? 0) + 1;
        this.failedPolls.set(invite.id, failures);
        if (failures >= FAILED_POLLS_BEFORE_DOWN && !invite.mailboxDown)
          this.patchInvite(invite.id, { mailboxDown: true });
        return;
      }
      // Only the answer to this invite's offer counts: an older one belongs to an offer that already failed.
      if (!message || message.seq !== (this.offerSeq.get(invite.id) ?? 0)) return;
      if (this.invites().find((i) => i.id === invite.id)?.state !== 'waiting') return;
      try {
        await this.accept(invite.id, message.code);
      } catch {
        // The connection failed: a new offer for the same seat goes into the same box.
        // If even that fails, the invite goes back to waiting: the next poll tries again.
        // The retry goes through the relay; if that isn't available, it stays a direct one.
        await this.retryInvite(invite.id, { relay: true })
          .catch((error: unknown) =>
            error instanceof TransportError && error.reason === 'relay-unavailable'
              ? this.retryInvite(invite.id)
              : Promise.reject(error),
          )
          .catch(() => this.setInviteState(invite.id, 'waiting'));
      }
    } finally {
      this.polling.delete(invite.id);
    }
  }

  private patchInvite(inviteId: string, patch: Partial<PendingInvite>): void {
    this.invites.update((invites) =>
      invites.map((invite) => (invite.id === inviteId ? { ...invite, ...patch } : invite)),
    );
  }

  private startPlayerPolling(): void {
    this.playerTimer ??= setInterval(() => void this.pollPlayer(), PLAYER_POLL_MS);
  }

  /** While the answer waits or the attempt failed: looks in the box for a newer host offer and answers it. */
  private async pollPlayer(): Promise<void> {
    const attempt = this.attempt;
    const state = this.handshake();
    if (!attempt?.boxId || (state !== 'waiting' && state !== 'failed')) return;
    if (!this.pageVisible() || this.playerPolling) return;
    this.playerPolling = true;
    try {
      const offer = await this.mailbox.get(attempt.boxId, 'player');
      if (!offer || offer.seq <= attempt.answeredSeq || this.attempt !== attempt) return;
      attempt.answeredSeq = offer.seq;
      await this.answerOffer(attempt, offer.code);
    } catch (error) {
      // A box the host closed (invite used or cancelled) ends the join with the specific reason.
      if (error instanceof TransportError && (error.reason === 'invite-used' || error.reason === 'invite-expired')) {
        if (this.attempt === attempt) {
          attempt.boxId = undefined;
          this.onAttemptFailed(attempt, error);
        }
      }
      // Anything else: try again at the next poll.
    } finally {
      this.playerPolling = false;
    }
  }

  private setInviteState(inviteId: string, state: PendingInvite['state']): void {
    this.invites.update((invites) => invites.map((invite) => (invite.id === inviteId ? { ...invite, state } : invite)));
  }

  // ---- Storage ----

  /** Reopens the room this device was hosting before a reload. */
  private async restore(): Promise<void> {
    try {
      const hosted = await this.storage.loadHosted();
      const { playerId, name } = this.profile.$profile();
      if (!hosted || this.service.$role() !== 'none' || !isHostedBy(hosted.state, playerId)) return;
      // Another tab already reopened it.
      if (!(await this.hostLock.acquire())) return;
      const state = this.host.resume(resumeRoom(hosted.state, { playerId, name }));
      this.me.set(state.members.find((member) => member.isHost) ?? null);
      this.restored.set(state.members.some((member) => !member.isHost));
      await this.watchRoomSize();
    } catch (error) {
      console.warn('Could not restore rooms', error);
    }
  }
}
