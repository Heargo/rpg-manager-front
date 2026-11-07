import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import {
  DICE_ROUTES,
  DICE_TOPICS,
  SharedRoll,
  SharedRollRequest,
} from '../models/dice-api';

/** Shared dice rolls over PeerApi: the host draws, everyone sees. */
@Injectable({ providedIn: 'root' })
export class DiceService {
  private readonly api = inject(PeerApi);

  /** True while this device is in a room with the host reachable. */
  canShare(): boolean {
    return this.api.$role() !== 'none' && this.api.$hostOnline();
  }

  roll(request: SharedRollRequest): Promise<SharedRoll> {
    return this.api.request(DICE_ROUTES.roll, request);
  }

  /** null until the host sends it, and again after leaving. */
  watchRolls(): Observable<SharedRoll[] | null> {
    return this.api.watchCurrent(DICE_TOPICS.rolls);
  }

  serveRoll(handler: PeerHandler<unknown, SharedRoll>): () => void {
    return this.api.serve(DICE_ROUTES.roll, handler);
  }

  publishRolls(rolls: SharedRoll[]): void {
    this.api.publish(DICE_TOPICS.rolls, rolls);
  }
}
