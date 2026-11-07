import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi } from '../../../core/p2p/peer-api.service';
import { WORLD_TOPICS, WorldInfo } from '../models/world';

/** The hosted world's public info over PeerApi. */
@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly api = inject(PeerApi);

  /** null until the host sends it, and again after leaving. */
  watchInfo(): Observable<WorldInfo | null> {
    return this.api.watchCurrent(WORLD_TOPICS.info);
  }

  publishInfo(info: WorldInfo): void {
    this.api.publish(WORLD_TOPICS.info, info);
  }
}
