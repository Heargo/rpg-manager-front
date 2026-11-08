import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { DeviceSetupService } from '../../../core/services/device-setup.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { isStruggling, recommendedMax } from '../helpers/room-size.rules';
import { RoomService } from '../services/room.service';
import { RoomHostBusiness } from './room-host.business';

export const PING_EVERY_MS = 5000;
/** Round-trip times kept per player. */
const KEPT_PINGS = 10;

/** Host side: how many people the device should host, and whether the connections are struggling. */
@Injectable({ providedIn: 'root' })
export class RoomSizeBusiness {
  private readonly service = inject(RoomService);
  private readonly host = inject(RoomHostBusiness);

  private readonly max = signal(
    recommendedMax(inject(DeviceSetupService).read()),
  );
  private readonly pings = signal<Record<string, number[]>>({});
  private readonly buffered = signal<Record<string, number>>({});
  private readonly pinging = new Set<PeerId>();
  private timer?: ReturnType<typeof setInterval>;
  private wiring: Subscription[] = [];

  readonly $recommendedMax = this.max.asReadonly();
  /** Round-trip times in ms per player id, oldest first. */
  readonly $pingTimes = this.pings.asReadonly();
  /** True when more people (host included) are online than the recommended maximum. */
  readonly $overMax = computed(
    () =>
      (this.host.$state()?.members.filter((member) => member.online).length ??
        0) > this.max(),
  );
  readonly $struggling = computed(() =>
    isStruggling(Object.values(this.pings()), Object.values(this.buffered())),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Starts watching a hosted room; pings run only while players are connected. */
  start(): void {
    this.stop();
    this.wiring = [
      this.service.peerJoined$.subscribe(() => this.sync()),
      this.service.peerLeft$.subscribe((peer) => this.onPeerLeft(peer)),
    ];
    this.sync();
  }

  /** Stops pinging and forgets what was measured (hosting ended). */
  stop(): void {
    this.wiring.forEach((subscription) => subscription.unsubscribe());
    this.wiring = [];
    clearInterval(this.timer);
    this.timer = undefined;
    this.pinging.clear();
    this.pings.set({});
    this.buffered.set({});
  }

  private sync(): void {
    if (this.service.$peers().length > 0)
      this.timer ??= setInterval(() => void this.tick(), PING_EVERY_MS);
    else {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private onPeerLeft(peer: PeerId): void {
    const playerId = this.host.playerIdOf(peer);
    this.pinging.delete(peer);
    this.buffered.update(({ [peer]: _gone, ...rest }) => rest);
    if (playerId) this.pings.update(({ [playerId]: _gone, ...rest }) => rest);
    this.sync();
  }

  private async tick(): Promise<void> {
    if (this.service.$role() !== 'host') return this.stop();
    const peers = this.service.$peers();
    this.buffered.set(
      Object.fromEntries(
        peers.map((peer) => [peer, this.service.bufferedAmount(peer)]),
      ),
    );
    await Promise.all(peers.map((peer) => this.pingPeer(peer)));
  }

  private async pingPeer(peer: PeerId): Promise<void> {
    const playerId = this.host.playerIdOf(peer);
    if (!playerId || this.pinging.has(peer)) return;
    this.pinging.add(peer);
    const started = performance.now();
    try {
      await this.service.ping(peer);
      const rtt = performance.now() - started;
      this.pings.update((all) => ({
        ...all,
        [playerId]: [...(all[playerId] ?? []), rtt].slice(-KEPT_PINGS),
      }));
    } catch {
      // A missed ping says nothing about the round trip; a lost player is handled by peerLeft$.
    } finally {
      this.pinging.delete(peer);
    }
  }
}
