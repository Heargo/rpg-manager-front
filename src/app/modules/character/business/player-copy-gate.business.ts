import { Injectable, signal } from '@angular/core';
import { PeerId } from '../../../core/p2p/room-transport';

/**
 * Host: who may not act yet. While the player-copy check is on, a connection is held until its `player-copy/hello`
 * was served, and a player stays held while their copy waits for the game master's pick. Shared by the character
 * host (which rejects held players' requests) and the player-copy host (which decides who is held).
 */
@Injectable({ providedIn: 'root' })
export class PlayerCopyGateBusiness {
  private readonly on = signal(false);
  private readonly waitingIds = signal<string[]>([]);
  private readonly checkedPeers = new Set<PeerId>();

  /** Ids of the players waiting for the game master's pick. */
  readonly $waiting = this.waitingIds.asReadonly();

  /** Turned on by the player-copy host while this device hosts; off, nobody is held. */
  setActive(active: boolean): void {
    this.on.set(active);
    if (!active) {
      this.checkedPeers.clear();
      this.waitingIds.set([]);
    }
  }

  /** True when this connection has not been checked yet, or its player waits for a pick. */
  isHeld(peer: PeerId, playerId: string): boolean {
    return (
      this.on() &&
      (this.waitingIds().includes(playerId) || !this.checkedPeers.has(peer))
    );
  }

  markChecked(peer: PeerId): void {
    this.checkedPeers.add(peer);
  }

  hold(playerId: string): void {
    this.waitingIds.update((ids) =>
      ids.includes(playerId) ? ids : [...ids, playerId],
    );
  }

  release(playerId: string): void {
    this.waitingIds.update((ids) => ids.filter((id) => id !== playerId));
  }
}
