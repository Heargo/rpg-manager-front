import { inject, Injectable } from '@angular/core';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { Character } from '../../world/models/world';
import { GiveItemRequest, ITEM_ROUTES } from '../models/item-api';

/** Item calls over PeerApi. */
@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly api = inject(PeerApi);

  /** Game master: puts a copy of a catalogue item in a character's inventory. */
  giveToPlayer(characterId: string, itemId: string): Promise<Character> {
    const request: GiveItemRequest = { characterId, itemId };
    return this.api.request(ITEM_ROUTES.give, request);
  }

  serveGive(handler: PeerHandler<unknown, Character>): () => void {
    return this.api.serve(ITEM_ROUTES.give, handler);
  }
}
