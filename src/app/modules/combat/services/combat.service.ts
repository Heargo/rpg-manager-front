import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { COMBAT_ROUTES, COMBAT_TOPICS, CombatView } from '../models/combat';

type Route = keyof typeof COMBAT_ROUTES;

/** Combat calls over PeerApi: every route is answered by the host, the state is a topic. */
@Injectable({ providedIn: 'root' })
export class CombatService {
  private readonly api = inject(PeerApi);

  call(route: Route, payload: object = {}): Promise<void> {
    return this.api.request(COMBAT_ROUTES[route], payload);
  }

  /** null until the host sends it, and while there is no encounter. */
  watchState(): Observable<CombatView | null> {
    return this.api.watchCurrent(COMBAT_TOPICS.state);
  }

  serve(route: Route, handler: PeerHandler<unknown, void>): () => void {
    return this.api.serve(COMBAT_ROUTES[route], handler);
  }

  publishState(view: CombatView | null): void {
    this.api.publish(COMBAT_TOPICS.state, view);
  }
}
